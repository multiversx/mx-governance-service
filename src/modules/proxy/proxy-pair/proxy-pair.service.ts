import { Injectable } from '@nestjs/common';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { CacheProxyPairService } from '../../../services/cache-manager/cache-proxy-pair.service';
import { GenericEsdtAmountPair } from '../../../models/proxy.model';
import { ContextService } from '../../../services/context/context.service';
import { NftToken } from 'src/models/tokens/nftToken.model';

@Injectable()
export class ProxyPairService {
    constructor(
        private abiService: AbiProxyPairService,
        private cacheService: CacheProxyPairService,
        private context: ContextService,
    ) {}

    async getwrappedLpToken(): Promise<NftToken> {
        const cachedData = await this.cacheService.getWrappedLpTokenID();
        if (!!cachedData) {
            return await this.context.getNftTokenMetadata(
                cachedData.wrappedLpTokenID,
            );
        }

        const wrappedLpTokenID = await this.abiService.getWrappedLpTokenID();
        this.cacheService.setWrappedLpTokenID({
            wrappedLpTokenID: wrappedLpTokenID,
        });

        return await this.context.getNftTokenMetadata(wrappedLpTokenID);
    }

    async getIntermediatedPairs(): Promise<string[]> {
        const cachedData = await this.cacheService.getIntermediatedPairsAddress();
        if (!!cachedData) {
            return cachedData.pairs;
        }

        const pairs = await this.abiService.getIntermediatedPairsAddress();

        this.cacheService.setIntermediatedPairsAddress({
            pairs: pairs,
        });

        return pairs;
    }

    async getTemporaryFundsProxy(
        userAddress: string,
    ): Promise<GenericEsdtAmountPair[]> {
        return await this.abiService.getTemporaryFundsProxy(userAddress);
    }
}