import { VoteEvent } from "@multiversx/sdk-exchange";
import { Inject, Logger } from "@nestjs/common";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { GovernanceOnChainAbiService } from "src/modules/governance/services/governance.onchain.abi.service";
import { GovernanceSetterService } from "src/modules/governance/services/governance.setter.service";
import { PUB_SUB } from "src/services/redis.pubSub.module";
import { GOVERNANCE_ONCHAIN_EVENTS, governanceContractsAddresses, GovernanceType, toVoteType } from "src/utils/governance";

export class GovernanceOnChainHandlerService {
    constructor(
        private readonly governanceOnChainAbi: GovernanceOnChainAbiService,
        private readonly governanceSetter: GovernanceSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleOnChainGovernanceVoteEvent(
        event: VoteEvent,
        voteType: GOVERNANCE_ONCHAIN_EVENTS,
    ): Promise<void> {
        const topics = event.getTopics();
        const onChainScAddress = governanceContractsAddresses([GovernanceType.ONCHAIN])[0];

        const userVoteCacheKeys = []
        userVoteCacheKeys.push(
            await this.governanceSetter.getUserVoteOnChain(event.address, topics.voter, topics.proposalId, toVoteType(voteType).toString()),
        );
        await this.deleteCacheKeys(userVoteCacheKeys);
        
        const delegateUserVotingPowers = await this.governanceOnChainAbi.delegateUserVotingPowersRaw(onChainScAddress, topics.proposalId);
        const delegateUserVotingPowersCacheKeys = [];
        delegateUserVotingPowersCacheKeys.push(
            await this.governanceSetter.delegateUserVotingPowers(topics.voter, topics.proposalId, delegateUserVotingPowers)
        );
        await this.deleteCacheKeys(delegateUserVotingPowersCacheKeys);

    }

     private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}