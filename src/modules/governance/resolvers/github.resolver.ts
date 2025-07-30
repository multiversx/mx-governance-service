import { Resolver, Query } from '@nestjs/graphql';
import { GithubService } from '../services/github.service';
import { GithubProposal } from '../models/github.proposal.model';

@Resolver()
export class GithubResolver {
  constructor(
    private readonly githubService: GithubService,
) {}

  @Query(() => [GithubProposal])
  async githubProposals(
  ): Promise<GithubProposal[]> {
    return this.githubService.getGithubProposalWithChainInfo();
  }
}
