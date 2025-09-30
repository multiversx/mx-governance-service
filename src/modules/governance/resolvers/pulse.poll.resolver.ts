import { Resolver, ResolveField, Parent } from "@nestjs/graphql";
import { PulsePollModel } from "../models/pulse.poll.model";
import { AuthUser } from "src/modules/auth/auth.user";
import { UserAuthResult } from "src/modules/auth/user.auth.result";
import { NativeAuthGuard } from "src/modules/auth/native.auth.guard";
import { UseGuards } from "@nestjs/common";
import { GovernancePulseAbiService } from "../services/governance.pulse.abi.service";
import { GovernancePulseService } from "../services/governance.pulse.service";

@Resolver(() => PulsePollModel)
export class PulsePollResolver {
     constructor(
            // private readonly pulseAbiService: GovernancePulseAbiService,
            private readonly pulseService: GovernancePulseService,
            // private readonly governaneMerkle: GovernanceTokenSnapshotMerkleService,
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

    // @ResolveField()
    // async rootHash(@Parent() poll: PulsePollModel) {
    //     return poll.rootHash;
    // }

    @ResolveField()
    async pollResults(@Parent() poll: PulsePollModel) {
        return poll.pollResults;
    }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async hasVoted(
        @AuthUser() user: UserAuthResult,
        @Parent() poll: PulsePollModel
    ) {
        return poll.hasVoted ?? false;
   }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async userVotingOption(
        @AuthUser() user: UserAuthResult,
        @Parent() poll: PulsePollModel
    ) {
        return poll.userVotingOption;
    }

    @UseGuards(NativeAuthGuard)
    @ResolveField()
    async userVotingPower(
        @AuthUser() user: UserAuthResult,
        @Parent() poll: PulsePollModel
    ) {
        return poll.userVotingPower;
    }
}
