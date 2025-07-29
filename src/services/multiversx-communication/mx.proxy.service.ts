import { AbiRegistry, Address, SmartContract } from '@multiversx/sdk-core';
import { Inject, Injectable } from '@nestjs/common';
import { abiConfig, mxConfig, scAddress } from '../../config';
import Agent, { HttpsAgent } from 'agentkeepalive';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ProxyNetworkProviderProfiler } from '../../helpers/proxy.network.provider.profiler';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { promises } from 'fs';
import { GovernanceType } from '../../utils/governance';

@Injectable()
export class MXProxyService {
    private readonly proxy: ProxyNetworkProviderProfiler;
    private static smartContracts: SmartContract[];

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const keepAliveOptions = {
            maxSockets: mxConfig.keepAliveMaxSockets,
            maxFreeSockets: mxConfig.keepAliveMaxFreeSockets,
            timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
            freeSocketTimeout: mxConfig.keepAliveFreeSocketTimeout,
            keepAlive: true,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);

        this.proxy = new ProxyNetworkProviderProfiler(
            this.apiConfigService.getApiUrl(),
            {
                timeout: mxConfig.proxyTimeout,
                httpAgent: mxConfig.keepAlive ? httpAgent : null,
                httpsAgent: mxConfig.keepAlive ? httpsAgent : null,
                headers: {
                    origin: 'MaiarExchangeService',
                },
            },
        );

        MXProxyService.smartContracts = [];
    }

    getService(): ProxyNetworkProviderProfiler {
        return this.proxy;
    }

    async getAddressShardID(address: string): Promise<string> {
        const response = await this.getService().doGetGeneric(
            `address/${address}/shard`,
        );
        return response.shardID.toString();
    }
    async getLockedAssetFactorySmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.lockedAssetAddress,
            abiConfig.lockedAssetFactory,
            'LockedAssetFactory',
        );
    }

    async getSimpleLockEnergySmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.simpleLockEnergy,
            abiConfig.simpleLockEnergy,
            'SimpleLockEnergy',
        );
    }

    async getGovernanceSmartContract(
        governanceAddress: string,
        type: GovernanceType,
    ): Promise<SmartContract> {
        return this.getSmartContract(
            governanceAddress,
            abiConfig.governance[type],
            'GovernanceV2',
        );
    }

    async getSmartContract(
        contractAddress: string,
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<SmartContract> {
        const key = `${contractInterface}.${contractAddress}`;
        return (
            MXProxyService.smartContracts[key] ||
            this.createSmartContract(
                contractAddress,
                contractAbiPath,
                contractInterface,
            )
        );
    }

    private async createSmartContract(
        contractAddress: string,
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<SmartContract> {
        const jsonContent: string = await promises.readFile(contractAbiPath, {
            encoding: 'utf8',
        });
        const json = JSON.parse(jsonContent);
        const newSC = new SmartContract({
            address: Address.newFromBech32(contractAddress),
            abi: AbiRegistry.create(json),
        });
        const key = `${contractInterface}.${contractAddress}`;
        MXProxyService.smartContracts[key] = newSC;
        return newSC;
    }
}
