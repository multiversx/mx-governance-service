import { Args, Query, Resolver } from '@nestjs/graphql';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../../models/transaction.model';
import { CloseProposalArgs, CreateDelegateVoteArgs, CreateProposalArgs, VoteArgs } from '../models/governance.proposal.model';
import { UserAuthResult } from '../../auth/user.auth.result';
import { AuthUser } from '../../auth/auth.user';
import { GovernanceAbiFactory } from '../services/governance.abi.factory';
import { NativeAuthGuard } from '../../auth/native.auth.guard';
import { GovernanceOnChainAbiService } from '../services/governance.onchain.abi.service';
import { governanceConfig } from 'src/config';
import { DelegateGovernanceService } from '../services/delegate-governance.service';
import { GovernanceComputeService } from '../services/governance.compute.service';

@Resolver()
export class GovernanceTransactionService {
    constructor(
        private readonly governanceAbiFactory: GovernanceAbiFactory,
    ) {
    }

    @UseGuards(NativeAuthGuard)
    @Query(() => [TransactionModel])
    async allVotes(
        @Args() args: VoteArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        if(!governanceConfig.onChain.linear.includes(args.contractAddress)) {
            throw new BadRequestException("Vote v2 is supported only by on-chain governance contract !")
        }
        
        const onChainAbiService = this.governanceAbiFactory.useAbi(args.contractAddress) as GovernanceOnChainAbiService;
        return await onChainAbiService.vote(user.address, args)
    }

    @UseGuards(NativeAuthGuard)
    @Query(() => TransactionModel)
    async createProposal(
        @Args() args: CreateProposalArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        if(!governanceConfig.onChain.linear.includes(args.contractAddress)) {
            throw new BadRequestException("Create proposal is supported only by on-chain governance contract !")
        }
        const onChainAbiService = this.governanceAbiFactory.useAbi(args.contractAddress) as GovernanceOnChainAbiService;
        return onChainAbiService.createProposal(user.address, args)
    }

    @UseGuards(NativeAuthGuard)
    @Query(() => TransactionModel)
    async closeProposal(
        @Args() args: CloseProposalArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        if(!governanceConfig.onChain.linear.includes(args.contractAddress)) {
            throw new BadRequestException("Close proposal is supported only by on-chain governance contract !")
        }
        const onChainAbiService = this.governanceAbiFactory.useAbi(args.contractAddress) as GovernanceOnChainAbiService;
        return onChainAbiService.closeProposal(user.address, args)
    }

    @UseGuards(NativeAuthGuard)
    @Query(() => TransactionModel)
    async vote(
        @Args() args: VoteArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel | TransactionModel[]> {
        return this.governanceAbiFactory
            .useAbi(args.contractAddress)
            .vote(user.address, args)
    }
}
