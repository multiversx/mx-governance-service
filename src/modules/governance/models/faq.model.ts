import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType({ description: "FAQ item" })
export class FAQItem {
    @Field({ description: "Question" })
    question!: string;


    @Field({ description: "Answear" })
    answer!: string;
}