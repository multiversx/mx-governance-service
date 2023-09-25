import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class RemoteConfigSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {
        super(cachingService, logger);
    }

    async setFlag(name: string, value: boolean): Promise<string> {
        return await this.setData(
            this.getFlagCacheKey(name),
            value,
            Constants.oneHour(),
        );
    }

    async deleteFlag(name: string): Promise<void> {
        const cacheKey = this.getFlagCacheKey(name);
        await this.cachingService.deleteInCache(cacheKey);
        await this.deleteCacheKeys([cacheKey]);
    }

    private getFlagCacheKey(flagName: string, ...args: any) {
        return generateCacheKeyFromParams('flag', flagName, ...args);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]): Promise<void> {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
