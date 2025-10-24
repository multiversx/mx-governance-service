import { BadRequestException, Injectable } from "@nestjs/common";
import { GovernancePulseAbiService } from "./governance.pulse.abi.service";
import { EndPollArgs, NewIdeaArgs, NewPollArgs, PollResult, PollResults, PollStatus, IdeaInfoRaw, PulseIdeaModel, PulsePollModel, VotePollArgs, VoteUpIdeaArgs } from '../models/pulse.poll.model';
import { MXProxyService } from "src/services/multiversx-communication/mx.proxy.service";
import { GovernanceQuorumService } from "./governance.quorum.service";
import { GovernanceSmoothingFunction, governanceSmoothingFunction } from "src/utils/governance";
import BigNumber from "bignumber.js";
import { PulseComputeService } from "./pulse.compute.service";
import { ErrorLoggerAsync } from "@multiversx/sdk-nestjs-common";
import { GetOrSetCache } from "src/helpers/decorators/caching.decorator";
import { CacheTtlInfo } from "src/services/caching/cache.ttl.info";
import { GovernanceTokenSnapshotMerkleService } from "./governance.token.snapshot.merkle.service";
import moment from "moment";
import { governanceConfig } from "src/config";

@Injectable()
export class GovernancePulseService {
    static POLLS_THRESHOLD = 100; // early exit in case of a bug in vm query to not go into infinite loop
    static IDEAS_THRESHOLD = 300; // early exit in case of a bug in vm query to not go into infinite loop
    constructor(
        private readonly pulseAbiService: GovernancePulseAbiService,
        private readonly mxProxyService: MXProxyService,
        private readonly quorumService: GovernanceQuorumService,
        private readonly pulseComputeService: PulseComputeService,
        private readonly merkleTreeService: GovernanceTokenSnapshotMerkleService,
    ) {}

    async voteUpIdea(sender: string, args: VoteUpIdeaArgs) {
        const userVotingPower = await this.getUserVotingPower(args.contractAddress, sender);
        if(!(new BigNumber(userVotingPower).gt(new BigNumber(0)))) {
            throw new BadRequestException("No voting power !");
        }
        args.votingPower = userVotingPower;

        const proof = await this.getProof(args.contractAddress, sender);
        args.proof = proof;

        return this.pulseAbiService.voteUpIdea(sender, args);
    }

    async votePoll(sender: string, args: VotePollArgs) {
        // const hasUserVoted = await this.hasUserVoted(args.contractAddress, sender, args.pollId);
        const userVotingPower = await this.getUserVotingPower(args.contractAddress, sender);
        if(!(new BigNumber(userVotingPower).gt(new BigNumber(0)))) {
            throw new BadRequestException("No voting power !");
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

    async newIdea(sender: string, args: NewIdeaArgs) {
        const userVotingPower = await this.getUserVotingPower(args.contractAddress, sender);
        if(!(new BigNumber(userVotingPower).gt(new BigNumber(0)))) {
            throw new BadRequestException("No voting power !");
        }
        args.votingPower = userVotingPower;

        const ideas = await this.getIdeas(args.contractAddress);
        const ideasByUser = ideas.filter(i => i.initiator === sender);
        if (ideasByUser.length > 10) {
            throw new BadRequestException("Too many ideas created by address !");
        }

        const proof = await this.getProof(args.contractAddress, sender);
        args.proof = proof;

        return this.pulseAbiService.newIdea(sender, args);
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
        const currTime = moment().unix();
        return new PulsePollModel({
            contractAddress: scAddress,
            pollId,
            initiator: pollInfoRaw.initiator,
            options: pollInfoRaw.options,
            question: pollInfoRaw.question,
            status: pollInfoRaw.status === true && currTime < pollInfoRaw.endTime ? PollStatus.ONGOING : PollStatus.ENDED,
            pollEndTime: pollInfoRaw.endTime,
        })
    }

    async getIdeas(scAddress: string) {
        return await this.getIdeasRaw(scAddress);
    }

    async getIdeasRaw(scAddress: string) {
        const totalIdeas = await this.getTotalIdeas(scAddress);
        const promises: Promise<PulseIdeaModel>[] = [];
        for(let i = 0; i < totalIdeas && i < GovernancePulseService.IDEAS_THRESHOLD; i++) {
            promises.push(this.getIdea(scAddress, i));
        }
        return Promise.all(promises);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'pulse',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.remoteTtl,
    })
    async getIdea(scAddress: string, ideaId: number) {
        return await this.getIdeaRaw(scAddress, ideaId);
    }

    async getIdeaRaw(scAddress: string, ideaId: number) {
       const [ideaInfoRaw, totalVotesCount] = await Promise.all([
            this.pulseAbiService.getIdea(scAddress, ideaId),
            this.pulseAbiService.getIdeaVotesCount(scAddress, ideaId),
        ]);
        return new PulseIdeaModel({
            contractAddress: scAddress,
            ideaId: ideaId,
            initiator: ideaInfoRaw.initiator,
            description: ideaInfoRaw.description,
            ideaStartTime: ideaInfoRaw.ideaStartTime,
            totalVotingPower: ideaInfoRaw.voteScore,
            totalVotesCount,
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


    async getIdeaVotesTotalCount(scAddress: string, ideaId: number) {
        return await this.pulseAbiService.getIdeaVotesCount(scAddress, ideaId);
    }

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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'pulse',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async getTotalIdeas(scAddress: string) {
        return await this.getTotalIdeasRaw(scAddress);
    }

    async getTotalIdeasRaw(scAddress: string) {
        return await this.pulseAbiService.getTotalIdeas(scAddress);
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
        const currTime = moment().unix();
        return poll.status === true && currTime < poll.endTime ? PollStatus.ONGOING : PollStatus.ENDED;
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

    async hasUserVotedIdea(scAddress: string, userAddress: string, ideaId: number) {
        return await this.pulseComputeService.hasUserVotedIdea(scAddress, userAddress, ideaId);
    }

    async getUserVotingOption(scAddress: string, userAddress: string, pollId: number) {
        return await this.pulseComputeService.getUserVotePulse(scAddress, userAddress, pollId);
    }

    async getIndexForPoll(scAddress: string, pollId: number) {
        const scAddresses: string[] = governanceConfig.pulse.linear;
        const scIndex = scAddresses.indexOf(scAddress);
        let index = 0;
        for(let i = 0; i < scIndex; i++) {
            index += await this.getTotalPolls(scAddresses[i]);
        }
        return index + pollId;
    }


    async getIndexForIdea(scAddress: string, ideaId: number) {
        const scAddresses: string[] = governanceConfig.pulse.linear;
        const scIndex = scAddresses.indexOf(scAddress);
        let index = 0;
        for(let i = 0; i < scIndex; i++) {
            index += await this.getTotalIdeas(scAddresses[i]);
        }
        return index + ideaId;
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