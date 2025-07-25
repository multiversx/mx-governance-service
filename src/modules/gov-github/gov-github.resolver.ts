import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { GovGithubService } from './gov-github.service';

@Resolver()
export class GovGithubResolver {
    constructor(private readonly govGithubService: GovGithubService) { }

    @Query(() => String)
    async githubOAuthToken(@Args('code') code: string) {
        return (await this.govGithubService.exchangeCodeForToken(code)).access_token;
    }

    @Mutation(() => String)
    async createGithubProposal(
        @Args('title') title: string,
        @Args('description') description: string,
        @Args('proposal') proposal: string,
        @Args('accessToken') accessToken: string,
    ) {
        const result = await this.govGithubService.createProposal({ title, description, proposal, accessToken });
        return result.url;
    }

    // Other queries and mutations to be implemented
}
