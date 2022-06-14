import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { PhaseModel } from '../models/price.discovery.model';

export class PriceDiscoverySetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async setData(
        priceDiscoveryAddress: string,
        key: string,
        value: any,
        ttl: number,
    ): Promise<string> {
        const cacheKey = this.getPriceDiscoveryCacheKey(
            priceDiscoveryAddress,
            key,
        );
        try {
            await this.cachingService.setCache(cacheKey, value, ttl);
            return cacheKey;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PriceDiscoverySetterService.name,
                this.setData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async setLaunchedTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'launchedTokenID',
            value,
            oneHour(),
        );
    }

    async setAcceptedTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'acceptedTokenID',
            value,
            oneHour(),
        );
    }

    async setRedeemTokenID(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'redeemTokenID',
            value,
            oneHour(),
        );
    }

    async setLaunchedTokenAmount(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'launchedTokenAmount',
            value,
            oneSecond() * 12,
        );
    }

    async setAcceptedTokenAmount(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'acceptedTokenAmount',
            value,
            oneSecond() * 12,
        );
    }

    async setLaunchedTokenRedeemBalance(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'launchedTokenRedeemBalance',
            value,
            oneSecond() * 12,
        );
    }

    async setAcceptedTokenRedeemBalance(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'acceptedTokenRedeemBalance',
            value,
            oneSecond() * 12,
        );
    }

    async setLaunchedTokenPrice(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'launchedTokenPrice',
            value,
            oneSecond() * 12,
        );
    }

    async setAcceptedTokenPrice(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'acceptedTokenPrice',
            value,
            oneSecond() * 12,
        );
    }

    async setLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'launchedTokenPriceUSD',
            value,
            oneSecond() * 12,
        );
    }

    async setAcceptedTokenPriceUSD(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'acceptedTokenPriceUSD',
            value,
            oneSecond() * 12,
        );
    }

    async setStartBlock(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'startEpoch',
            value,
            oneHour(),
        );
    }

    async setEndBlock(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'endEpoch',
            value,
            oneHour(),
        );
    }

    async setCurrentPhase(
        priceDiscoveryAddress: string,
        value: PhaseModel,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'currentPhase',
            value,
            oneMinute(),
        );
    }

    async setMinLaunchedTokenPrice(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'minLaunchedTokenPrice',
            value,
            oneHour(),
        );
    }

    async setNoLimitPhaseDurationBlocks(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'noLimitPhaseDurationBlocks',
            value,
            oneHour(),
        );
    }

    async setLinearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'linearPenaltyPhaseDurationBlocks',
            value,
            oneHour(),
        );
    }

    async setFixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'fixedPenaltyPhaseDurationBlocks',
            value,
            oneHour(),
        );
    }

    async setLockingScAddress(
        priceDiscoveryAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'lockingScAddress',
            value,
            oneHour(),
        );
    }

    async setUnlockEpoch(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'unlockEpoch',
            value,
            oneHour(),
        );
    }

    async setPenaltyMinPercentage(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'penaltyMinPercentage',
            value,
            oneHour(),
        );
    }

    async setPenaltyMaxPercentage(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'penaltyMaxPercentage',
            value,
            oneHour(),
        );
    }

    async setFixedPenaltyPercentage(
        priceDiscoveryAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            priceDiscoveryAddress,
            'fixedPenaltyPercentage',
            value,
            oneHour(),
        );
    }

    private getPriceDiscoveryCacheKey(
        priceDiscoveryAddress: string,
        ...args: any
    ) {
        return generateCacheKeyFromParams(
            'priceDiscovery',
            priceDiscoveryAddress,
            ...args,
        );
    }
}