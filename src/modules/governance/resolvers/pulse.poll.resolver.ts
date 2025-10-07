import { Resolver, ResolveField, Parent } from "@nestjs/graphql";
import { PulsePollModel } from "../models/pulse.poll.model";
import { AuthUser } from "src/modules/auth/auth.user";
import { UserAuthResult } from "src/modules/auth/user.auth.result";
import { NativeAuthGuard } from "src/modules/auth/native.auth.guard";
import { UseGuards } from "@nestjs/common";
import { GovernancePulseService } from "../services/governance.pulse.service";

@Resolver(() => PulsePollModel)
export class PulsePollResolver {
     constructor(
            private readonly pulseService: GovernancePulseService,
        ) { }

    @ResolveField()
    async pollId(@Parent() poll: PulsePollModel) {
        return poll.pollId;
    }

    @ResolveField()
    async initiator(@Parent() poll: PulsePollModel) {
        return poll.initiator;
    }

    @ResolveField()
    async options(@Parent() poll: PulsePollModel) {
        return poll.options;
    }

    @ResolveField()
    async question(@Parent() poll: PulsePollModel) {
        return poll.question;
    }

    @ResolveField()
    async contractAddress(@Parent() poll: PulsePollModel) {
        return poll.contractAddress;
    }

    @ResolveField()
    async status(@Parent() poll: PulsePollModel) {
        return poll.status;
    }

    @ResolveField()
    async pollEndTime(@Parent() poll: PulsePollModel) {
        return poll.pollEndTime;
    }
    @ResolveField()
    async pollResults(@Parent() poll: PulsePollModel) {
        return await this.pulseService.getPollResults(poll.contractAddress, poll.pollId);
    }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async hasVoted(
        @AuthUser() user: UserAuthResult,
        @Parent() poll: PulsePollModel
    ) {
        return await this.pulseService.hasUserVoted(poll.contractAddress, user.address, poll.pollId);
   }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async userVotingOption(
        @AuthUser() user: UserAuthResult,
        @Parent() poll: PulsePollModel
    ) {
        return await this.pulseService.getUserVotingOption(poll.contractAddress, user.address, poll.pollId);
    }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async userVotingPower(
        @AuthUser() user: UserAuthResult,
        @Parent() poll: PulsePollModel,
    ) {
        return await this.pulseService.getUserVotingPower(poll.contractAddress, user.address);
    }

    @ResolveField()
    async index(@Parent() poll: PulsePollModel) {
        return await this.pulseService.getIndexForPoll(poll.contractAddress, poll.pollId);
    }
}