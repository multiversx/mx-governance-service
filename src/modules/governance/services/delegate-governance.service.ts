import { Address, AddressValue, ApiNetworkProvider, BigUIntValue, BytesValue, ContractExecuteInput, SmartContractController, SmartContractQueryInput, SmartContractTransactionsFactory, StringValue, Token, TokenTransfer, TransactionsFactoryConfig, U32Value, U64Value, Vote } from "@multiversx/sdk-core/out";
import { Injectable } from "@nestjs/common";
import { delegateStakingProviders, gasConfig, mxConfig } from "src/config";
import { ApiConfigService } from "src/helpers/api.config.service";
import { DelegateStakingProvider } from "../models/delegate-provider.model";
import BigNumber from "bignumber.js";
import { TokenService } from "src/modules/tokens/services/token.service";
import { ErrorLoggerAsync } from "@multiversx/sdk-nestjs-common";
import { GetOrSetCache } from "src/helpers/decorators/caching.decorator";
import { CacheTtlInfo } from "src/services/caching/cache.ttl.info";
import { GovernanceOnchainProvidersSnapshotsMerkleService } from "./governance.onchain.providers.snapshots.merkle.service";
import { toVoteType } from "src/utils/governance";

@Injectable()
export class DelegateGovernanceService {
    private smartContractController: SmartContractController;
    private smartContractTransactionFactory: SmartContractTransactionsFactory;

    constructor( 
        private readonly apiConfigService: ApiConfigService,
        private readonly tokenService: TokenService,
        private readonly providersMerkleTreeService: GovernanceOnchainProvidersSnapshotsMerkleService,
    ) {
       this.smartContractController = new SmartContractController(
            {
                chainID: mxConfig.chainID,
                networkProvider: new ApiNetworkProvider(apiConfigService.getApiUrl(), {clientName: 'governance-service'},)
            }
        )
        this.smartContractTransactionFactory = new SmartContractTransactionsFactory({
            config: new TransactionsFactoryConfig({
                chainID: mxConfig.chainID
            })
        })
    }

    static VOTE_POWER_FOR_NOT_IMPL = '0';

    static getDelegateStakingProviders(): DelegateStakingProvider[] {
        const providers: DelegateStakingProvider[] = delegateStakingProviders.map((provider: DelegateStakingProvider) => new DelegateStakingProvider(provider));
        return providers;
    }

     static getEnabledDelegateStakingProviders(): DelegateStakingProvider[] {
        const providers: DelegateStakingProvider[] = delegateStakingProviders.map((provider: DelegateStakingProvider) => new DelegateStakingProvider(provider));
        return providers.filter(provider => provider.isEnabled);
    }

    static getDelegateStakingProvider(voteScAddress: string): DelegateStakingProvider {
        const providers: DelegateStakingProvider[] = delegateStakingProviders.map((provider: DelegateStakingProvider) => new DelegateStakingProvider(provider));
        const targetProvider = providers.find(provider => provider.voteScAddress === voteScAddress);

        return targetProvider;
    }

    async createDelegateVoteTransaction(sender: string, voteScAddress: string, proposalId: number, vote: Vote) {
        const provider = DelegateGovernanceService.getDelegateStakingProvider(voteScAddress);
        const contractExecuteInput: ContractExecuteInput = {
            contract: new Address(provider.voteScAddress),
            gasLimit: BigInt(gasConfig.governance.vote.onChainDelegate),
            function: provider.voteFunctionName,
            arguments: [new BigUIntValue(proposalId)],
        }

        const isLiquidStaking = provider.voteScAddress !== provider.stakeScAddress;
        if(isLiquidStaking) {
            let balance = await this.providersMerkleTreeService.getAddressBalance(provider.voteScAddress, proposalId.toString(), sender);
            if(balance === '-1') {
                balance = DelegateGovernanceService.VOTE_POWER_FOR_NOT_IMPL;
            }
            // const rootHash = await this.providersMerkleTreeService.getRootHashForProvider(provider.voteScAddress, proposalId.toString());
            const proofBuffer = await this.getProofForProvider(sender, provider.voteScAddress, proposalId);
            contractExecuteInput.arguments.push(new StringValue(vote), new BigUIntValue(balance), new BytesValue(proofBuffer));
        } else {
            contractExecuteInput.arguments.push(new StringValue(vote));
        }

        const delegateVoteTx = this.smartContractTransactionFactory.createTransactionForExecute(
            new Address(sender),
            contractExecuteInput,
        )

        return delegateVoteTx;
    }
    
    async getUserVotingPowerFromDelegate(userAddress: string, scAddress: string, proposalId: number) {
        const provider = DelegateGovernanceService.getDelegateStakingProvider(scAddress);
        if(!provider.isEnabled) {
            return new BigNumber(DelegateGovernanceService.VOTE_POWER_FOR_NOT_IMPL);
        }
       
        const isLiquidStaking = provider.voteScAddress !== provider.stakeScAddress;

        if(isLiquidStaking) {
            const userVotingPower = await this.providersMerkleTreeService.getAddressBalance(provider.voteScAddress, proposalId.toString(), userAddress);
            return new BigNumber(userVotingPower);
            // const proofBuffer = await this.getProofForProvider(userAddress, provider.voteScAddress, proposalId);
            // const isUserVotigPowerCorrect = await this.confirmVotingPower(provider, proposalId, userVotingPower, proofBuffer);
            // return isUserVotigPowerCorrect ? new BigNumber(userVotingPower) : new BigNumber(DelegateGovernanceService.VOTE_POWER_FOR_NOT_IMPL);
        }

        const userVotingPower = await this.viewUserVotingPower(provider, userAddress);

        return userVotingPower;
    }

    @GetOrSetCache({
            baseKey: 'governance',
            remoteTtl: CacheTtlInfo.GithubProposals.remoteTtl,
            localTtl: CacheTtlInfo.GithubProposals.localTtl,
    })
    private async viewUserVotingPower(provider: DelegateStakingProvider, userAddress: string) {
        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(provider.voteScAddress),
            function: provider.viewUserVotingPowerName,
            arguments: [new AddressValue(new Address(userAddress))],
        }

        const resultRaw = await this.smartContractController.query(smartContractQueryInput);
        const resultHex = Buffer.from(resultRaw[0]).toString('hex');
        const userVotingPower = new BigNumber(resultHex, 16);

        return userVotingPower;
    }

    private async confirmVotingPower(provider: DelegateStakingProvider, proposal_id: number, userVotingPower: string, proof: Buffer) {
        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(provider.voteScAddress),
            function: 'confirmVotingPower',
            arguments: [new U32Value(proposal_id), new BigUIntValue(userVotingPower), new BytesValue(proof)],
        }

        const resultRaw = await this.smartContractController.query(smartContractQueryInput);
        const isUserVotingPowerCorrect = Buffer.from(resultRaw).toString() === "true"

        return isUserVotingPowerCorrect
    }

    private async getProofForProvider(userAddress: string, voteScAddress: string, proposalId: number) {
        const merkleTree = await this.providersMerkleTreeService.getMerkleTreeForProvider(voteScAddress, proposalId.toString());
        const addressLeaf = merkleTree.getUserLeaf(userAddress);
        const proofBuffer = merkleTree.getProofBuffer(addressLeaf);

        return proofBuffer;
    }

    private async getTokenBalanceForAddress(userAddress: string, tokenID: string) {
        const balance = await this.tokenService.getTokenBalanceForAddress(userAddress, tokenID);

        return new BigNumber(balance);
    }
}