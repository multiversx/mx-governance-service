import { Field, ObjectType } from "@nestjs/graphql";
import { VoteType } from "./governance.proposal.model";

@ObjectType()
export class DelegateUserVotingPower {
    @Field()
    providerName: string;
    @Field()
    scAddress: string;
    @Field()
    lsTokenId: string;
    @Field()
    userVotingPower: string;
    @Field()
    isEnabled: boolean;
    @Field()
    hasVoted: boolean;
    @Field()
    userVoteType?: VoteType;

    constructor(init?: Partial<DelegateUserVotingPower>) {
        Object.assign(this, init);
    }
}

export class DelegateStakingProvider {
    providerName: string;
    voteScAddress: string;
    stakeScAddress: string;
    lsTokenId: string;
    voteFunctionName: string;
    viewUserVotingPowerName: string;
    isEnabled: boolean;

    constructor(init?: Partial<DelegateStakingProvider>) {
        Object.assign(this, init);
    }
}