import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class FileContent {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  content: string;

  @Field()
  proposer: string;

  constructor(init?: Partial<FileContent>) {
    Object.assign(this, init);
  }
}

@ObjectType()
export class GithubProposal {
  @Field()
  fileName: string;

  @Field()
  commitHash: string;

  @Field(() => FileContent)
  fileContent: FileContent;

  @Field()
  existsOnChain?: boolean = false;
}


