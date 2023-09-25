import { EnergyType } from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants, ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';

@Injectable()
export class EnergySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'energy';
    }

    @ErrorLoggerAsync()
    async setEnergyEntryForUser(
        userAddress: string,
        value: EnergyType,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('energyEntryForUser', userAddress),
            value,
            Constants.oneMinute(),
        );
    }
}
