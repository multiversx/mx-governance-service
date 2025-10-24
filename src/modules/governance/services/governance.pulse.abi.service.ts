import { Abi, Address, ApiNetworkProvider, ArrayVec, ArrayVecType, BigUIntValue, BytesValue, SmartContractController, SmartContractQueryInput, SmartContractTransactionsFactory, StringType, StringValue, TransactionsFactoryConfig, U32Value } from "@multiversx/sdk-core/out";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ApiConfigService } from "src/helpers/api.config.service";
import { GovernanceType } from "src/utils/governance";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { gasConfig, mxConfig } from "src/config";
import { EndPollArgs, NewIdeaArgs, NewPollArgs, PollInfoRaw, IdeaInfoRaw, VotePollArgs, VoteUpIdeaArgs } from '../models/pulse.poll.model';
import pulseScAbi from '../../../abis/pulse-sc.abi.json';
import BigNumber from "bignumber.js";

@Injectable()
export class GovernancePulseAbiService  {
    protected type = GovernanceType.PULSE;
    private controller: SmartContractController;
    private transactionFactory: SmartContractTransactionsFactory;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const abi = Abi.create(pulseScAbi);
        this.controller = new SmartContractController(
            {
                chainID: mxConfig.chainID,
                networkProvider: new ApiNetworkProvider(apiConfigService.getApiUrl(), {clientName: 'pulse-service'}),
                abi,
            }
        )
        this.transactionFactory = new SmartContractTransactionsFactory({
            config: new TransactionsFactoryConfig({
                chainID: mxConfig.chainID
            }),
        })
    }


    newPoll(sender: string, args: NewPollArgs){ 
        const arrayVecType = new ArrayVecType(args.options.length, new StringType());
        const contractExecuteInput = {
            contract: new Address(args.contractAddress),
            function: 'newPoll',
            gasLimit: BigInt(10_000_000), // TODO adjust gas limit
            arguments: [new StringValue(args.question), new ArrayVec(arrayVecType, args.options.map(option => new StringValue(option))), new U32Value(args.duration)],
        };
        const tx = this.transactionFactory.createTransactionForExecute(new Address(sender), contractExecuteInput);

        return tx.toPlainObject();
    }

    newIdea(sender: string, args: NewIdeaArgs){
        const contractExecuteInput = {
            contract: new Address(args.contractAddress),
            function: 'newProposal',
            gasLimit: BigInt(gasConfig.governance.vote.tokenSnapshot),
            arguments: [new StringValue(args.description), new BigUIntValue(args.votingPower), new BytesValue(args.proof)],
        };
        const tx = this.transactionFactory.createTransactionForExecute(new Address(sender), contractExecuteInput);

        return tx.toPlainObject();
    }

    endPoll(sender: string, args: EndPollArgs){ 
        const contractExecuteInput = {
            contract: new Address(args.contractAddress),
            function: 'endPoll',
            gasLimit: BigInt(10_000_000), // TODO adjust gas limit
            arguments: [new U32Value(args.pollId)],
        };
        const tx = this.transactionFactory.createTransactionForExecute(new Address(sender), contractExecuteInput);

        return tx.toPlainObject();
    }

    votePoll(sender: string, args: VotePollArgs){ 
        const contractExecuteInput = {
            contract: new Address(args.contractAddress),
            function: 'vote_poll',
            gasLimit: BigInt(gasConfig.governance.vote.tokenSnapshot),
            arguments: [new U32Value(args.pollId), new U32Value(args.optionId), new BigUIntValue(args.votingPower), new BytesValue(args.proof)],
        };
        const tx = this.transactionFactory.createTransactionForExecute(new Address(sender), contractExecuteInput);

        return tx.toPlainObject();
    }

    voteUpIdea(sender: string, args: VoteUpIdeaArgs){
        const contractExecuteInput = {
            contract: new Address(args.contractAddress),
            function: 'vote_up_proposal',
            gasLimit: BigInt(gasConfig.governance.vote.tokenSnapshot),
            arguments: [new U32Value(args.ideaId), new BigUIntValue(args.votingPower), new BytesValue(args.proof)],
        };
        const tx = this.transactionFactory.createTransactionForExecute(new Address(sender), contractExecuteInput);

        return tx.toPlainObject();
    }


    async getPoll(contractAddress: string, pollId: number) {
        const contractQueryInput = {
            contract: new Address(contractAddress),
            function: "getPoll",
            arguments: [new U32Value(pollId)],
        };

        const query =  this.controller.createQuery(contractQueryInput);
        const responseRaw = await this.controller.runQuery(query);
        const response = this.controller.parseQueryResponse(responseRaw)[0];
      
        const pollInfoRaw = new PollInfoRaw({
          initiator: new Address(response.initiator).toBech32(),
          question: Buffer.from(response.question).toString(),
          options: response.options.map(option => Buffer.from(option).toString()),
          voteScore: response.vote_score.map(vote_score => Buffer.from(vote_score).toString()),
          endTime: parseInt(new BigNumber(response.end_time).toString()),
          status: response.status
        })
        
        return pollInfoRaw;
    
    }

    async getIdea(contractAddress: string, pollId: number) {
        const contractQueryInput = {
            contract: new Address(contractAddress),
            function: "getProposal",
            arguments: [new U32Value(pollId)],
        };

        const query =  this.controller.createQuery(contractQueryInput);
        const responseRaw = await this.controller.runQuery(query);
        const response = this.controller.parseQueryResponse(responseRaw)[0];

        const ideaInfoRaw = new IdeaInfoRaw({
            initiator: new Address(response.initiator).toBech32(),
            description: Buffer.from(response.description).toString(),
            voteScore: response.vote_score.toString(),
            ideaStartTime: parseInt(new BigNumber(response.propose_time).toString())
        })

        return ideaInfoRaw;

    }

      async confirmVotingPower(scAddress: string, userVotingPower: string, proof: Buffer) {
        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(scAddress),
            function: 'confirmVotingPower',
            arguments: [new BigUIntValue(userVotingPower), new BytesValue(proof)],
        }

        const query = this.controller.createQuery(smartContractQueryInput);
        const responseRaw = await this.controller.runQuery(query);

        const response = this.controller.parseQueryResponse(responseRaw);

        return response[0];
    }

    async getTotalVotes(scAddress: string, pollId: number) {
        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(scAddress),
            function: 'getTotalPollVotes',
            arguments: [new U32Value(pollId)],
        }

        const query = this.controller.createQuery(smartContractQueryInput);
        const responseRaw = await this.controller.runQuery(query);

        const response = this.controller.parseQueryResponse(responseRaw);

        return new BigNumber(response[0]).toNumber();
    }

    async getPollVotesCount(scAddress: string, pollId: number, optionId: number) {
        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(scAddress),
            function: 'getPollVotes',
            arguments: [new U32Value(pollId), new U32Value(optionId)],
        }

        const query = this.controller.createQuery(smartContractQueryInput);
        const responseRaw = await this.controller.runQuery(query);

        const response = this.controller.parseQueryResponse(responseRaw);
        return new BigNumber(response[0]).toNumber();
    }

    async getIdeaVotesCount(scAddress: string, ideaId: number) {
        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(scAddress),
            function: 'getProposalVoteUps',
            arguments: [new U32Value(ideaId)],
        }
        
        const query = this.controller.createQuery(smartContractQueryInput);
        const responseRaw = await this.controller.runQuery(query);

        const response = this.controller.parseQueryResponse(responseRaw);
        
        return new BigNumber(response[0]).toNumber();
    }

    async getTotalPolls(scAddress: string) {
        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(scAddress),
            function: 'getNextAvailablePollIndex',
            arguments: [],
        }

        const query = this.controller.createQuery(smartContractQueryInput);
        const responseRaw = await this.controller.runQuery(query);

        const response = this.controller.parseQueryResponse(responseRaw);

        return new BigNumber(response[0]).toNumber();
    }

    async getTotalIdeas(scAddress: string) {
        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(scAddress),
            function: 'getNextAvailableProposalIndex',
            arguments: [],
        }

        const query = this.controller.createQuery(smartContractQueryInput);
        const responseRaw = await this.controller.runQuery(query);

        const response = this.controller.parseQueryResponse(responseRaw);

        return new BigNumber(response[0]).toNumber();
    }

    async getRootHash(scAddress: string) {
        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(scAddress),
            function: 'getRootHash',
            arguments: [],
        }

        const query = this.controller.createQuery(smartContractQueryInput);
        const responseRaw = await this.controller.runQuery(query);

        const response = this.controller.parseQueryResponse(responseRaw);
        return this.decodeBytesArrayToHash(response[0])
    }

    private decodeBytesArrayToHash(arr: BigNumber[]): string {
        const hex= arr.map(bn => {
                const byte = bn.toNumber();        // 0..255 from BigNumber type
                return byte.toString(16).padStart(2, "0"); // 1 byte = 2 hex characters
            }).join("");
        
        return hex;
    }
}