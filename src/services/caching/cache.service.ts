import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import * as Redis from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RedisService } from 'nestjs-redis';
import { generateCacheKey } from '../../utils/generate-cache-key';
import { Logger } from 'winston';
import {
    generateDeleteLogMessage,
    generateGetLogMessage,
    generateLogMessage,
    generateSetLogMessage,
} from '../../utils/generate-log-message';
import { Cache } from 'cache-manager';
import { promisify } from 'util';
import { cacheConfig } from '../../config';
import { PerformanceProfiler } from '../../utils/performance.profiler';

@Injectable()
export class CachingService {
    private static cache: Cache;
    private asyncSet = promisify(this.getClient().set).bind(this.getClient());
    private asyncGet = promisify(this.getClient().get).bind(this.getClient());
    private asyncMGet = promisify(this.getClient().mget).bind(this.getClient());
    private asyncMulti = promisify(this.getClient().multi).bind(
        this.getClient(),
    );
    private asyncDel = promisify(this.getClient().del).bind(this.getClient());
    private asyncKeys = promisify(this.getClient().keys).bind(this.getClient());

    constructor(
        private readonly redisService: RedisService,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        CachingService.cache = this.cache;
    }

    getClient(clientName?: string): Redis.Redis {
        return this.redisService.getClient(clientName);
    }

    private async setCacheRemote<T>(
        key: string,
        value: T,
        ttl: number = cacheConfig.default,
    ): Promise<T> {
        await this.asyncSet(
            key,
            JSON.stringify(value),
            'EX',
            ttl ?? cacheConfig.default,
        );
        return value;
    }

    pendingGetRemotes: { [key: string]: Promise<any> } = {};

    private async getCacheRemote<T>(key: string): Promise<T | undefined> {
        let response;

        let pendingGetRemote = this.pendingGetRemotes[key];
        if (pendingGetRemote) {
            response = await pendingGetRemote;
        } else {
            pendingGetRemote = this.asyncGet(key);

            this.pendingGetRemotes[key] = pendingGetRemote;

            response = await pendingGetRemote;

            delete this.pendingGetRemotes[key];
        }

        if (response === undefined) {
            return undefined;
        }

        return JSON.parse(response);
    }

    async setCacheLocal<T>(
        key: string,
        value: T,
        ttl: number = cacheConfig.default,
    ): Promise<T> {
        return await CachingService.cache.set<T>(key, value, { ttl });
    }

    async getCacheLocal<T>(key: string): Promise<T | undefined> {
        return await CachingService.cache.get<T>(key);
    }

    public async getCache<T>(key: string): Promise<T | undefined> {
        const value = await this.getCacheLocal<T>(key);
        if (value) {
            return value;
        }

        return await this.getCacheRemote<T>(key);
    }

    public async setCache<T>(
        key: string,
        value: T,
        ttl: number = cacheConfig.default,
    ): Promise<T> {
        await this.setCacheLocal<T>(key, value, ttl);
        await this.setCacheRemote<T>(key, value, ttl);
        return value;
    }

    async get(
        client: Redis.Redis,
        key: string,
        region: string = null,
    ): Promise<any> {
        const cacheKey = generateCacheKey(key, region);
        try {
            return JSON.parse(await client.get(cacheKey));
        } catch (err) {
            const logMessage = generateGetLogMessage(
                CachingService.name,
                this.get.name,
                cacheKey,
                err,
            );
            this.logger.error(logMessage);
            return null;
        }
    }
    async set(
        client: Redis.Redis,
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
        region: string = null,
    ): Promise<void> {
        if (isNil(value)) {
            return;
        }
        const cacheKey = generateCacheKey(key, region);
        try {
            await client.set(cacheKey, JSON.stringify(value), 'EX', ttl);
        } catch (err) {
            const logMessage = generateSetLogMessage(
                CachingService.name,
                this.set.name,
                cacheKey,
                err,
            );
            this.logger.error(logMessage);
            return;
        }
    }

    async delete(
        client: Redis.Redis,
        key: string,
        region: string = null,
    ): Promise<void> {
        const cacheKey = generateCacheKey(key, region);
        try {
            await client.del(cacheKey);
        } catch (err) {
            const logMessage = generateDeleteLogMessage(
                CachingService.name,
                this.delete.name,
                cacheKey,
                err,
            );
            this.logger.error(logMessage);
        }
    }

    async flushDb(client: Redis.Redis): Promise<void> {
        try {
            await client.flushdb();
        } catch (err) {
            const logMessage = generateLogMessage(
                CachingService.name,
                this.flushDb.name,
                'flushDb',
                err,
            );
            this.logger.error(logMessage);
        }
    }

    async getOrSet<T>(
        client: Redis.Redis,
        key: string,
        promise: () => Promise<T>,
        remoteTtl: number = cacheConfig.default,
        localTtl: number | undefined = undefined,
    ): Promise<any> {
        if (!localTtl) {
            localTtl = remoteTtl / 2;
        }

        const profiler = new PerformanceProfiler(`vmQuery:${key}`);

        const cachedValue = await this.getCacheLocal<T>(key);
        if (cachedValue !== undefined) {
            profiler.stop(`Local Cache hit for key ${key}`);
            return cachedValue;
        }

        const cached = await this.getCacheRemote<T>(key);
        if (cached !== undefined && cached !== null) {
            profiler.stop(`Remote Cache hit for key ${key}`);

            // we only set ttl to half because we don't know what the real ttl of the item is and we want it to work good in most scenarios
            await this.setCacheLocal<T>(key, cached, localTtl);
            return cached;
        }

        const value = await promise();
        profiler.stop(`Cache miss for key ${key}`);

        if (localTtl > 0) {
            await this.setCacheLocal<T>(key, value, localTtl);
        }

        if (remoteTtl > 0) {
            await this.setCacheRemote<T>(key, value, remoteTtl);
        }
        return value;
    }

    async deleteInCacheLocal(key: string) {
        await CachingService.cache.del(key);
    }

    async deleteInCache(key: string): Promise<string[]> {
        const invalidatedKeys = [];

        if (key.includes('*')) {
            const allKeys = await this.asyncKeys(key);
            for (const key of allKeys) {
                // this.logger.log(`Invalidating key ${key}`);
                await CachingService.cache.del(key);
                await this.asyncDel(key);
                invalidatedKeys.push(key);
            }
        } else {
            // this.logger.log(`Invalidating key ${key}`);
            await CachingService.cache.del(key);
            await this.asyncDel(key);
            invalidatedKeys.push(key);
        }

        return invalidatedKeys;
    }
}