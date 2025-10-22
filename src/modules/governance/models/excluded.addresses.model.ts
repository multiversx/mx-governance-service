import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType({ description: "Direct stake voting power" })
export class ExcludedAddressItem {
    @Field({ description: "Address" })
    address!: string;


    @Field({ description: "Voting Power" })
    votingPower!: string;
}