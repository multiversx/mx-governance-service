import { Args, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceProposalModel } from '../models/governance.proposal.model';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { GovernanceEnergyContract, GovernanceOnChainContract, GovernancePulseContract, GovernanceTokenSnapshotContract } from '../models/governance.contract.model';
import { GovernanceAbiFactory } from '../services/governance.abi.factory';
import { GovernanceServiceFactory } from '../services/governance.factory';
import { GovernanceEnergyAbiService } from '../services/governance.abi.service';
import { PaginationArgs } from '../models/pagination.model';
import { GovernanceOnChainAbiService } from '../services/governance.onchain.abi.service';
import { PulsePollModel } from '../models/pulse.poll.model';
import { GovernanceTokenSnapshotService } from '../services/governance.service';
import { GovernancePulseService } from '../services/governance.pulse.service';

@Resolver(() => GovernanceTokenSnapshotContract)
export class GovernanceTokenSnapshotContractResolver {
    constructor(
        protected readonly governanceAbiFactory: GovernanceAbiFactory,
        protected readonly governanceServiceFactory: GovernanceServiceFactory,
    ) {
    }

    @ResolveField()
    async shard(@Parent() contract: GovernanceTokenSnapshotContract): Promise<string> {
        return this.governanceAbiFactory.useAbi(contract.address).getAddressShardID(contract.address);
    }

    @ResolveField()
    async minFeeForPropose(@Parent() contract: GovernanceTokenSnapshotContract): Promise<string> {
        return this.governanceAbiFactory.useAbi(contract.address).minFeeForPropose(contract.address);
    }

    @ResolveField()
    async quorum(@Parent() contract: GovernanceTokenSnapshotContract): Promise<string> {
        return this.governanceAbiFactory.useAbi(contract.address).quorum(contract.address);
    }

    @ResolveField()
    async votingDelayInBlocks(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbiFactory.useAbi(contract.address).votingDelayInBlocks(contract.address);
    }

    @ResolveField()
    async votingPeriodInBlocks(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbiFactory.useAbi(contract.address).votingPeriodInBlocks(contract.address);
    }

    @ResolveField()
    async feeToken(@Parent() contract: GovernanceTokenSnapshotContract): Promise<EsdtToken> {
        return (this.governanceServiceFactory.userService(contract.address) as GovernanceTokenSnapshotService).feeToken(contract.address);
    }

    @ResolveField()
    async withdrawPercentageDefeated(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbiFactory.useAbi(contract.address).withdrawPercentageDefeated(contract.address);
    }

    @ResolveField()
    async votingPowerDecimals(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return (this.governanceServiceFactory.userService(contract.address) as GovernanceTokenSnapshotService).votingPowerDecimals(contract.address);
    }

    @ResolveField(() => [GovernanceProposalModel])
    async proposals(
        @Parent() contract: GovernanceTokenSnapshotContract,
        @Args('proposalId', {type: ()=> Int, nullable: true}) proposalId?: number,
        @Args() pagination?: PaginationArgs,
    ): Promise<GovernanceProposalModel[]> {
        const proposals = await this.governanceAbiFactory.useAbi(contract.address).proposals(contract.address);

        if(proposalId) {
            return proposals.filter(proposal => proposal.proposalId === proposalId);
        }
        
        return proposals;
    }
}

@Resolver(() => GovernanceEnergyContract)
export class GovernanceEnergyContractResolver extends GovernanceTokenSnapshotContractResolver {
    constructor(
        protected readonly governanceAbiFactory: GovernanceAbiFactory,
        protected readonly governanceServiceFactory: GovernanceServiceFactory,
    ) {
        super(governanceAbiFactory, governanceServiceFactory);
    }

    @ResolveField()
    async minEnergyForPropose(@Parent() contract: GovernanceEnergyContract): Promise<string> {
        const abi = this.governanceAbiFactory.useAbi(contract.address) as GovernanceEnergyAbiService;
        return abi.minEnergyForPropose(contract.address);
    }

    @ResolveField()
    async feesCollectorAddress(@Parent() contract: GovernanceEnergyContract): Promise<string> {
        const abi = this.governanceAbiFactory.useAbi(contract.address) as GovernanceEnergyAbiService;
        return abi.feesCollectorAddress(contract.address);
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() contract: GovernanceEnergyContract): Promise<string> {
        const abi = this.governanceAbiFactory.useAbi(contract.address) as GovernanceEnergyAbiService;
        return abi.energyFactoryAddress(contract.address);
    }
}

@Resolver(() => GovernanceOnChainContract)
export class GovernanceOnChainContractResolver extends GovernanceTokenSnapshotContractResolver {
    constructor(
        protected readonly governanceAbiFactory: GovernanceAbiFactory,
        protected readonly governanceServiceFactory: GovernanceServiceFactory,
    ) {
        super(governanceAbiFactory, governanceServiceFactory);
    }

    @ResolveField(() => [GovernanceProposalModel])
    async proposals(
        @Parent() contract: GovernanceOnChainContract,
        @Args('proposalId', {type: ()=> Int, nullable: true}) proposalId?: number,
        @Args() pagination?: PaginationArgs,
    ): Promise<GovernanceProposalModel[]> {
        const proposals = await this.governanceAbiFactory.useAbi(contract.address).proposals(contract.address);

        if(proposalId) {
            return proposals.filter(proposal => proposal.proposalId === proposalId);
        }
        
       if(pagination) {
            const start = Math.max(proposals.length - pagination.offset - pagination.limit, 0);
            const end = proposals.length - pagination.offset;

            if(start < 0 || end < 0) {
                return [];
            }

            return proposals.slice(start, end).reverse();
        }
        return proposals;
    }

    @ResolveField()
    async totalOnChainProposals(@Parent() contract: GovernanceOnChainContract): Promise<number> {
        const onChainAbiService = this.governanceAbiFactory.useAbi(contract.address) as GovernanceOnChainAbiService;
        return onChainAbiService.totalOnChainProposals();
    }
}


@Resolver(() => GovernancePulseContract)
export class GovernancePulseContractResolver {
    constructor(
        private readonly pulseService: GovernancePulseService,
    ){}
    
    @ResolveField()
    async shard(@Parent() contract: GovernancePulseContract) {
        return await this.pulseService.getContractShardId(contract.address);
    }

    @ResolveField(() => [PulsePollModel])
    async polls(
        @Parent() contract: GovernancePulseContract,
        @Args('pollId', {type: ()=> Int, nullable: true}) pollId?: number,
        @Args() pagination?: PaginationArgs,
    ): Promise<PulsePollModel[]> {
        const polls = await this.pulseService.getPolls(contract.address);

        if(pollId !== undefined && pollId !== null) {
            return polls.filter(poll => poll.pollId === pollId);
        }

       if(pagination) {
            const start = Math.max(polls.length - pagination.offset - pagination.limit, 0);
            const end = polls.length - pagination.offset;

            if(start < 0 || end < 0) {
                return [];
            }

            return polls.slice(start, end).reverse();
        }
        
        return polls;
    }

    @ResolveField()
    async rootHash(@Parent() contract: GovernancePulseContract): Promise<string> {
        return await this.pulseService.getRootHash(contract.address);
    }

    @ResolveField()
    async totalPolls(@Parent() contract: GovernancePulseContract): Promise<number> {
        return await this.pulseService.getTotalPolls(contract.address);
    }
}