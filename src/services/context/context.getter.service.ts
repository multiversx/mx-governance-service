import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { Logger } from 'winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { GenericGetterService } from '../generics/generic.getter.service';
import { Stats } from 'src/models/stats.model';

@Injectable()
export class ContextGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly apiService: MXApiService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'context';
    }

    async getCurrentEpoch(): Promise<number> {
        const cacheKey = this.getCacheKey('currentEpoch');
        return await this.getData(
            cacheKey,
            async () => (await this.apiService.getStats()).epoch,
            Constants.oneMinute(),
        );
    }
    async getStats(): Promise<Stats> {
        const cacheKey = this.getCacheKey(`stats`);
         return await this.getData(
            cacheKey,
            async () => await this.apiService.getStats(),
            Constants.oneSecond() * 6,
        );
    }
    async getStartEpochRound(epoch: number) {
        const cacheKey = this.getCacheKey(`start-epoch:${epoch}:round`);
        const stats = await this.getStats();
        const epochDiff = epoch - stats.epoch;
        // TODO: for supernova roundsPerEpoch will be different depending on activation epoch
        const targetRound = epochDiff > 0 ? stats.blocks + (stats.roundsPerEpoch * epochDiff - stats.roundsPassed) : epoch * stats.roundsPerEpoch;
        return await this.getData(
            cacheKey,
            () => targetRound,
            Constants.oneMinute(),
        );
    }

    async getRoundsLeftUntilEpoch(epoch: number) {
        const cacheKey = this.getCacheKey(`rounds-until-epoch:${epoch}`);
        const stats = await this.getStats();
        const epochDiff = epoch - stats.epoch;
        const roundsLeftUntilEpoch = epochDiff > 0 ?  stats.roundsPerEpoch * epochDiff - stats.roundsPassed : 0;
        return await this.getData(
            cacheKey,
            () => roundsLeftUntilEpoch,
            Constants.oneMinute(),
        );
    }
}
