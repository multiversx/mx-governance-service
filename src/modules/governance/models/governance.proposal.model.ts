import { ArgsType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GovernanceAction } from './governance.action.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { ProposalVotes } from './governance.proposal.votes.model';
import { GovernanceDescriptionUnion } from './governance.union';
import { DelegateUserVotingPower } from './delegate-provider.model';
import { FileContent } from './github.proposal.model';
import { FAQItem } from './faq.model';
import { ExcludedAddressItem } from './excluded.addresses.model';

export enum GovernanceProposalStatus {
    None = 'None',
    Pending = 'Pending',
    Active = 'Active',
    Defeated = 'Defeated',
    DefeatedWithVeto = 'DefeatedWithVeto',
    Succeeded = 'Succeeded',
    PendingClose = 'PendingClose',
}

registerEnumType(GovernanceProposalStatus, {name: 'GovernanceProposalStatus'});

export enum VoteType {
    UpVote,
    DownVote,
    DownVetoVote,
    AbstainVote,
    NotVoted,
}

registerEnumType(GovernanceProposalStatus, {name: 'VoteType'});

@ObjectType()
export class DescriptionV0 {
    @Field()
    title: string;
    @Field(() => Int)
    strapiId: number;
    @Field()
    version: number;

    constructor(init: Partial<DescriptionV0>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class DescriptionV1 extends DescriptionV0 {
    @Field()
    shortDescription: string;

    constructor(init: Partial<DescriptionV1>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class DescriptionV2 extends DescriptionV1 {
    @Field()
    strapiHash: string;

    constructor(init: Partial<DescriptionV2>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class DescriptionV3 {
    @Field()
    version: number;
    @Field(() => FileContent)
    fileContent: FileContent;

    constructor(init: Partial<DescriptionV3>) {
        Object.assign(this, init);
    }
}

@ArgsType()
export class VoteArgs {
    @Field()
    contractAddress: string;
    @Field()
    proposalId: number;
    @Field()
    vote: VoteType;
}

@ArgsType()
export class CreateDelegateVoteArgs {
    @Field()
    contractAddress: string;
    @Field()
    delegateContractAddress: string;
    @Field(() => Int)
    proposalId: number;
    @Field(() => Int)
    vote: VoteType;
}

@ArgsType()
export class CloseProposalArgs {
    @Field()
    contractAddress: string;
    @Field(() => Int)
    proposalId: number;
}

@ArgsType()
export class CreateProposalArgs {
    @Field()
    contractAddress: string;
    @Field()
    commitHash: string;
    @Field(() => Int)
    startVoteEpoch: number;
    @Field(() => Int)
    endVoteEpoch: number;
    @Field()
    nativeTokenAmount: string;
}

@ObjectType()
export class GovernanceProposalModel {
    @Field()
    contractAddress: string;
    @Field()
    proposalId: number;
    @Field()
    proposer: string;
    @Field(() => [GovernanceAction])
    actions: GovernanceAction[];
    @Field(() => GovernanceDescriptionUnion)
    description: typeof GovernanceDescriptionUnion;
    @Field(() => EsdtTokenPaymentModel)
    feePayment: EsdtTokenPaymentModel;
    @Field()
    minimumQuorumPercentage: string;
    @Field(() => Int)
    votingDelayInBlocks: number;
    @Field(() => Int)
    votingPeriodInBlocks: number;
    @Field(() => Int)
    withdrawPercentageDefeated: number;
    @Field()
    totalQuorum: string;
    @Field(() => Int)
    proposalStartBlock: number;
    @Field()
    status: GovernanceProposalStatus;
    @Field()
    rootHash: string;
    @Field(() => ProposalVotes)
    votes: ProposalVotes;
    @Field()
    hasVoted?: boolean;
    @Field()
    userVoteType?: VoteType;
    @Field()
    userVotingPower?: string;
    @Field(() => [DelegateUserVotingPower])
    delegateUserVotingPowers?: [DelegateUserVotingPower];
    @Field()
    userVotingPowerDirect?: string;
    @Field()
    commitHash?: string;
    @Field(() => Int)
    startVoteTimestamp?: number;
    @Field(() => Int)
    endVoteTimestamp?: number;
    @Field(() => Int)
    proposalIndex?: number;
    @Field(() => [FAQItem], { nullable: true })
    faq?: FAQItem[];
    @Field(() => [ExcludedAddressItem], { nullable: true })
    excludedAddresses?: ExcludedAddressItem[];
    
    constructor(init: Partial<GovernanceProposalModel>) {
        Object.assign(this, init);
    }
}
