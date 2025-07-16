import { Address, ApiNetworkProvider, BigUIntValue, DevnetEntrypoint, NetworkEntrypoint, SmartContractController, SmartContractTransactionsFactory, StringValue, Token, TokenTransfer, TransactionsFactoryConfig, Vote } from "@multiversx/sdk-core/out";
import { BadRequestException, Injectable } from "@nestjs/common";
import { delegateStakingProviders, gasConfig, mxConfig } from "src/config";
import { ApiConfigService } from "src/helpers/api.config.service";
import { DelegateStakingProvider } from "../models/delegate-provider.model";
import BigNumber from "bignumber.js";

@Injectable()
export class DelegateGovernanceService {
    private smartContractController: SmartContractController;
    private smartContractTransactionFactory: SmartContractTransactionsFactory;
    private entryPoint: NetworkEntrypoint;
    constructor( 
        private readonly apiConfigService: ApiConfigService,
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

    static getDelegateStakingProviders(): DelegateStakingProvider[] {
        const providers: DelegateStakingProvider[] = delegateStakingProviders.map((provider: DelegateStakingProvider) => new DelegateStakingProvider(provider));
        return providers;
    }

    static getDelegateStakingProvider(scAddress: string): DelegateStakingProvider {
        const providers: DelegateStakingProvider[] = delegateStakingProviders.map((provider: DelegateStakingProvider) => new DelegateStakingProvider(provider));
        const targetProvider = providers.find(provider => provider.scAddress === scAddress);

        return targetProvider;
    }

    async createDelegateVoteTransaction(sender: string, scAddress: string, proposalId: number, vote: Vote) {
        const provider = DelegateGovernanceService.getDelegateStakingProvider(scAddress);
        const balance = await this.getTokenBalanceForAddress(sender, provider.lsTokenId);
        const contractExecuteInput = {
            contract: new Address(scAddress),
            gasLimit: gasConfig.governance.vote.onChainDelegate,
            function: provider.voteFunctionName,
            arguments: [new BigUIntValue(proposalId), new StringValue(vote)],
            tokenTransfers: [new TokenTransfer({ token: new Token({identifier: provider.lsTokenId}), amount: BigInt(balance)})],
        }
        const delegateVoteTx = this.smartContractTransactionFactory.createTransactionForExecute(
            new Address(sender),
           contractExecuteInput,
        )

        return delegateVoteTx;
    }
    
    async getUserVotingPowerFromDelegate(userAddress: string, scAddress: string) {
        // TODO: add args
        const provider = DelegateGovernanceService.getDelegateStakingProvider(scAddress);
        const result = await this.smartContractController.query({
            caller: new Address(userAddress),
            contract: new Address(scAddress),
            function: provider.scAddress,
            arguments: []
        });
        const userVotingPower = result[0] as BigNumber;
        return userVotingPower;
    }

    private async getTokenBalanceForAddress(address: string, tokenId: string) {
        //TODO: fetch from API
        return 10;
    }
}