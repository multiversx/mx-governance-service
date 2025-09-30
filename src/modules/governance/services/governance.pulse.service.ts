import { Injectable } from "@nestjs/common";
import { GovernancePulseAbiService } from "./governance.pulse.abi.service";
import { EndPollArgs, NewPollArgs, PollResult, PollStatus, PulsePollModel, VotePollArgs } from "../models/pulse.poll.model";
import { PaginationArgs } from "../models/pagination.model";
import { MXProxyService } from "src/services/multiversx-communication/mx.proxy.service";

@Injectable()
export class GovernancePulseService {
    static POLLS_THRESHOLD = 100; // early exit in case of a bug in vm query to not go into infinite loop
    constructor(
        private readonly pulseAbiService: GovernancePulseAbiService,
        private readonly mxProxyService: MXProxyService,
    ) {}

    votePoll(sender: string, args: VotePollArgs) {
        return this.pulseAbiService.votePoll(sender, args);
    }
    newPoll(sender: string, args: NewPollArgs) {
        return this.pulseAbiService.newPoll(sender, args);
    }

    endPoll(sender: string, args: EndPollArgs) {
        return this.pulseAbiService.endPoll(sender, args);
    }

    async getContractShardId(scAddress: string) {
        return await this.mxProxyService.getAddressShardID(scAddress);
    }

    async getPolls(scAddress: string) {
        return await this.getPollsRaw(scAddress);
    }

    async getPollsRaw(scAddress: string) {
        const totalPolls = await this.getTotalPolls(scAddress);
        const promises: Promise<PulsePollModel>[] = [];
        for(let i = 0; i < totalPolls && i < GovernancePulseService.POLLS_THRESHOLD; i++) {
            promises.push(this.getPoll(scAddress, i));
        }
        return Promise.all(promises);
    }

    async getPoll(scAddress: string, pollId: number) {
        const pollInfoRaw = await this.pulseAbiService.getPoll(scAddress, pollId);
        return new PulsePollModel({
            contractAddress: scAddress,
            pollId,
            initiator: pollInfoRaw.initiator,
            options: pollInfoRaw.options,
            question: pollInfoRaw.question,
            status: pollInfoRaw.status === true ? PollStatus.ONGOING : PollStatus.ENDED,
            pollEndTime: pollInfoRaw.endTime,
            pollResults: await this.getPollResults(scAddress, pollId),
        })
    }

    async getPollVotesTotalCount(scAddress: string, pollId: number) {
        return await this.pulseAbiService.getTotalVotes(scAddress, pollId);
    }

    async getTotalPolls(scAddress: string) {
        return await this.pulseAbiService.getTotalPolls(scAddress);
    }

    async getInitiator(scAddress: string, pollId: number) {
        const poll = await this.pulseAbiService.getPoll(scAddress, pollId);
        return poll.initiator;
    }

    async getOptions(scAddress: string, pollId: number) {
        const poll = await this.pulseAbiService.getPoll(scAddress, pollId);
        return poll.options;
    }

    async getQuestion(scAddress: string, pollId: number) {
        const poll = await this.pulseAbiService.getPoll(scAddress, pollId);
        return poll.question;
    }

    async getStatus(scAddress: string, pollId: number) {
        const poll = await this.pulseAbiService.getPoll(scAddress, pollId);
        return poll.status === true ? PollStatus.ONGOING : PollStatus.ENDED;
    }

    async getPollVotesCount(scAddress: string, pollId: number, optionId: number) {
        const count = await this.pulseAbiService.getPollVotesCount(scAddress, pollId, optionId);
        return count;
    }

    async getPollEndTime(scAddress: string, pollId: number) {
        const poll = await this.pulseAbiService.getPoll(scAddress, pollId);
        return poll.endTime;
    }

    async getPollOptions(scAddress: string, pollId: number) {
        const poll = await this.pulseAbiService.getPoll(scAddress, pollId);
        return poll.options;
    }

    // async getPollResult(scAddress: string, pollId: number, optionId: number) {
    //     const nrVotes = await this.getPollVotesCount(scAddress, pollId, optionId);
    //     const votingPower = await this.pulseAbiService.getTotalVotes(scAddress, pollId);

    //     return new PollResult({ optionId, votingPower , nrVotes});
    // }

    async getPollResults(scAddress: string, pollId: number) {
        const poll = await this.pulseAbiService.getPoll(scAddress, pollId);
        const options = poll.options;
        const numberOfOptions = options.length;
        const promises:  Promise<number>[] = [];

        for(let optionId = 0; optionId < numberOfOptions; optionId++) {
            promises.push(this.getPollVotesCount(scAddress, pollId, optionId));
        }
        const voteCountPerOption = await Promise.all(promises);

        const pollResults: PollResult[] = [];
        for(let optionId = 0; optionId < numberOfOptions; optionId++) {
            const votingPower = poll.voteScore[optionId];
            const nrVotes = voteCountPerOption[optionId];

            pollResults.push(new PollResult({ optionId, votingPower: votingPower , nrVotes}));
        }

        return pollResults;
    }
}