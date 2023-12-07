import { Injectable } from '@nestjs/common';
import { EsdtToken } from '../models/esdtToken.model';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { CacheService } from '@multiversx/sdk-nestjs-cache';

@Injectable()
export class TokenService {
    constructor(
        private readonly apiService: MXApiService,
        protected readonly cachingService: CacheService,
    ) {}

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        if (tokenID === undefined) {
            return undefined;
        }
        const cacheKey = `token.${tokenID}`;
        const cachedToken = await this.cachingService.get<EsdtToken>(cacheKey);
        if (cachedToken && cachedToken !== undefined) {
            await this.cachingService.set<EsdtToken>(
                cacheKey,
                cachedToken,
                CacheTtlInfo.Token.remoteTtl,
                CacheTtlInfo.Token.localTtl,
            );
            return new EsdtToken(cachedToken);
        }

        const token = await this.apiService.getToken(tokenID);

        if (token !== undefined) {
            await this.cachingService.set<EsdtToken>(
                cacheKey,
                token,
                CacheTtlInfo.Token.remoteTtl,
                CacheTtlInfo.Token.localTtl,
            );

            return token;
        }

        return undefined;
    }
}
