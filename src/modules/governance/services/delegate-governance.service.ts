import { Address, AddressValue, ApiNetworkProvider, BigUIntValue, BytesValue, ContractExecuteInput, SmartContractController, SmartContractQueryInput, SmartContractTransactionsFactory, StringValue, Token, TokenTransfer, TransactionsFactoryConfig, Vote } from "@multiversx/sdk-core/out";
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
            gasLimit: gasConfig.governance.vote.onChainDelegate,
            function: provider.voteFunctionName,
            arguments: [new BigUIntValue(proposalId), new StringValue(vote)],
        }

        const isLiquidStaking = provider.voteScAddress !== provider.stakeScAddress;
        if(isLiquidStaking) {
            const balance = await this.providersMerkleTreeService.getAddressBalance(provider.voteScAddress, proposalId.toString(), sender);
            const rootHash = await this.providersMerkleTreeService.getRootHashForProvider(provider.voteScAddress, proposalId.toString());
            contractExecuteInput.arguments.push(new BigUIntValue(balance), new BytesValue(Buffer.from(rootHash, 'hex')));
        }

        const delegateVoteTx = this.smartContractTransactionFactory.createTransactionForExecute(
            new Address(sender),
            contractExecuteInput,
        )

        return delegateVoteTx;
    }
    
    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async getUserVotingPowerFromDelegate(userAddress: string, scAddress: string, proposalId: number) {
        const provider = DelegateGovernanceService.getDelegateStakingProvider(scAddress);
        if(!provider.isEnabled) {
            return new BigNumber(DelegateGovernanceService.VOTE_POWER_FOR_NOT_IMPL);
        }
       
        const isLiquidStaking = provider.voteScAddress !== provider.stakeScAddress;
        let args: any[] = [new AddressValue(new Address(userAddress))];
        if(isLiquidStaking) {
            const balance = await this.providersMerkleTreeService.getAddressBalance(provider.voteScAddress, proposalId.toString(), userAddress);
            if(balance === '0') {
                return new BigNumber(DelegateGovernanceService.VOTE_POWER_FOR_NOT_IMPL);
            }
            return new BigNumber(balance);
        }

        const smartContractQueryInput: SmartContractQueryInput = {
            contract: new Address(scAddress),
            function: provider.viewUserVotingPowerName,
            arguments: args,
        }
        const resultRaw = await this.smartContractController.query(smartContractQueryInput);
        const resultHex = Buffer.from(resultRaw[0]).toString('hex');
        const userVotingPower = new BigNumber(resultHex, 16);
        
        return userVotingPower;
    }

    private async getTokenBalanceForAddress(userAddress: string, tokenID: string) {
        const balance = await this.tokenService.getTokenBalanceForAddress(userAddress, tokenID);

        return new BigNumber(balance);
    }
}