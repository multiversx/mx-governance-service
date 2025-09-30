import { Abi, AbiRegistry, Address, ApiNetworkProvider, ArrayVec, ArrayVecType, BigUIntValue, BytesValue, DevnetEntrypoint, GovernanceController, GovernanceTransactionsFactory, MainnetEntrypoint, NetworkEntrypoint, SmartContractController, SmartContractQueryInput, SmartContractTransactionsFactory, StringType, StringValue, TestnetEntrypoint, TransactionsFactoryConfig, U32Value } from "@multiversx/sdk-core/out";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ApiConfigService } from "src/helpers/api.config.service";
import { ContextGetterService } from "src/services/context/context.getter.service";
import { GovernanceType } from "src/utils/governance";
import { GovernanceComputeService } from "./governance.compute.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { mxConfig } from "src/config";
import { EndPollArgs, NewPollArgs, PollInfoRaw, PulsePollModel, VotePollArgs } from "../models/pulse.poll.model";
import pulseScAbi from '../../../abis/pulse-sc.abi.json';
import BigNumber from "bignumber.js";

@Injectable()
export class GovernancePulseAbiService  {
    protected type = GovernanceType.PULSE;
    private controller: SmartContractController;
    private transactionFactory: SmartContractTransactionsFactory;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        private readonly contextGetter: ContextGetterService,
        private readonly governanceComputeService: GovernanceComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const abi = Abi.create(pulseScAbi);
        const entrypoint = this.getEntrypointByChainId(mxConfig.chainID) 
        this.controller = entrypoint.createSmartContractController(abi);
        this.transactionFactory = entrypoint.createSmartContractTransactionsFactory();
    }

    private getEntrypointByChainId(chainID: string) {
        switch(chainID) {
            case "T":
                return new TestnetEntrypoint();
            case "D":
                return new DevnetEntrypoint();
            case "1":
                return new MainnetEntrypoint();
        }
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
            function: 'votePoll',
            gasLimit: BigInt(10_000_000), // TODO adjust gas limit
            arguments: [new U32Value(args.pollId), new U32Value(args.optionId), new BigUIntValue(args.votingPower), new BytesValue(Buffer.from(args.proof))],
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
            function: 'getTotalVotes',
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
}