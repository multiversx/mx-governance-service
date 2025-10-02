import { BadRequestException, Injectable } from "@nestjs/common";
import { GovernancePulseAbiService } from "./governance.pulse.abi.service";
import { EndPollArgs, NewPollArgs, PollResult, PollResults, PollStatus, PulsePollModel, VotePollArgs } from "../models/pulse.poll.model";
import { MXProxyService } from "src/services/multiversx-communication/mx.proxy.service";
import { GovernanceQuorumService } from "./governance.quorum.service";
import { GovernanceSmoothingFunction, governanceSmoothingFunction } from "src/utils/governance";
import BigNumber from "bignumber.js";
import { PulseComputeService } from "./pulse.compute.service";
import { ErrorLoggerAsync } from "@multiversx/sdk-nestjs-common";
import { GetOrSetCache } from "src/helpers/decorators/caching.decorator";
import { CacheTtlInfo } from "src/services/caching/cache.ttl.info";
import { GovernanceTokenSnapshotMerkleService } from "./governance.token.snapshot.merkle.service";

@Injectable()
export class GovernancePulseService {
    static POLLS_THRESHOLD = 100; // early exit in case of a bug in vm query to not go into infinite loop
    constructor(
        private readonly pulseAbiService: GovernancePulseAbiService,
        private readonly mxProxyService: MXProxyService,
        private readonly quorumService: GovernanceQuorumService,
        private readonly pulseComputeService: PulseComputeService,
        private readonly merkleTreeService: GovernanceTokenSnapshotMerkleService,
    ) {}

    async votePoll(sender: string, args: VotePollArgs) {
        // const hasUserVoted = await this.hasUserVoted(args.contractAddress, sender, args.pollId);
        const userVotingPower = await this.getUserVotingPower(args.contractAddress, sender);
        if(new BigNumber(userVotingPower).lte(new BigNumber(0))) {
            throw new BadRequestException("Not enough voting power !");
        }
        args.votingPower = userVotingPower;
        
        const proof = await this.getProof(args.contractAddress, sender);
        args.proof = proof;

        return this.pulseAbiService.votePoll(sender, args);
    }

    private async getProof(scAddress: string, userAddress: string) {
        const rootHash = await this.getRootHash(scAddress);
        const merkleTree = await this.merkleTreeService.getMerkleTree(rootHash);
        const addressLeaf = merkleTree.getUserLeaf(userAddress);
        const proofBuffer = merkleTree.getProofBuffer(addressLeaf);
        return proofBuffer;
    }

    newPoll(sender: string, args: NewPollArgs) {
        return this.pulseAbiService.newPoll(sender, args);
    }

    endPoll(sender: string, args: EndPollArgs) {
        return this.pulseAbiService.endPoll(sender, args);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'pulse',
        remoteTtl: CacheTtlInfo.Attributes.remoteTtl,
        localTtl: CacheTtlInfo.Attributes.remoteTtl,
    })
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'pulse',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.remoteTtl,
    })
    async getPoll(scAddress: string, pollId: number) {
        return await this.getPollRaw(scAddress, pollId);
    }

    async getPollRaw(scAddress: string, pollId: number) {
        const pollInfoRaw = await this.pulseAbiService.getPoll(scAddress, pollId);
        return new PulsePollModel({
            contractAddress: scAddress,
            pollId,
            initiator: pollInfoRaw.initiator,
            options: pollInfoRaw.options,
            question: pollInfoRaw.question,
            status: pollInfoRaw.status === true ? PollStatus.ONGOING : PollStatus.ENDED,
            pollEndTime: pollInfoRaw.endTime,
        })
    }

    // @ErrorLoggerAsync()
    // @GetOrSetCache({
    //     baseKey: 'pulse',
    //     remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
    //     localTtl: CacheTtlInfo.ContractInfo.localTtl,
    // })
    // async getPollVotesTotalCount(scAddress: string, pollId: number) {
    //     return await this.getPollVotesTotalCountRaw(scAddress, pollId);
    // }

    // async getPollVotesTotalCountRaw(scAddress: string, pollId: number) {
    //     return await this.pulseAbiService.getTotalVotes(scAddress, pollId);
    // }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'pulse',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.remoteTtl,
    })
    async getTotalPolls(scAddress: string) {
        return await this.getTotalPollsRaw(scAddress);
    }

    async getTotalPollsRaw(scAddress: string) {
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'pulse',
        remoteTtl: CacheTtlInfo.Attributes.remoteTtl,
        localTtl: CacheTtlInfo.Attributes.remoteTtl,
    })
    async getPollVotesCount(scAddress: string, pollId: number, optionId: number) {
        return await this.getPollVotesCountRaw(scAddress, pollId, optionId);
    }

    async getPollVotesCountRaw(scAddress: string, pollId: number, optionId: number) {
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'pulse',
        remoteTtl: CacheTtlInfo.Attributes.remoteTtl,
        localTtl: CacheTtlInfo.Attributes.remoteTtl,
    })
    async getPollResults(scAddress: string, pollId: number) {
        return await this.getPollResultsRaw(scAddress, pollId)
    }

    async getPollResultsRaw(scAddress: string, pollId: number) {
        const poll = await this.pulseAbiService.getPoll(scAddress, pollId);
        const options = poll.options;
        const numberOfOptions = options.length;
        const promises:  Promise<number>[] = [];

        for(let optionId = 0; optionId < numberOfOptions; optionId++) {
            promises.push(this.getPollVotesCountRaw(scAddress, pollId, optionId));
        }
        const voteCountPerOption = await Promise.all(promises);

        const pollResults: PollResult[] = [];
        let totalVotingPower = new BigNumber(0);
        let totalVotesCount = 0;
        for(let optionId = 0; optionId < numberOfOptions; optionId++) {
            const votingPower = poll.voteScore[optionId];
            totalVotingPower = totalVotingPower.plus(new BigNumber(votingPower));

            const nrVotes = voteCountPerOption[optionId];
            totalVotesCount += nrVotes;

            pollResults.push(new PollResult({ optionId, votingPower: votingPower , nrVotes}));
        }
    
        return new PollResults({
            pollResults,
            totalVotingPower: totalVotingPower.toFixed(),
            totalVotesCount
        })
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'pulse',
        remoteTtl: CacheTtlInfo.Attributes.remoteTtl,
        localTtl: CacheTtlInfo.Attributes.remoteTtl,
    })
    async getRootHash(scAddress: string) {
        return await this.pulseAbiService.getRootHash(scAddress);
    }

    async getUserVotingPower(scAddress: string, userAddress: string) {
        const rootHash = await this.getRootHash(scAddress);
        
        const userQuorum = await this.quorumService.userQuorum(scAddress, userAddress, rootHash);
        return this.smoothingFunction(scAddress, userQuorum);
    }

    async hasUserVoted(scAddress: string, userAddress: string, pollId: number) {
        const voteOptionId = await this.pulseComputeService.getUserVotePulse(scAddress, userAddress, pollId);
        return voteOptionId >= 0 ? true : false;
    }

    async getUserVotingOption(scAddress: string, userAddress: string, pollId: number) {
        return await this.pulseComputeService.getUserVotePulse(scAddress, userAddress, pollId);
    }

    smoothingFunction(scAddress: string, quorum: string): string {
        switch (governanceSmoothingFunction(scAddress)) {
            case GovernanceSmoothingFunction.CVADRATIC:
                return new BigNumber(quorum).sqrt().integerValue().toFixed();
            case GovernanceSmoothingFunction.LINEAR:
                return new BigNumber(quorum).integerValue().toFixed();
        }
    }
}