import { Address, AddressValue, ApiNetworkProvider, BigUIntValue, ContractExecuteInput, SmartContractController, SmartContractQueryInput, SmartContractTransactionsFactory, StringValue, Token, TokenTransfer, TransactionsFactoryConfig, Vote } from "@multiversx/sdk-core/out";
import { Injectable } from "@nestjs/common";
import { delegateStakingProviders, gasConfig, mxConfig } from "src/config";
import { ApiConfigService } from "src/helpers/api.config.service";
import { DelegateStakingProvider } from "../models/delegate-provider.model";
import BigNumber from "bignumber.js";
import { TokenService } from "src/modules/tokens/services/token.service";

@Injectable()
export class DelegateGovernanceService {
    private smartContractController: SmartContractController;
    private smartContractTransactionFactory: SmartContractTransactionsFactory;

    constructor( 
        private readonly apiConfigService: ApiConfigService,
        private readonly tokenService: TokenService,
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

    static VOTE_POWER_FOR_NOT_IMPL = '-1';

    static getDelegateStakingProviders(): DelegateStakingProvider[] {
        const providers: DelegateStakingProvider[] = delegateStakingProviders.map((provider: DelegateStakingProvider) => new DelegateStakingProvider(provider));
        return providers;
    }

     static getEnabledDelegateStakingProviders(): DelegateStakingProvider[] {
        const providers: DelegateStakingProvider[] = delegateStakingProviders.map((provider: DelegateStakingProvider) => new DelegateStakingProvider(provider));
        return providers.filter(provider => provider.isEnabled);
    }

    static getDelegateStakingProvider(scAddress: string): DelegateStakingProvider {
        const providers: DelegateStakingProvider[] = delegateStakingProviders.map((provider: DelegateStakingProvider) => new DelegateStakingProvider(provider));
        const targetProvider = providers.find(provider => provider.scAddress === scAddress);

        return targetProvider;
    }

    async createDelegateVoteTransaction(sender: string, scAddress: string, proposalId: number, vote: Vote) {
        const provider = DelegateGovernanceService.getDelegateStakingProvider(scAddress);

        const contractExecuteInput: ContractExecuteInput = {
            contract: new Address(scAddress),
            gasLimit: gasConfig.governance.vote.onChainDelegate,
            function: provider.voteFunctionName,
            arguments: [new BigUIntValue(proposalId), new StringValue(vote)],
        }

        const isLiquidStaking = provider.lsTokenId !== '' && provider.lsTokenId;
        if(isLiquidStaking) {
            const balance = await this.getTokenBalanceForAddress(sender, provider.lsTokenId);
            contractExecuteInput.tokenTransfers = [new TokenTransfer({ token: new Token({identifier: provider.lsTokenId}), amount: BigInt(balance.toString())})];
        }

        const delegateVoteTx = this.smartContractTransactionFactory.createTransactionForExecute(
            new Address(sender),
            contractExecuteInput,
        )

        return delegateVoteTx;
    }
    
    async getUserVotingPowerFromDelegate(userAddress: string, scAddress: string) {
        const provider = DelegateGovernanceService.getDelegateStakingProvider(scAddress);
        if(!provider.isEnabled) {
            return DelegateGovernanceService.VOTE_POWER_FOR_NOT_IMPL;
        }
        const isLiquidStaking = provider.lsTokenId !== '' && provider.lsTokenId;

        let args: any[] = [new AddressValue(new Address(userAddress))];
        if(isLiquidStaking) {
            const balance = await this.getTokenBalanceForAddress(userAddress, provider.lsTokenId);
            args.push(new TokenTransfer({ token: new Token({identifier: provider.lsTokenId}), amount: BigInt(balance.toString())}));
        }

        const smartContractQueryInput: SmartContractQueryInput = {
            // caller: new Address('erd1nszf4y8dkply45skqxa2998uypc53tdsd26ycl5yndtqhl7j2tssfxzk2y'),
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