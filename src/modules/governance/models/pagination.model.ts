import { ArgsType, Field, Int } from "@nestjs/graphql";
import { Max, Min } from "class-validator";

@ArgsType()
export class PaginationArgs {
    @Field(() => Int)
    @Min(0)
    offset = 0;

   
    @Field(() => Int)
    @Max(200)
    limit = 200;

    constructor(init: Partial<PaginationArgs>) {
        Object.assign(this, init);
    }
}