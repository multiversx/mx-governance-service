import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { GovGithubService } from './gov-github.service';
import { UseGuards } from '@nestjs/common';
import { NativeAuthGuard } from '../auth/native.auth.guard';
import { UserAuthResult } from '../auth/user.auth.result';
import { AuthUser } from '../auth/auth.user';

@Resolver()
export class GovGithubResolver {
    constructor(private readonly govGithubService: GovGithubService) { }

    @UseGuards(NativeAuthGuard)
    @Query(() => String)
    async githubOAuthToken(@Args('code') code: string) {
        return (await this.govGithubService.exchangeCodeForToken(code)).access_token;
    }

    @UseGuards(NativeAuthGuard)
    @Mutation(() => String)
    async createGithubProposal(
        @Args('title') title: string,
        @Args('description') description: string,
        @Args('proposal') proposal: string,
        @Args('accessToken') accessToken: string,
        @AuthUser() user: UserAuthResult,
    ) {
        const result = await this.govGithubService.createProposal({ title, description, proposal, accessToken, user: user.address });
        return result.url;
    }

    // Other queries and mutations to be implemented
}
