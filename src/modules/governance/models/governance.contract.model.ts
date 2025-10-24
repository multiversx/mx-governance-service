import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { GovernanceProposalModel } from './governance.proposal.model';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { PulseIdeaModel, PulsePollModel } from './pulse.poll.model';

@ObjectType()
export class GovernanceTokenSnapshotContract {
    @Field()
    address: string;
    @Field(() => String)
    shard: string;
    @Field()
    minFeeForPropose: string;
    @Field()
    quorum: string;
    @Field(() => Int)
    votingDelayInBlocks: number;
    @Field(() => Int)
    votingPeriodInBlocks: number;
    @Field()
    feeToken: EsdtToken;
    @Field(() => Int)
    withdrawPercentageDefeated: number;
    @Field(() => [GovernanceProposalModel])
    proposals: GovernanceProposalModel[];
    @Field(() => Float)
    vetoPercentageLimit = 33.33;
    @Field(() => Int)
    votingPowerDecimals: number;

    constructor(init: Partial<GovernanceTokenSnapshotContract>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class GovernanceEnergyContract extends GovernanceTokenSnapshotContract {
    @Field()
    minEnergyForPropose: string;
    @Field()
    feesCollectorAddress: string;
    @Field()
    energyFactoryAddress: string;

    constructor(init: Partial<GovernanceEnergyContract>) {
        super(init);
        Object.assign(this, init);
    }
}

@ObjectType()
export class GovernanceOnChainContract extends GovernanceTokenSnapshotContract {
    @Field(() => Int)
    totalOnChainProposals: number;

    constructor(init: Partial<GovernanceOnChainContract>) {
        super(init)
        Object.assign(this, init);
    }
}

@ObjectType()
export class GovernancePulseContract {
    @Field()
    address: string;

    @Field(() => String)
    shard: string;

    @Field()
    rootHash: string;
    
    @Field(() => [PulsePollModel])
    polls: PulsePollModel[];

    @Field(() => [PulseIdeaModel])
    ideas: PulseIdeaModel[];

    @Field(() => Int)
    totalIdeas: number;
    
    @Field(() => Int)
    totalPolls: number;

    @Field()
    userVotingPower?: string;

    constructor(init: Partial<GovernancePulseContract>) {
        Object.assign(this, init);
    }
}