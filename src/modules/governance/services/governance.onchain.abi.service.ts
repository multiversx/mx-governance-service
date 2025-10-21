import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ProposalVotes } from '../models/governance.proposal.votes.model';
import { CloseProposalArgs, CreateDelegateVoteArgs, CreateProposalArgs, DescriptionV2, GovernanceProposalModel, GovernanceProposalStatus, VoteArgs, VoteType, } from '../models/governance.proposal.model';
import { GovernanceAction } from '../models/governance.action.model';
import { EsdtTokenPaymentModel } from '../../tokens/models/esdt.token.payment.model';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { GovernanceType, toGovernanceProposalStatus, } from '../../../utils/governance';
import { TransactionModel } from '../../../models/transaction.model';
import { gasConfig, mxConfig, onChainFAQ, scAddress } from '../../../config';
import BigNumber from 'bignumber.js';
import { Address, ApiNetworkProvider, DevnetEntrypoint, GovernanceConfig, GovernanceController, GovernanceTransactionsFactory, NetworkEntrypoint, Transaction, TransactionsFactoryConfig, U64Value, Vote } from '@multiversx/sdk-core/out';
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
import { ProposalInfoModel } from '../models/proposal.info.model';
import { GovernanceConfigModel } from '../models/governance.config.model';
import { DelegateGovernanceService } from './delegate-governance.service';
import { DelegateUserVotingPower } from '../models/delegate-provider.model';
import { GovernanceComputeService } from './governance.compute.service';
import { GithubService } from './github.service';
import { PaginationArgs } from '../models/pagination.model';

@Injectable()
export class GovernanceOnChainAbiService extends GenericAbiService {
    static PROPOSAL_NONCE_THRESHOLD = 200; // early exit in case of a bug in vm query to not go into infinite loop

    protected type = GovernanceType.ONCHAIN;
    private governanceController: GovernanceController;
    private governanceTransactionsFactory: GovernanceTransactionsFactory;
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly apiConfigService: ApiConfigService,
        protected readonly governanceDescription: GovernanceDescriptionService,
        private readonly contextGetter: ContextGetterService,
        private readonly delegateGovernanceService: DelegateGovernanceService,
        private readonly governanceComputeService: GovernanceComputeService,
        @Inject(forwardRef(() => GithubService))
        private readonly githubService: GithubService,
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

    async getAddressShardID(scAddress: string): Promise<string> {
        // metachain
        return '4294967295';
    }

    async minFeeForPropose(scAddress: string): Promise<string> {
        return await this.minFeeForProposeRaw(scAddress);
    }

    async minFeeForProposeRaw(scAddress: string): Promise<string> {
        const { proposalFee } = await this.getConfig();
        return proposalFee.toString();
    }

    async quorum(scAddress: string): Promise<string> {
        return await this.quorumRaw(scAddress);
    }

    async quorumRaw(scAddress: string): Promise<string> {
        const { minQuorum } =  await this.getConfig();
        return minQuorum.toFixed()
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingDelayInBlocks(scAddress: string): Promise<number> {
        //TODO: should not be called
        // nr blocks before voting starts
        return await this.votingDelayInBlocksRaw(scAddress);
    }

    async votingDelayInBlocksRaw(scAddress: string): Promise<number> {
        return 0;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async votingPeriodInBlocks(scAddress: string): Promise<number> {
        //TODO: should not be called
        // endblock - startblock
        return await this.votingPeriodInBlocksRaw(scAddress);
    }

    async votingPeriodInBlocksRaw(scAddress: string): Promise<number> {
        // TODO: check
        return 0;
    }
W
    async feeTokenId(scAddress: string): Promise<string> {
        return 'EGLD-000000'
    }

    async totalOnChainProposals() {
        const { lastProposalNonce } = await this.getConfig();
        return lastProposalNonce;
    }

    async withdrawPercentageDefeated(scAddress: string): Promise<number> {
        return await this.withdrawPercentageDefeatedRaw(scAddress);
    }

    async withdrawPercentageDefeatedRaw(scAddress: string): Promise<number> {
        const {lostProposalFee, proposalFee} = await this.getConfig()
        return Number(new BigNumber(lostProposalFee.toString()).multipliedBy(new BigNumber(100)).dividedBy(new BigNumber(proposalFee.toString())).toFixed());
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
        const config = await this.getConfig()
        let lastProposalNonce = config.lastProposalNonce;
        if(!(Number.isInteger(lastProposalNonce) && lastProposalNonce > 0)) {
            lastProposalNonce = 0;
        }

        if(lastProposalNonce > GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD) {
            lastProposalNonce = GovernanceOnChainAbiService.PROPOSAL_NONCE_THRESHOLD;
        }

        const proposalsRaw: ProposalInfoModel[] = [];
        
        for(let proposalNonce = 1; proposalNonce <= lastProposalNonce; proposalNonce++) {
            const proposal = await this.getProposal(proposalNonce);
            proposalsRaw.push(proposal);
        }
     
        const proposalsConversionPromises: Promise<GovernanceProposalModel>[] =  proposalsRaw.map((proposal: ProposalInfoModel) => {
            return this.convertProposalInfoToGovernanceModel(proposal, scAddress, config)
        })

        return await Promise.all(proposalsConversionPromises);
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
        const proposalInfo = await this.getProposal(proposalId);

        const upVotes = new BigNumber(proposalInfo.numYesVotes);
        const downVotes = new BigNumber(proposalInfo.numNoVotes);
        const downVetoVotes = new BigNumber(proposalInfo.numVetoVotes);
        const abstainVotes = new BigNumber(proposalInfo.numAbstainVotes);

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
       const proposalInfo: ProposalInfoModel = await this.getProposal(proposalId);
        return await this.getStatusForProposal(proposalInfo);
    }

    async proposalRootHash(
        scAddress: string,
        proposalId: number,
    ): Promise<string> {
        return '';
    }


    @ErrorLoggerAsync({
        logArgs: true,
    })
    async createDelegateVoteTransaction(sender: string, args: CreateDelegateVoteArgs): Promise<TransactionModel> {
        const vote = this.voteToSdkVoteType(args.vote);
        const createDelegateVoteTx = await this.delegateGovernanceService.createDelegateVoteTransaction(
            sender,
            args.delegateContractAddress,
            args.proposalId,
            vote,
        )
       
        return this.convertTransactionToModel(createDelegateVoteTx);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async createProposal(sender: string, args: CreateProposalArgs): Promise<TransactionModel> {
        const createProposalTx = this.governanceTransactionsFactory.createTransactionForNewProposal(new Address(sender), {
            commitHash: args.commitHash,
            startVoteEpoch: args.startVoteEpoch,
            endVoteEpoch: args.endVoteEpoch,
            nativeTokenAmount: BigInt(args.nativeTokenAmount),
        })
       
        return this.convertTransactionToModel(createProposalTx);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async closeProposal(sender: string, args: CloseProposalArgs): Promise<TransactionModel> {
        const closeProposalTx = this.governanceTransactionsFactory.createTransactionForClosingProposal(new Address(sender), {
            proposalNonce: args.proposalId,
        })
       
        return this.convertTransactionToModel(closeProposalTx);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async vote(sender: string, args: VoteArgs): Promise<TransactionModel[]> {
        const vote = this.voteToSdkVoteType(args.vote);
        const delegateUserVotingPowers = await this.delegateUserVotingPowers(sender, args.proposalId);
        const voteTxs: TransactionModel[] = [];
        for(const providerInfo of delegateUserVotingPowers) {
            const hasVoted = providerInfo.hasVoted;
            const userVotingPower = providerInfo.userVotingPower;
            if(!hasVoted && userVotingPower !== '0') {
                const voteTx = await this.createDelegateVoteTransaction(sender, {
                        contractAddress: args.contractAddress,
                        delegateContractAddress: providerInfo.scAddress,
                        proposalId: args.proposalId,
                        vote: args.vote,
                });
                voteTxs.push(voteTx);
            }
        }

        const voteType = await this.governanceComputeService.getUserVoteOnChain(args.contractAddress, sender, args.proposalId);
        const userVotingPowerDirect = await this.userVotingPowerDirect(sender, args.proposalId);
        if(voteType === VoteType.NotVoted && userVotingPowerDirect !== '0') {
            const voteTx = this.governanceTransactionsFactory.createTransactionForVoting(new Address(sender), {
                        proposalNonce: args.proposalId,
                        vote,
                    })
            voteTx.gasLimit = BigInt(gasConfig.governance.vote.onChainDelegate); // TODO: should be removed when the gas limit is set in the sdk
            voteTxs.push(this.convertTransactionToModel(voteTx))
        }
       
       
        return voteTxs;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.DynamicInfo.remoteTtl,
        localTtl: CacheTtlInfo.DynamicInfo.localTtl,
    })
    async userVotingPowerDirect(address: string, proposalId: number) {
        try{
            const userVotingPowerDirectRaw = await this.governanceController.getVotingPower(new Address(address))

            return userVotingPowerDirectRaw.toString();
        } catch(error) {
            if(error.message.includes(`not enough stake/delegate to vote`)) {
                return '0';
            }
            this.logger.error(error);
            throw error;
        }
    }

    async userVotingPower(address: string, proposalId: number) {
        try{
            const userVotingPowerNormalRaw = await this.userVotingPowerDirect(address, proposalId);
            const userVotingPowerNormal = new BigNumber(userVotingPowerNormalRaw);

            
            const delegateUserVotingPowers = await this.delegateUserVotingPowers(address, proposalId);

            const userVotingPowerDelegate = delegateUserVotingPowers.reduce(
                (acc, curr) => acc.plus(new BigNumber(curr.userVotingPower)),
                new BigNumber(0)
            );
            const userVotingPowerTotal = userVotingPowerNormal.plus(userVotingPowerDelegate);
           
            return userVotingPowerTotal.toString();
        } catch(error){
            if(error.message.includes(`not enough stake/delegate to vote`)) {
                return '0';
            }
            this.logger.error(error);
            throw error;
        }
    }

    @ErrorLoggerAsync()
    async delegateUserVotingPowers(address: string, proposalId: number): Promise<DelegateUserVotingPower[]> {
        return await this.delegateUserVotingPowersRaw(address, proposalId);
    }
    
    async delegateUserVotingPowersRaw(address: string, proposalId: number): Promise<DelegateUserVotingPower[]> {
            const providers = DelegateGovernanceService.getDelegateStakingProviders();

            const promises = providers.map(provider => this.delegateGovernanceService.getUserVotingPowerFromDelegate(address, provider.voteScAddress, proposalId))
            const resolvedPromises = await Promise.all(promises);
            
            const allDelegateVotingPowers = await Promise.all(providers.map(
                async (provider, idx) => {
                    try {
                        const userVotingPower = resolvedPromises[idx].toString();
                        let userVoteType = VoteType.NotVoted;
                        if(provider.isEnabled) {
                            userVoteType = await this.governanceComputeService.getUserVoteOnChain(provider.stakeScAddress, address, proposalId);
                        }

                        return new DelegateUserVotingPower({
                            providerName: provider.providerName,
                            scAddress: provider.voteScAddress,
                            lsTokenId: provider.lsTokenId,
                            userVotingPower: userVotingPower === '-1' ? DelegateGovernanceService.VOTE_POWER_FOR_NOT_IMPL : userVotingPower,
                            isEnabled: userVotingPower === '-1' ? false : provider.isEnabled,
                            hasVoted: userVoteType !== VoteType.NotVoted,
                            userVoteType,
                        });
                    } catch (error) {
                        this.logger.error(`Failed to get voting power for address: ${address} and provider: ${provider.providerName}`, error);
                        throw error;
                    }
                }));

            return allDelegateVotingPowers;
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


    private async convertProposalInfoToGovernanceModel(
        proposalInfo: ProposalInfoModel,
        scAddress: string,
        config: GovernanceConfigModel,
            ): Promise<GovernanceProposalModel> {
            const feeTokenId = await this.feeTokenId(scAddress);
            const [startEpochRound, roundsLeftUntilEpoch] = await Promise.all([ 
                this.contextGetter.getStartEpochRound(proposalInfo.startVoteEpoch),
                this.contextGetter.getRoundsLeftUntilEpoch(proposalInfo.startVoteEpoch)
                ]);
            const {roundsPerEpoch} = await this.contextGetter.getStats();
            const voteTimeInEpochs = (proposalInfo.endVoteEpoch + 1) - proposalInfo.startVoteEpoch;
            const votingPeriodInRounds = voteTimeInEpochs * roundsPerEpoch;
            const withdrawPercentageDefeated = await this.withdrawPercentageDefeated(scAddress);
            const description = await this.githubService.getDescription(proposalInfo.commitHash);
            const status = await this.proposalStatus(scAddress,proposalInfo.nonce);
            const shardId = await this.getAddressShardID(scAddress);
            const startVoteTimestamp = await this.contextGetter.getFirstBlockTimestampByEpochAndShard(proposalInfo.startVoteEpoch, shardId);
            const endVoteTimestamp = await this.contextGetter.getFirstBlockTimestampByEpochAndShard(proposalInfo.endVoteEpoch + 1, shardId);
            const totalQuorum = await this.getTotalQuorum();
            const proposalFaq = onChainFAQ.find(faq => faq.onChainId === proposalInfo.nonce);
            
            return new GovernanceProposalModel({
                contractAddress: scAddress,
                proposalId: proposalInfo.nonce,
                proposalIndex: proposalInfo.nonce + mxConfig.existingProposals, // existing proposals before onchain governance
                proposer: proposalInfo.issuer,
                description,
                feePayment: new EsdtTokenPayment({
                                tokenIdentifier: feeTokenId,
                                tokenNonce: 0,
                                amount: proposalInfo.cost,
                            }),
                proposalStartBlock: startEpochRound + 10, // TODO: check
                votingPeriodInBlocks: votingPeriodInRounds,
                votingDelayInBlocks: roundsLeftUntilEpoch > 0 ? roundsLeftUntilEpoch + 10 : 0, // TODO: check
                minimumQuorumPercentage: new BigNumber(config.minQuorum).div(100).toFixed(2),
                totalQuorum,
                withdrawPercentageDefeated,
                commitHash: proposalInfo.commitHash,
                status,
                startVoteTimestamp,
                endVoteTimestamp,
                faq: proposalFaq ? proposalFaq.faq : undefined,
            });
    }

    async getStatusForProposal(proposal: ProposalInfoModel): Promise<GovernanceProposalStatus> {
        if(proposal.isPassed){
            return GovernanceProposalStatus.Succeeded;
        }
        if(proposal.isClosed && !proposal.isPassed) {
            return GovernanceProposalStatus.Defeated;
        }
        const currentEpoch = await this.contextGetter.getCurrentEpoch()
        if(currentEpoch >= proposal.startVoteEpoch && currentEpoch <= proposal.endVoteEpoch && !proposal.isClosed ) {
            return GovernanceProposalStatus.Active;
        }
        if(currentEpoch > proposal.endVoteEpoch && !proposal.isClosed) {
            return GovernanceProposalStatus.PendingClose;
        }
        if(currentEpoch < proposal.startVoteEpoch) {
            return GovernanceProposalStatus.Pending;
        }
 
        return GovernanceProposalStatus.None;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async getConfig(): Promise<GovernanceConfigModel> {
        return await this.getConfigRaw();
    }

    async getConfigRaw(): Promise<GovernanceConfigModel> {
        const config = await this.governanceController.getConfig();
        const stringifiedConfig = this.convertToRedisTypes(config);
        // we can't serialize bigint in order to store obj in redis
        return stringifiedConfig;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async getProposal(proposalId: number): Promise<ProposalInfoModel> {
        return await this.getProposalRaw(proposalId);
    }

    async getProposalRaw(proposalId: number): Promise<ProposalInfoModel> {
        const proposal = await this.governanceController.getProposal(proposalId);
        const stringifiedProposal = this.convertToRedisTypes(proposal);
        // we can't serialize bigint in order to store obj in redis
        return stringifiedProposal;
    }

    private convertToRedisTypes(obj: any): any {
        if (typeof obj === 'bigint') {
            return obj.toString();
        }
        if(typeof obj === 'object' && obj instanceof Address) {
            return obj.toBech32();
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertToRedisTypes(item));
        }

        if (obj !== null && typeof obj === 'object') {
            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.convertToRedisTypes(value);
            }
            return result;
        }

        return obj;
    }

    private async getTotalQuorum() {
        return await this.contextGetter.getTotalQuorum();
    }
}