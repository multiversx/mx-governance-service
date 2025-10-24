import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceProposalModel, GovernanceProposalStatus, VoteType } from '../models/governance.proposal.model';
import { ProposalVotes } from '../models/governance.proposal.votes.model';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { UserAuthResult } from '../../auth/user.auth.result';
import { AuthUser } from '../../auth/auth.user';
import { GovernanceTokenSnapshotMerkleService } from '../services/governance.token.snapshot.merkle.service';
import { GovernanceAbiFactory } from '../services/governance.abi.factory';
import { GovernanceServiceFactory } from '../services/governance.factory';
import { NativeAuthGuard } from '../../auth/native.auth.guard';
import { DelegateUserVotingPower } from '../models/delegate-provider.model';
import { governanceConfig } from 'src/config';
import { GovernanceOnChainService, GovernanceTokenSnapshotService } from '../services/governance.service';
import { ExcludedAddressItem } from '../models/excluded.addresses.model';

@Resolver(() => GovernanceProposalModel)
export class GovernanceProposalResolver {
    constructor(
        private readonly governanceAbiFactory: GovernanceAbiFactory,
        private readonly governanceServiceFactory: GovernanceServiceFactory,
        private readonly governaneMerkle: GovernanceTokenSnapshotMerkleService,
    ) {
    }

    @ResolveField()
    async status(@Parent() governanceProposal: GovernanceProposalModel): Promise<GovernanceProposalStatus> {
        return this.governanceAbiFactory
            .useAbi(governanceProposal.contractAddress)
            .proposalStatus(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async rootHash(@Parent() governanceProposal: GovernanceProposalModel): Promise<string> {
        return this.governanceAbiFactory
            .useAbi(governanceProposal.contractAddress)
            .proposalRootHash(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @ResolveField()
    async votes(@Parent() governanceProposal: GovernanceProposalModel): Promise<ProposalVotes> {
        return this.governanceAbiFactory
            .useAbi(governanceProposal.contractAddress)
            .proposalVotes(governanceProposal.contractAddress, governanceProposal.proposalId);
    }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async hasVoted(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<boolean> {
        const userVoteType = await (this.governanceServiceFactory
            .userService(governanceProposal.contractAddress) as GovernanceTokenSnapshotService)
            .userVote(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
        return userVoteType !== VoteType.NotVoted;
    }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async userVoteType(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<VoteType> {
        return (this.governanceServiceFactory
            .userService(governanceProposal.contractAddress) as GovernanceTokenSnapshotService)
            .userVote(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async userVotingPower(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<string> {
        return (this.governanceServiceFactory
            .userService(governanceProposal.contractAddress) as GovernanceTokenSnapshotService)
            .userVotingPower(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }


    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async delegateUserVotingPowers(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<DelegateUserVotingPower[]> {
        if(!governanceConfig.onChain.linear.includes(governanceProposal.contractAddress)) {
            throw new BadRequestException("Delegate user voting powers is supported only by on-chain governance contract !")
        }
        
        const governanceOnChainService = this.governanceServiceFactory.userService(governanceProposal.contractAddress) as GovernanceOnChainService;
        return await governanceOnChainService.delegateUserVotingPowers(governanceProposal.contractAddress,user.address, governanceProposal.proposalId);
    }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async userVotingPowerDirect(
        @AuthUser() user: UserAuthResult,
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<string> {
         if(!governanceConfig.onChain.linear.includes(governanceProposal.contractAddress)) {
            throw new BadRequestException("User voting power direct is supported only by on-chain governance contract !")
        }
        
        const governanceOnChainService = this.governanceServiceFactory.userService(governanceProposal.contractAddress) as GovernanceOnChainService;
        return await governanceOnChainService.userVotingPowerDirect(governanceProposal.contractAddress, governanceProposal.proposalId, user.address);
    }

    @ResolveField()
    async excludedAddresses(
        @Parent() governanceProposal: GovernanceProposalModel
    ): Promise<ExcludedAddressItem[]> {
         if(!governanceConfig.onChain.linear.includes(governanceProposal.contractAddress)) {
            throw new BadRequestException("Excluded addresses is supported only by on-chain governance contract !")
        }
        
        const governanceOnChainService = this.governanceServiceFactory.userService(governanceProposal.contractAddress) as GovernanceOnChainService;
        return await governanceOnChainService.excludedAddresses(governanceProposal.contractAddress, governanceProposal.proposalId);
    }
}
