import { EnergyEvent, SIMPLE_LOCK_ENERGY_EVENTS } from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { EnergySetterService } from 'src/modules/energy/services/energy.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';

@Injectable()
export class EnergyHandler {
    constructor(
        private readonly energySetter: EnergySetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleUpdateEnergy(event: EnergyEvent): Promise<void> {
        const caller = event.decodedTopics.caller;
        const cachedKeys = [];
        cachedKeys.push(
            await this.energySetter.setEnergyEntryForUser(
                caller.bech32(),
                event.newEnergyEntry.toJSON(),
            ),
        );

        await this.deleteCacheKeys(cachedKeys);
        await this.pubSub.publish(SIMPLE_LOCK_ENERGY_EVENTS.ENERGY_UPDATED, {
            updatedEnergy: event,
        });
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
