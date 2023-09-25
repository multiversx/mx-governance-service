import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Constants } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class RemoteConfigGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly flagRepositoryService: FlagRepositoryService,
    ) {
        super(cachingService, logger);
    }

    async getMaintenanceFlagValue(): Promise<boolean> {
        this.baseKey = 'flag';
        const cacheKey = this.getCacheKey('MAINTENANCE');
        return await this.getData(
            cacheKey,
            () =>
                this.flagRepositoryService
                    .findOne({
                        name: 'MAINTENANCE',
                    })
                    .then((res) => {
                        return res.value;
                    }),
            Constants.oneHour(),
        );
    }
}
