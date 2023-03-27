import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { ClaimProgress } from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import {
    ClaimMultiEvent,
    UpdateGlobalAmountsEvent,
    UpdateUserEnergyEvent,
    WEEKLY_REWARDS_SPLITTING_EVENTS,
} from '@multiversx/sdk-exchange';
import { FarmSetterServiceV2 } from '../../farm/v2/services/farm.v2.setter.service';
import { FarmGetterServiceV2 } from '../../farm/v2/services/farm.v2.getter.service';
import { FeesCollectorSetterService } from '../../fees-collector/services/fees-collector.setter.service';
import { FeesCollectorGetterService } from '../../fees-collector/services/fees-collector.getter.service';
import { scAddress } from '../../../config';
import { FarmSetterFactory } from '../../farm/farm.setter.factory';
import { FarmGetterFactory } from '../../farm/farm.getter.factory';
import { UserEnergySetterService } from '../../user/services/userEnergy/user.energy.setter.service';
import { EnergyGetterService } from 'src/modules/energy/services/energy.getter.service';
import { UserEnergyComputeService } from 'src/modules/user/services/userEnergy/user.energy.compute.service';

@Injectable()
export class WeeklyRewardsSplittingHandlerService {
    constructor(
        private readonly farmSetter: FarmSetterFactory,
        private readonly farmGetter: FarmGetterFactory,
        private readonly feesCollectorSetter: FeesCollectorSetterService,
        private readonly feesCollectorGetter: FeesCollectorGetterService,
        private readonly userEnergyCompute: UserEnergyComputeService,
        private readonly userEnergySetter: UserEnergySetterService,
        private readonly energyGetter: EnergyGetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleUpdateGlobalAmounts(
        event: UpdateGlobalAmountsEvent,
    ): Promise<void> {
        const topics = event.getTopics();

        const keys = await Promise.all([
            this.getSetter(event.address).totalEnergyForWeek(
                event.address,
                topics.currentWeek,
                topics.totalEnergy,
            ),
            this.getSetter(event.address).totalLockedTokensForWeek(
                event.address,
                topics.currentWeek,
                topics.totalLockedTokens,
            ),
        ]);

        await this.deleteCacheKeys(keys);
        await this.pubSub.publish(
            WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_GLOBAL_AMOUNTS,
            {
                updateGlobalAmountsEvent: event,
            },
        );
    }

    async handleUpdateUserEnergy(event: UpdateUserEnergyEvent): Promise<void> {
        const topics = event.getTopics();
        const userAddress = topics.caller.bech32();
        const contractAddress = event.address;

        const keys = await Promise.all([
            this.getSetter(contractAddress).currentClaimProgress(
                contractAddress,
                userAddress,
                new ClaimProgress({
                    energy: topics.energy,
                    week: topics.currentWeek,
                }),
            ),
            this.getSetter(contractAddress).userEnergyForWeek(
                contractAddress,
                userAddress,
                topics.currentWeek,
                topics.energy,
            ),
            this.getSetter(contractAddress).lastActiveWeekForUser(
                contractAddress,
                userAddress,
                topics.currentWeek,
            ),
        ]);

        const userEnergy = await this.energyGetter.getEnergyEntryForUser(
            userAddress,
        );
        const outdatedContract =
            await this.userEnergyCompute.computeUserOutdatedContract(
                userAddress,
                userEnergy,
                contractAddress,
            );

        keys.push(
            await this.userEnergySetter.setUserOutdatedContract(
                userAddress,
                contractAddress,
                outdatedContract,
            ),
        );

        await this.deleteCacheKeys(keys);
        await this.pubSub.publish(
            WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_USER_ENERGY,
            {
                updateUserEnergyEvent: event,
            },
        );
    }

    async handleClaimMulti(event: ClaimMultiEvent): Promise<void> {
        const topics = event.getTopics();

        let totalRewardsForWeek = await this.getGetter(
            event.address,
        ).totalRewardsForWeek(event.address, topics.currentWeek);

        totalRewardsForWeek = totalRewardsForWeek.map((token) => {
            for (const payment of event.allPayments) {
                if (
                    payment.tokenIdentifier === token.tokenID &&
                    payment.tokenNonce === token.nonce
                ) {
                    token.amount = new BigNumber(token.amount)
                        .minus(payment.amount)
                        .toFixed();
                }
            }
            return token;
        });
        const keys = await Promise.all([
            this.getSetter(event.address).userRewardsForWeek(
                event.address,
                topics.caller.bech32(),
                topics.currentWeek,
                [],
            ),
            this.getSetter(event.address).totalRewardsForWeek(
                event.address,
                topics.currentWeek,
                totalRewardsForWeek,
            ),
        ]);

        await this.deleteCacheKeys(keys);
        await this.pubSub.publish(WEEKLY_REWARDS_SPLITTING_EVENTS.CLAIM_MULTI, {
            claimMultiEvent: event,
        });
    }

    private getSetter(address: string) {
        if (address === scAddress.feesCollector) {
            return this.feesCollectorSetter;
        }
        return this.farmSetter.useSetter(address) as FarmSetterServiceV2;
    }

    private getGetter(address: string) {
        if (address === scAddress.feesCollector) {
            return this.feesCollectorGetter;
        }
        return this.farmGetter.useGetter(address) as FarmGetterServiceV2;
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}