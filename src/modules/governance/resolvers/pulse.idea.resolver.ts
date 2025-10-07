import { Resolver, ResolveField, Parent } from "@nestjs/graphql";
import { PulseIdeaModel, PulsePollModel } from "../models/pulse.poll.model";
import { AuthUser } from "src/modules/auth/auth.user";
import { UserAuthResult } from "src/modules/auth/user.auth.result";
import { NativeAuthGuard } from "src/modules/auth/native.auth.guard";
import { UseGuards } from "@nestjs/common";
import { GovernancePulseService } from "../services/governance.pulse.service";

@Resolver(() => PulseIdeaModel)
export class PulseIdeaResolver {
     constructor(
            private readonly pulseService: GovernancePulseService,
        ) { }

    @ResolveField()
    async ideaId(@Parent() idea: PulseIdeaModel) {
        return idea.ideaId;
    }

    @ResolveField()
    async initiator(@Parent() idea: PulseIdeaModel) {
        return idea.initiator;
    }


    @ResolveField()
    async description(@Parent() idea: PulseIdeaModel) {
        return idea.description;
    }

    @ResolveField()
    async contractAddress(@Parent() idea: PulseIdeaModel) {
        return idea.contractAddress;
    }

    @ResolveField()
    async ideaStartTime(@Parent() idea: PulseIdeaModel) {
        return idea.ideaStartTime;
    }

  
    @ResolveField()
    async totalVotingPower(@Parent() idea: PulseIdeaModel) {
        return idea.totalVotingPower;
    }

    @ResolveField()
    async totalVotesCount(
        @Parent() idea: PulseIdeaModel
    ) {
        return idea.totalVotesCount;
   }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async hasVoted(
        @AuthUser() user: UserAuthResult,
        @Parent() idea: PulseIdeaModel
    ) {
        return await this.pulseService.hasUserVotedIdea(idea.contractAddress, user.address, idea.ideaId);
   }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async userVotingPower(
        @AuthUser() user: UserAuthResult,
        @Parent() idea: PulsePollModel,
    ) {
        return await this.pulseService.getUserVotingPower(idea.contractAddress, user.address);
    }

    @ResolveField()
    async index(@Parent() idea: PulseIdeaModel) {
        return await this.pulseService.getIndexForIdea(idea.contractAddress, idea.ideaId);
    }
}