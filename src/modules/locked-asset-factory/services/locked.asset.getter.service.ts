import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { AbiLockedAssetService } from './abi-locked-asset.service';

@Injectable()
export class LockedAssetGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiLockedAssetService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'lockedAssetFactory';
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            this.getCacheKey('lockedTokenID'),
            () => this.abiService.getLockedTokenID(),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }
}
