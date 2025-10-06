import { ArgsType, Field, registerEnumType } from "@nestjs/graphql";
import { IsEnum, IsOptional } from "class-validator";


export enum SortType {
    VOTING_POWER = 'votingPower',
    VOTES_NUMBER = 'votesNumber',
    START_TIME = 'startTime'
}

export enum OrderType {
    ASCENDING = 'asc',
    DESCENDING = 'desc'
}

registerEnumType(SortType, { name: 'SortType' });
registerEnumType(OrderType, { name: 'OrderType' });

@ArgsType()
export class SortArgs {
    @Field(() => SortType, { nullable: true })
    @IsEnum(SortType, { message: 'sortBy must be a valid SortType value' })
    sortBy?: SortType;

    @Field(() => OrderType, { nullable: true })
    @IsEnum(OrderType, { message: 'order must be a valid OrderType value' })
    order?: OrderType;

    constructor(init?: Partial<SortArgs>) {
        Object.assign(this, init);
    }
}