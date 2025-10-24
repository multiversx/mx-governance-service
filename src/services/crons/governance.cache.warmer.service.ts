import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { governanceContractsAddresses, GovernanceType } from '../../utils/governance';
import { GovernanceAbiFactory } from '../../modules/governance/services/governance.abi.factory';
import { GovernanceSetterService } from '../../modules/governance/services/governance.setter.service';
import { Locker, Lock } from '@multiversx/sdk-nestjs-common';
import { GovernanceOnChainAbiService } from 'src/modules/governance/services/governance.onchain.abi.service';
import { ProposalInfoModel } from 'src/modules/governance/models/proposal.info.model';
import { GovernanceConfigModel } from 'src/modules/governance/models/governance.config.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class GovernanceCacheWarmerService {
    constructor(
        private readonly governanceAbiFactory: GovernanceAbiFactory,
        private readonly governanceSetter: GovernanceSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron('*/6 * * * * *')
    async cacheGovernanceStatuses(): Promise<void> {
        await Locker.lock('update governance statuses', async () => {
            const addresses = governanceContractsAddresses([
                GovernanceType.ENERGY,
                GovernanceType.TOKEN_SNAPSHOT,
            ]);
            for (const address of addresses) {
                const proposals = await this.governanceAbiFactory.useAbi(address).proposalsRaw(address);
                const promises = [];
                for (const proposal of proposals) {
                    const status = await this.governanceAbiFactory.useAbi(address).proposalStatusRaw(address, proposal.proposalId);
                    promises.push(this.governanceSetter.proposalStatus(address, proposal.proposalId, status));
                }

                const cachedKeys = await Promise.all([
                    ...promises,
                    this.governanceSetter.proposals(address, proposals),
                ]);

                await this.deleteCacheKeys(cachedKeys);
            }
        });
    }

    @Cron('*/6 * * * * *')
    @Lock({ name: 'warmOnChainGovernance', verbose: true })
    async warmOnChainGovernance(): Promise<void> {
        try {
            const config = await this.invalidateConfig();
          
            const proposalsRaw = await this.invalidateProposalsRaw(config);

            await this.invalidateProposalsStatuses(config, proposalsRaw);

            await this.invalidateProposalsVotes(config, proposalsRaw);

            await this.invalidateAllProposals(config);
        } catch (error) {
            this.logger.error('Error warming on-chain governance cache:', error);
        }
    }

    private async invalidateConfig() {
        const scAddress = governanceContractsAddresses([GovernanceType.ONCHAIN])[0];
        const onChainAbiService = this.governanceAbiFactory.useAbi(scAddress) as GovernanceOnChainAbiService;
        const configCacheKeys = [];
        const config = await onChainAbiService.getConfigRaw();
        configCacheKeys.push(await this.governanceSetter.getConfig(config));

        await this.deleteCacheKeys(configCacheKeys);

        return config;
    }

    private async invalidateProposalsRaw(config: GovernanceConfigModel) {
        const scAddress = governanceContractsAddresses([GovernanceType.ONCHAIN])[0];
        const onChainAbiService = this.governanceAbiFactory.useAbi(scAddress) as GovernanceOnChainAbiService;

        let lastProposalNonce = config.lastProposalNonce;
        if(!(Number.isInteger(lastProposalNonce) && lastProposalNonce > 0)) {
            lastProposalNonce = 0;
        }

        if(lastProposalNonce > GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD) {
            lastProposalNonce = GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD;
        }
        
        const proposalsPromises = [];
        const proposals: ProposalInfoModel[] = [];
        for(let proposalNonce = 1; proposalNonce <= lastProposalNonce; proposalNonce++) {
            const proposal = await onChainAbiService.getProposalRaw(proposalNonce);
            proposals.push(proposal);
            proposalsPromises.push(
                this.governanceSetter.getProposal(proposal.nonce, proposal)
            );
        }
        const proposalsCacheKeys = await Promise.all(proposalsPromises);
        await this.deleteCacheKeys(proposalsCacheKeys);

        return proposals;
    }


    private async invalidateProposalsStatuses(config: GovernanceConfigModel, proposals: ProposalInfoModel[]) {
        const scAddress = governanceContractsAddresses([GovernanceType.ONCHAIN])[0];
        const onChainAbiService = this.governanceAbiFactory.useAbi(scAddress) as GovernanceOnChainAbiService;
        let lastProposalNonce = config.lastProposalNonce;
        if(!(Number.isInteger(lastProposalNonce) && lastProposalNonce > 0)) {
            lastProposalNonce = 0;
        }

        if(lastProposalNonce > GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD) {
            lastProposalNonce = GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD;
        }

        const proposalStatusPromises = [];
        for(let proposalNonce = 1; proposalNonce <= lastProposalNonce; proposalNonce++) {
            if(proposals[proposalNonce - 1]) {
                const proposal = proposals[proposalNonce - 1];
                const proposalStatus = await onChainAbiService.getStatusForProposal(proposal);
                proposalStatusPromises.push(
                    this.governanceSetter.proposalStatus(scAddress, proposal.nonce, proposalStatus)
                );
            } else {
                this.logger.warn(`Proposal ${proposalNonce} not found`);
            }
        }
        const proposalStatusCacheKeys = await Promise.all(proposalStatusPromises);
        await this.deleteCacheKeys(proposalStatusCacheKeys);
    }


    private async invalidateProposalsVotes(config: GovernanceConfigModel, proposals: ProposalInfoModel[]) {
        const scAddress = governanceContractsAddresses([GovernanceType.ONCHAIN])[0];
        const onChainAbiService = this.governanceAbiFactory.useAbi(scAddress) as GovernanceOnChainAbiService;
        let lastProposalNonce = config.lastProposalNonce;
        if(!(Number.isInteger(lastProposalNonce) && lastProposalNonce > 0)) {
            lastProposalNonce = 0;
        }

        if(lastProposalNonce > GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD) {
            lastProposalNonce = GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD;
        }

        const proposalsVotesPromises = [];
        for(let proposalNonce = 1; proposalNonce <= lastProposalNonce; proposalNonce++) {
            if(proposals[proposalNonce - 1]) {
                const proposal = proposals[proposalNonce - 1];
                const proposalVotes = await onChainAbiService.proposalVotesRaw(scAddress, proposalNonce);
                proposalsVotesPromises.push(
                    this.governanceSetter.proposalVotes(scAddress, proposal.nonce, proposalVotes),
                );
            } else {
                this.logger.warn(`Proposal ${proposalNonce} not found`);
            }
        }
        const proposalVotesCacheKeys = await Promise.all(proposalsVotesPromises);
        await this.deleteCacheKeys(proposalVotesCacheKeys);
    }

    private async invalidateAllProposals(config: GovernanceConfigModel) {
        const scAddress = governanceContractsAddresses([GovernanceType.ONCHAIN])[0];
        const onChainAbiService = this.governanceAbiFactory.useAbi(scAddress) as GovernanceOnChainAbiService;
        let lastProposalNonce = config.lastProposalNonce;
        if(!(Number.isInteger(lastProposalNonce) && lastProposalNonce > 0)) {
            lastProposalNonce = 0;
        }

        if(lastProposalNonce > GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD) {
            lastProposalNonce = GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD;
        }

        const allProposals = await onChainAbiService.proposalsRaw(scAddress);
        const cacheKeys = await Promise.all([
            this.governanceSetter.proposals(scAddress, allProposals),
        ]);

        await this.deleteCacheKeys(cacheKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
