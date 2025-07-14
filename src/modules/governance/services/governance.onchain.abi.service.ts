import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ProposalVotes } from '../models/governance.proposal.votes.model';
import { GovernanceProposalModel, GovernanceProposalStatus, VoteArgs, VoteType, } from '../models/governance.proposal.model';
import { GovernanceAction } from '../models/governance.action.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { GovernanceType, toGovernanceProposalStatus, } from '../../../utils/governance';
import { TransactionModel } from '../../../models/transaction.model';
import { gasConfig, mxConfig } from '../../../config';
import BigNumber from 'bignumber.js';
import { Address, ApiNetworkProvider, DevnetEntrypoint, GovernanceConfig, GovernanceController, GovernanceTransactionsFactory, NetworkEntrypoint, ProposalInfo, Transaction, TransactionsFactoryConfig, U64Value, Vote } from '@multiversx/sdk-core/out';
import { GovernanceDescriptionService } from './governance.description.service';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { decimalToHex } from '../../../utils/token.converters';
import { ResultsParser } from 'src/utils/results.parser';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ApiService } from '@multiversx/sdk-nestjs-http';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { AxiosError } from 'axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';


@Injectable()
export class GovernanceOnChainAbiService extends GenericAbiService {
    protected type = GovernanceType.ONCHAIN;
    private governanceController: GovernanceController;
    private governanceTransactionsFactory: GovernanceTransactionsFactory;
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly apiConfigService: ApiConfigService,
        protected readonly governanceDescription: GovernanceDescriptionService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        super(mxProxy);
        this.governanceController = new GovernanceController(
            {
                chainID: mxConfig.chainID,
                networkProvider: new ApiNetworkProvider(apiConfigService.getApiUrl(), {clientName: 'governance-service'},)
            }
        )
        this.governanceTransactionsFactory = new GovernanceTransactionsFactory({
            config: new TransactionsFactoryConfig({
                chainID: mxConfig.chainID
            })
        })
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance1',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async getAddressShardID(scAddress: string): Promise<number> {
        // metachain
        return -1;
        return 4294967295;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async minFeeForPropose(scAddress: string): Promise<string> {
        //TODO: check
        return await this.minFeeForProposeRaw(scAddress);
    }

    async minFeeForProposeRaw(scAddress: string): Promise<string> {
        const { proposalFee } =  await this.governanceController.getConfig();
        return proposalFee.toString();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async quorum(scAddress: string): Promise<string> {
        return await this.quorumRaw(scAddress);
    }

    async quorumRaw(scAddress: string): Promise<string> {
        const { minQuorum } =  await this.governanceController.getConfig();
        return minQuorum.toFixed()
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingDelayInBlocks(scAddress: string): Promise<number> {
        //TODO: check
        // nr blocks before voting starts
        return await this.votingDelayInBlocksRaw(scAddress);
    }

    async votingDelayInBlocksRaw(scAddress: string): Promise<number> {
        // TODO: check
        return 2;
        // const contract = await this.mxProxy.getGovernanceSmartContract(
        //     scAddress,
        //     this.type,
        // );
        // const interaction = contract.methods.getVotingDelayInBlocks();
        // const response = await this.getGenericData(interaction);

        // return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingPeriodInBlocks(scAddress: string): Promise<number> {
        //TODO: check
        // endblock - startblock
        return await this.votingPeriodInBlocksRaw(scAddress);
    }

    async votingPeriodInBlocksRaw(scAddress: string): Promise<number> {
        // TODO: check
        return 1;
        // const contract = await this.mxProxy.getGovernanceSmartContract(
        //     scAddress,
        //     this.type,
        // );
        // const interaction = contract.methods.getVotingPeriodInBlocks();
        // const response = await this.getGenericData(interaction);

        // return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feeTokenId(scAddress: string): Promise<string> {
        return 'EGLD-000000'
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async withdrawPercentageDefeated(scAddress: string): Promise<number> {
        return await this.withdrawPercentageDefeatedRaw(scAddress);
    }

    async withdrawPercentageDefeatedRaw(scAddress: string): Promise<number> {
        const contract = await this.mxProxy.getGovernanceSmartContract(
            scAddress,
            this.type,
        );
        const interaction = contract.methods.getWithdrawPercentageDefeated();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().toNumber();
    }


    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposals(scAddress: string): Promise<GovernanceProposalModel[]> {
        return await this.proposalsRaw(scAddress);
    }

    async proposalsRaw(scAddress: string): Promise<GovernanceProposalModel[]> {
        const config = await this.governanceController.getConfig()
        let lastProposalNonce = config.lastProposalNonce;
        if(!(Number.isInteger(lastProposalNonce) && lastProposalNonce > 0)) {
            lastProposalNonce = 0;
        }

        if(lastProposalNonce > 10) {
            // early exit in case of a bug in vm query to not go into infinite loop
            lastProposalNonce = 10;
        }
        const proposalsRaw: ProposalInfo[] = [];
        for(let proposalNonce = 1; proposalNonce <= lastProposalNonce; proposalNonce++) {
            const proposal = await this.governanceController.getProposal(proposalNonce);
            proposalsRaw.push(proposal);
        }

        const feeTokenId = await this.feeTokenId(scAddress);
     
        const proposals: GovernanceProposalModel[] =  proposalsRaw.map((proposal: ProposalInfo) => {
            return this.convertProposalInfoToGovernanceModel(proposal, scAddress, config, feeTokenId)
        })

        return proposals;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalVotes(
        scAddress: string,
        proposalId: number,
    ): Promise<ProposalVotes> {
        return await this.proposalVotesRaw(scAddress, proposalId);
    }

    async proposalVotesRaw(
        scAddress: string,
        proposalId: number,
    ): Promise<ProposalVotes> {
        const proposalInfo = await this.governanceController.getProposal(proposalId);

        const upVotes = new BigNumber(proposalInfo.numYesVotes.toString());
        const downVotes = new BigNumber(proposalInfo.numNoVotes.toString());
        const downVetoVotes = new BigNumber(proposalInfo.numVetoVotes.toString());
        const abstainVotes = new BigNumber(proposalInfo.numAbstainVotes.toString());

        const totalVotes = new BigNumber(0).plus(upVotes).plus(downVotes).plus(downVetoVotes).plus(abstainVotes);


        return new ProposalVotes({
            upVotes: upVotes.toString(),
            downVotes: downVotes.toString(),
            downVetoVotes: downVetoVotes.toString(),
            abstainVotes: abstainVotes.toString(),
            totalVotes: totalVotes.toString(),
            upPercentage:
                totalVotes.comparedTo(new BigNumber(0)) > 0
                    ? upVotes
                        .div(totalVotes)
                        .multipliedBy(100)
                        .toFixed(2)
                    : '0',
            downPercentage:
                totalVotes.comparedTo(new BigNumber(0)) > 0
                    ? downVotes
                        .div(totalVotes)
                        .multipliedBy(100)
                        .toFixed(2)
                    : '0',
            abstainPercentage:
                totalVotes.comparedTo(new BigNumber(0)) > 0
                    ? abstainVotes
                        .div(totalVotes)
                        .multipliedBy(100)
                        .toFixed(2)
                    : '0',
            downVetoPercentage:
                totalVotes.comparedTo(new BigNumber(0)) > 0
                    ? downVetoVotes
                        .div(totalVotes)
                        .multipliedBy(100)
                        .toFixed(2)
                    : '0',
            quorum: proposalInfo.quorumStake.toString(),
        });
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalStatus(
        scAddress: string,
        proposalId: number,
    ): Promise<GovernanceProposalStatus> {
        return await this.proposalStatusRaw(scAddress, proposalId);
    }

    async proposalStatusRaw(
        scAddress: string,
        proposalId: number,
    ): Promise<GovernanceProposalStatus> {
       const proposalInfo: ProposalInfo = await this.governanceController.getProposal(proposalId);
        return await this.getStatusForProposal(proposalInfo);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async proposalRootHash(
        scAddress: string,
        proposalId: number,
    ): Promise<string> {
        return await this.proposalRootHashRaw(scAddress, proposalId);
    }

    async proposalRootHashRaw(
        scAddress: string,
        proposalId: number,
    ): Promise<string> {
        //TODO: check
        return 'TBD'

        // const contract = await this.mxProxy.getGovernanceSmartContract(
        //     scAddress,
        //     this.type,
        // );
        // const interaction = contract.methods.getProposalRootHash([proposalId]);
        // const response = await this.getGenericData(interaction);

        // const stringsArray = response.firstValue.valueOf().map((bn) => {
        //     return decimalToHex(bn);
        // });
        // return stringsArray.join('');
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async vote(sender: string, args: VoteArgs): Promise<TransactionModel> {
        const vote = this.voteToSdkVoteType(args.vote);
        const voteTx = this.governanceTransactionsFactory.createTransactionForVoting(new Address(sender), {
            proposalNonce: args.proposalId,
            vote,
        })
       
        return this.convertTransactionToModel(voteTx);
    }

    async userVotingPower(address: string) {
        try{
            const userVotingPower = await this.governanceController.getVotingPower(new Address(address))
            return userVotingPower.toString();
        }
        catch(error){
            if(error.message.includes(`not enough stake/delegate to vote`)) {
                return '0';
            }
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }

    private voteToSdkVoteType(voteType: VoteType) {
        switch(voteType) {
            case VoteType.UpVote:
                return Vote.YES;
            case VoteType.DownVote:
                return Vote.NO;
            case VoteType.DownVetoVote:
                return Vote.VETO;
            case VoteType.AbstainVote:
                return Vote.ABSTAIN;
            default:
                throw new BadRequestException("Invalid vote type!")
        }
    }

    private convertTransactionToModel(tx: Transaction): TransactionModel {
    return new TransactionModel({
        nonce: Number(tx.nonce),
        value: tx.value.toString(),
        sender: tx.sender.toString(),    
        receiver: tx.receiver.toString(),
        senderUsername: tx.senderUsername,
        receiverUsername: tx.receiverUsername,
        gasPrice: Number(tx.gasPrice),
        gasLimit: Number(tx.gasLimit),
        data: tx.data ? Buffer.from(tx.data).toString('base64') : undefined,
        chainID: tx.chainID,
        version: tx.version,
        options: tx.options,
        guardian: tx.guardian?.toString(),
        signature: tx.signature ? Buffer.from(tx.signature).toString('hex') : undefined,
        guardianSignature: tx.guardianSignature ? Buffer.from(tx.guardianSignature).toString('hex') : undefined,
    });
    }


    private convertProposalInfoToGovernanceModel(
    proposalInfo: ProposalInfo,
    scAddress: string,
    config: GovernanceConfig,
    feeTokenId: string,
        ): GovernanceProposalModel {
        return new GovernanceProposalModel({
            contractAddress: scAddress,
            proposalId: proposalInfo.nonce,
            proposer: proposalInfo.issuer.toBech32(),
            actions: undefined, // TODO
            description: undefined, // TODO
            feePayment:  new EsdtTokenPayment({
                        tokenIdentifier: feeTokenId,
                        tokenNonce: 0,
                        amount: proposalInfo.cost.toString(), // TODO: check
                    }),
            proposalStartBlock: proposalInfo.startVoteEpoch, // TODO
            votingPeriodInBlocks: proposalInfo.endVoteEpoch - proposalInfo.startVoteEpoch, // TODO
            votingDelayInBlocks: undefined, // TODO
            minimumQuorumPercentage: new BigNumber(config.minQuorum).div(100).toFixed(2),
            totalQuorum: proposalInfo.quorumStake.toString(),
            withdrawPercentageDefeated: undefined, // TODO
        });
    }

    private async getStatusForProposal(proposal: ProposalInfo): Promise<GovernanceProposalStatus> {
        if(proposal.isPassed){
            return GovernanceProposalStatus.Succeeded;
        }
        if(proposal.isClosed && !proposal.isPassed) {
            return GovernanceProposalStatus.Defeated;
        }
        const currentEpoch = await this.contextGetter.getCurrentEpoch()
        if(currentEpoch >= proposal.startVoteEpoch && !proposal.isClosed) {
            return GovernanceProposalStatus.Active;
        }
         if(currentEpoch < proposal.startVoteEpoch) {
            return GovernanceProposalStatus.Pending;
        }
        // TODO: add defeatead with veto
        return GovernanceProposalStatus.None;
    }

}