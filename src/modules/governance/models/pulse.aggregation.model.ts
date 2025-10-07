import { Field, Int, ObjectType } from "@nestjs/graphql";
import { PulseIdeaModel, PulsePollModel } from "./pulse.poll.model";

@ObjectType()
export class GovernancePulseAggregation {
    @Field(() => [PulsePollModel])
    polls: PulsePollModel[];

    @Field(() => [PulseIdeaModel])
    ideas: PulseIdeaModel[];

    @Field(() => Int)
    totalIdeas: number;
    
    @Field(() => Int)
    totalPolls: number;

    @Field()
    latestContract: string;

    constructor(init: Partial<GovernancePulseAggregation>) {
        Object.assign(this, init);
    }
}

