import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class InputTokenModel {
    @Field()
    tokenID: string;
    @Field(type => Int)
    nonce: number;
    @Field()
    amount: string;

    constructor(init?: Partial<InputTokenModel>) {
        Object.assign(this, init);
    }
}