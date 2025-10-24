import { mxConfig } from '../../config';
import { Inject, Injectable } from '@nestjs/common';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import Agent, { HttpsAgent } from 'agentkeepalive';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PerformanceProfiler } from '../../utils/performance.profiler';
import { MetricsCollector } from '../../utils/metrics.collector';
import { Stats } from '../../models/stats.model';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers/out';
import { isEsdtToken, isEsdtTokenValid } from 'src/utils/token.type.compare';
import { PendingExecutor } from 'src/utils/pending.executor';
import { MXProxyService } from './mx.proxy.service';

type GenericGetArgs = {
    methodName: string;
    resourceUrl: string;
    retries?: number;
};

@Injectable()
export class MXApiService {
    private readonly apiProvider: ApiNetworkProvider;
    private genericGetExecutor: PendingExecutor<GenericGetArgs, any>;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly mxProxy: MXProxyService,
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

        this.apiProvider = new ApiNetworkProvider(
            this.apiConfigService.getApiUrl(),
            {
                timeout: mxConfig.proxyTimeout,
                httpAgent: mxConfig.keepAlive ? httpAgent : null,
                httpsAgent: mxConfig.keepAlive ? httpsAgent : null,
                headers: {
                    origin: 'GovernanceService',
                },
            },
        );
        this.genericGetExecutor = new PendingExecutor(
            async (getGenericArgs: GenericGetArgs) =>
                await this.doGetGeneric(
                    getGenericArgs.methodName,
                    getGenericArgs.resourceUrl,
                    getGenericArgs.retries,
                ),
        );
    }

    getService(): ApiNetworkProvider {
        return this.apiProvider;
    }

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async doGetGeneric<T>(
        name: string,
        resourceUrl: string,
        retries = 1,
    ): Promise<T> {
        const profiler = new PerformanceProfiler(`${name} ${resourceUrl}`);
        try {
            return await this.getService().doGetGeneric(resourceUrl);
        } catch (error) {
            if (
                error.inner.isAxiosError &&
                error.inner.code === 'ECONNABORTED' &&
                retries < 3
            ) {
                await this.delay(500 * retries);
                return await this.doGetGeneric(name, resourceUrl, retries + 1);
            }
            this.logger.error(`${error.message} after ${retries} retries`, {
                path: `${MXApiService.name}.${name}`,
                resourceUrl,
            });
            throw new Error(error);
        } finally {
            profiler.stop();

            MetricsCollector.setExternalCall(
                MXApiService.name,
                name,
                profiler.duration,
            );
        }
    }

    async getStats(): Promise<Stats> {
        const stats = await this.doGetGeneric<Stats>(
            this.getStats.name,
            'stats',
        );
        return new Stats(stats);
    }

    async getFirstBlockTimestampByEpochAndShard(epoch: number, shardId: string): Promise<number> {
        const { timestamp } = (await this.doGetGeneric<[{ timestamp: number}]>(
            this.getFirstBlockTimestampByEpochAndShard.name,
            `blocks?size=1&epoch=${epoch}&shard=${shardId}&fields=timestamp&order=asc`,
        ))[0];

        return timestamp;
    }

    async getToken(tokenID: string): Promise<EsdtToken> {
        try {
            const rawToken = await this.doGetGeneric<EsdtToken>(
                this.getToken.name,
                `tokens/${tokenID}`,
            );
            const esdtToken = new EsdtToken(rawToken);
            if (!isEsdtToken(esdtToken)) {
                return undefined;
            }

            if (!isEsdtTokenValid(esdtToken)) {
                const gatewayToken = await this.mxProxy
                    .getService()
                    .getDefinitionOfFungibleToken(tokenID);
                esdtToken.identifier = gatewayToken.identifier;
                esdtToken.decimals = gatewayToken.decimals;
            }

            return esdtToken;
        } catch (error) {
            return undefined;
        }
    }

    async getTokenBalanceForAddress(userAddress: string, tokenID: string): Promise<string> {
        try {
            const { balance } = await this.doGetGeneric<EsdtToken>(
                this.getTokenBalanceForAddress.name,
                `accounts/${userAddress}/tokens/${tokenID}?fields=balance`
            );
            return balance;
        } catch (error) {
            if(error.statusCode === 404) {
                return '0';
            }
            this.logger.error(error);
            throw error;
        }
    }

    async getTokenForUser(
        address: string,
        tokenID: string,
    ): Promise<EsdtToken> {
        return this.doGetGeneric<EsdtToken>(
            this.getTokenForUser.name,
            `accounts/${address}/tokens/${tokenID}`,
        );
    }

    async getCurrentNonce(shardId: number): Promise<any> {
        return this.doGetGeneric(
            this.getCurrentNonce.name,
            `network/status/${shardId}`,
        );
    }

    async getCurrentBlockNonce(shardId: number): Promise<number> {
        const latestBlock = await this.doGetGeneric(
            this.getCurrentBlockNonce.name,
            `blocks?size=1&shard=${shardId}`,
        );
        return latestBlock[0].nonce;
    }

    async getBalanceForAddress(address: string): Promise<string> {
        const { balance } = await this.doGetGeneric(
            this.getBalanceForAddress.name,
            `accounts/${address}?fields=balance`
        ) as { balance: string };
        
        return balance;
    }
}
