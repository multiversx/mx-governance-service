import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Constants, Locker } from '@multiversx/sdk-nestjs-common';
import axios from 'axios';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { ApiConfigService } from '../../helpers/api.config.service';

@Injectable()
export class CacheWarmerService {
    constructor(
        private readonly apiService: MXApiService,
        private readonly cachingService: CacheService,
        private readonly configService: ApiConfigService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron('*/6 * * * * *')
    async cacheCurrentEpoch(): Promise<void> {
        const stats = await this.apiService.getStats();
        const ttl = (stats.roundsPerEpoch - stats.roundsPassed) * 6;
        const cacheKey = generateCacheKeyFromParams('context', 'currentEpoch');
        await this.cachingService.set(cacheKey, stats.epoch, ttl);
        await this.deleteCacheKeys([cacheKey]);
    }

    @Cron('*/6 * * * * *')
    async cacheGuest(): Promise<void> {
        // recompute cache
        const dateFormat = 'YYYY-MM-DD_HH:mm';
        const currentDate = moment().format(dateFormat);
        const previousMinute = moment()
            .subtract(1, 'minute')
            .format(dateFormat);

        const prefix = 'guestCache';
        const threshold = Number(
            process.env.ENABLE_CACHE_GUEST_RATE_THRESHOLD || 100,
        );
        const keysToComputeCurrentMinute: string[] =
            await this.cachingService.zRangeByScoreRemote(
                `${prefix}.${currentDate}`,
                threshold,
                Number.POSITIVE_INFINITY,
            );
        const keysToComputePreviousMinute: string[] =
            await this.cachingService.zRangeByScoreRemote(
                `${prefix}.${previousMinute}`,
                threshold,
                Number.POSITIVE_INFINITY,
            );

        const keysToCompute = [
            ...new Set([
                ...keysToComputeCurrentMinute,
                ...keysToComputePreviousMinute,
            ]),
        ];

        await Promise.allSettled(
            keysToCompute.map(async (key) => {
                await Locker.lock(key, async () => {
                    const parsedKey = `${prefix}.${key}.body`;
                    const keyValue: object = await this.cachingService.get(
                        parsedKey,
                    );

                    if (!keyValue) {
                        return Promise.resolve();
                    }

                    console.log(
                        `Started warming up query '${JSON.stringify(
                            keyValue,
                        )}' for url '${process.env.MX_GOVERNANCE_URL}'`,
                    );
                    const profiler = new PerformanceProfiler();

                    let data;
                    try {
                        // Get new data without cache and update it
                        const response = await axios.post(
                            `${process.env.MX_GOVERNANCE_URL}/${this.configService.getPrefix()}/graphql`,
                            keyValue,
                            {
                                headers: {
                                    'no-cache': true,
                                },
                            },
                        );

                        data = response.data;
                    } catch (error) {
                        console.error(
                            `An error occurred while warming up query '${JSON.stringify(
                                keyValue,
                            )}' for url '${process.env.MX_GOVERNANCE_URL}'`,
                        );
                        console.error(error);
                    }

                    profiler.stop();

                    console.log(
                        `Finished warming up query '${JSON.stringify(
                            keyValue,
                        )}' for url '${
                            process.env.MX_GOVERNANCE_URL
                        }'. Response size: ${
                            JSON.stringify(data).length
                        }. Duration: ${profiler.duration}`,
                    );

                    await this.cachingService.set(
                        `${prefix}.${key}.response`,
                        data,
                        Constants.oneSecond() * 30,
                    );
                    return data;
                });
            }),
        );

        MetricsCollector.setGuestHitQueries(keysToCompute.length);
    }

    @Cron('*/6 * * * * *')
    async cacheShardCurrentBlockNonce(): Promise<void> {
        const stats = await this.apiService.getStats();
        const promises: Promise<number>[] = [];
        for (let index = 0; index < stats.shards; index++) {
            promises.push(this.apiService.getCurrentBlockNonce(index));
        }
        const shardsNonces = await Promise.all(promises);
        const invalidatedKeys: string[] = [];
        for (let index = 0; index < stats.shards; index++) {
            const cacheKey = generateCacheKeyFromParams(
                'context',
                'shardBlockNonce',
                index,
            );
            await this.cachingService.set(
                cacheKey,
                shardsNonces[index],
                Constants.oneMinute(),
            );
        }

        await this.deleteCacheKeys(invalidatedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
