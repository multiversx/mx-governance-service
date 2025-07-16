import { Field, ObjectType } from "@nestjs/graphql";

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

    constructor(init?: Partial<DelegateUserVotingPower>) {
        Object.assign(this, init);
    }
}

export class DelegateStakingProvider {
    providerName: string;
    scAddress: string;
    lsTokenId: string;
    voteFunctionName: string;
    viewUserVotingPowerName: string;

    constructor(init?: Partial<DelegateStakingProvider>) {
        Object.assign(this, init);
    }
}