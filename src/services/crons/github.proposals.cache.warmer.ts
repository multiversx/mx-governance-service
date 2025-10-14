import { Inject } from "@nestjs/common";
import { PUB_SUB } from "../redis.pubSub.module";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { GithubService } from "src/modules/governance/services/github.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Lock } from "@multiversx/sdk-nestjs-common";
import { CacheService } from "@multiversx/sdk-nestjs-cache";
import { CacheTtlInfo } from "../caching/cache.ttl.info";


export class GithubProposalCacheWarmerService {
    constructor(
        private readonly githubService: GithubService,
        private readonly cacheService: CacheService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) { }

    @Cron(CronExpression.EVERY_30_SECONDS)
    @Lock({ name: 'warmGithubProposals', verbose: true })
    async warmGithubProposals(): Promise<void> {
        // await this.githubService.cloneOrUpdate();
        const githubProposals = await this.githubService.getGithubProposalsRaw();
        const cacheKey = CacheTtlInfo.GithubProposals.cacheKey;
        await this.cacheService.set(
            cacheKey,
            githubProposals,
            CacheTtlInfo.GithubProposals.remoteTtl,
        )
        await this.deleteCacheKeys([cacheKey]);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}