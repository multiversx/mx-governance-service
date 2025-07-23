import { Resolver, Query, Args } from '@nestjs/graphql';

import { ObjectType, Field } from '@nestjs/graphql';
import { GithubService } from '../services/github.service';

@ObjectType()
export class GithubProposal {
  @Field()
  fileName: string;

  @Field()
  commitHash: string;

  @Field()
  content: string;

  @Field()
  existsOnChain?: boolean = false;
}


@Resolver()
export class GithubResolver {
  constructor(
    private readonly githubService: GithubService,
) {}

  @Query(() => [GithubProposal])
  async githubProposals(
  ): Promise<GithubProposal[]> {
    return this.githubService.getGithubProposalWithStatus();
  }
}
