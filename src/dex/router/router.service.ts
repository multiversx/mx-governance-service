import { PairModel, PairInfoModel, TransactionModel, DexFactoryModel } from '../dex.model';
import { Injectable, Res } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ContractFunction, ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { ApiResponse, Client } from '@elastic/elasticsearch';
import { elrondConfig } from '../../config';
import { QueryResponse } from '@elrondnetwork/erdjs/out/smartcontracts/queryResponse';


@Injectable()
export class RouterService {
    private readonly proxy: ProxyProvider;
    private readonly elasticClient: Client;

    constructor(
        private cacheManagerService: CacheManagerService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
        this.elasticClient = new Client({
            node: elrondConfig.elastic + '/transactions',
        });
    }

    async getAllPairs(): Promise<PairModel[]> {
        let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_router.abi.json"] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });

        let getAllPairsInteraction = <Interaction>contract.methods.getAllPairs([]);

        let queryResponse = await contract.runQuery(this.proxy, { func: new ContractFunction("getAllPairs") });
        let result = getAllPairsInteraction.interpretQueryResponse(queryResponse);

        return result.values[0].valueOf().map(v => {
            return {
                token_a: v.token_a.toString(),
                token_b: v.token_b.toString(),
                address: v.address.toString(),
            }
        });
    }

    async getDexFactory(): Promise<DexFactoryModel> {
        return new DexFactoryModel();
    }
    async getTotalTxCount(): Promise<number> {
        const cachedData = await this.cacheManagerService.getTotalTxCount();
        if (!!cachedData) {
        }

        let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_router.abi.json"] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });

        let getAllPairsInteraction = <Interaction>contract.methods.getAllPairs([]);

        let queryResponse = await contract.runQuery(
            this.proxy,
            getAllPairsInteraction.buildQuery()
        );

        let result = getAllPairsInteraction.interpretQueryResponse(queryResponse);

        let totalTxCount = 0;

        let pairs = result.values[0].valueOf().map(v => {
            return {
                token_a: v.token_a.toString(),
                token_b: v.token_b.toString(),
                address: v.address.toString(),
            }
        });

        for (const pair of pairs) {
            const body = {
                size: 0,
                'query': {
                    'bool': {
                        'must': [
                            {
                                'match': {
                                    'receiver': pair.address
                                }
                            }
                        ]
                    }
                }
            }

            try {
                const response = await this.elasticClient.search({
                    body
                });
                totalTxCount += response.body.hits.total.value;
            } catch (e) {
                console.log(e);
            }

        }

        return totalTxCount;
    }

    async createPair(token_a: string, token_b: string): Promise<TransactionModel> {
        let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_router.abi.json"] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });
        let transaction = contract.call({
            func: new ContractFunction("createPair"),
            args: [
                BytesValue.fromUTF8(token_a),
                BytesValue.fromUTF8(token_b)
            ],
            gasLimit: new GasLimit(1400000000)
        });

        let transactionModel = transaction.toPlainObject();
        return {
            ...transactionModel,
            options: transactionModel.options == undefined ? "" : transactionModel.options,
            status: transactionModel.status == undefined ? "" : transactionModel.status,
            signature: transactionModel.signature == undefined ? "" : transactionModel.signature
        };
    }

    async issueLpToken(address: string, lpTokenName: string, lpTokenTicker: string): Promise<TransactionModel> {
        let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_router.abi.json"] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });
        let transaction = contract.call({
            func: new ContractFunction("issueLpToken"),
            args: [
                BytesValue.fromHex(new Address(address).hex()),
                BytesValue.fromUTF8(lpTokenName),
                BytesValue.fromUTF8(lpTokenTicker)
            ],
            gasLimit: new GasLimit(1400000000)
        });
        console.log(transaction);
        let transactionModel = transaction.toPlainObject();
        return {
            ...transactionModel,
            options: transactionModel.options == undefined ? "" : transactionModel.options,
            status: transactionModel.status == undefined ? "" : transactionModel.status,
            signature: transactionModel.signature == undefined ? "" : transactionModel.signature
        };
    }

    async setLocalRoles(address: string): Promise<TransactionModel> {
        let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_router.abi.json"] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });
        let transaction = contract.call({
            func: new ContractFunction("setLocalRoles"),
            args: [
                BytesValue.fromHex(new Address(address).hex()),
            ],
            gasLimit: new GasLimit(1400000000)
        });
        console.log(transaction);
        let transactionModel = transaction.toPlainObject();
        return {
            ...transactionModel,
            options: transactionModel.options == undefined ? "" : transactionModel.options,
            status: transactionModel.status == undefined ? "" : transactionModel.status,
            signature: transactionModel.signature == undefined ? "" : transactionModel.signature
        };
    }
}