import { Field, ObjectType } from "@nestjs/graphql";
import { GovernanceProposalStatus } from "./governance.proposal.model";

@ObjectType()
export class FileContent {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  rationale?: string;

  @Field()
  proposer: string;

  constructor(init?: Partial<FileContent>) {
    Object.assign(this, init);
  }
}

@ObjectType()
export class ChainInfo {
  @Field()
  existsOnChain: boolean;

  @Field({ nullable: true })
  status?: GovernanceProposalStatus;

  @Field({ nullable: true })
  proposalId?: number;

  constructor(init?: Partial<ChainInfo>) {
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
  chainInfo?: ChainInfo;

  @Field({ nullable: true })
  prMerged?: boolean;

  @Field({ nullable: true })
  prNumber?: number;

  @Field({ nullable: true })
  prUrl?: string;
}


