import { Inject } from "@nestjs/common";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { scAddress } from "src/config";
import { PulseSetterService } from "src/modules/governance/services/pulse.setter.service";
import { PUB_SUB } from "src/services/redis.pubSub.module";
import { Logger } from "winston";

export class PulseHandlerService {
    constructor(
        
        private readonly pulseSetterService: PulseSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handlePulseEvents(pulseEvents: any) {
        const voteEvents = pulseEvents.filter(event => event.identifier === 'vote_poll');
        await this.handlePulseVoteEvents(voteEvents);
    }

    async handlePulseVoteEvents(
        events: any,
    ): Promise<void> {
        
        const userVoteCacheKeys = []
        for(const event of events) {
            this.logger.info('Found vote event raw: ', event)
            const scAddress = Buffer.from(event.address, 'hex').toString();
            const userAddress = Buffer.from(event.topics[1], 'hex').toString();
            const pollId = parseInt(event.topics[2], 16);
            const optionId = parseInt(event.topics[3], 16);

            this.logger.info('Event decoded: ', {scAddress, userAddress, pollId, optionId})

            userVoteCacheKeys.push(
                await this.pulseSetterService.getUserVotePulse(scAddress, userAddress, pollId, optionId),
            );
        }
        
        await this.deleteCacheKeys(userVoteCacheKeys);
        
        // const delegateUserVotingPowers = await this.governanceOnChainAbi.delegateUserVotingPowersRaw(onChainScAddress, topics.proposalId);
        // const delegateUserVotingPowersCacheKeys = [];
        // delegateUserVotingPowersCacheKeys.push(
        //     await this.governanceSetter.delegateUserVotingPowers(topics.voter, topics.proposalId, delegateUserVotingPowers)
        // );
        // await this.deleteCacheKeys(delegateUserVotingPowersCacheKeys);

    }

     private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}