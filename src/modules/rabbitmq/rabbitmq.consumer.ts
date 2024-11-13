import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CompetingRabbitConsumer } from './rabbitmq.consumers';
import {
    EnergyEvent,
    GOVERNANCE_EVENTS,
    RawEvent,
    SIMPLE_LOCK_ENERGY_EVENTS,
    VoteEvent,
} from '@multiversx/sdk-exchange';
import { EnergyHandler } from './handlers/energy.handler.service';
import { governanceContractsAddresses } from '../../utils/governance';
import { GovernanceHandlerService } from './handlers/governance.handler.service';
import { scAddress } from 'src/config';

@Injectable()
export class RabbitMqConsumer {
    private filterAddresses: string[];
    private data: any[];

    constructor(private readonly energyHandler: EnergyHandler, private readonly governanceHandler: GovernanceHandlerService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    }

    @CompetingRabbitConsumer({
        queueName: process.env.RABBITMQ_QUEUE, exchange: process.env.RABBITMQ_EXCHANGE,
    })
    async consumeEvents(rawEvents: any) {
        this.logger.info('Start Processing events...');
        if (!rawEvents.events) {
            return;
        }
        const events: RawEvent[] = rawEvents?.events
            ?.filter((rawEvent: {
                address: string;
                identifier: string
            }) => this.isFilteredAddress(rawEvent.address))
            .map((rawEventType) => new RawEvent(rawEventType));

        this.data = [];

        for (const rawEvent of events) {
            if (rawEvent.data === '' && rawEvent.name !== GOVERNANCE_EVENTS.UP && rawEvent.name !== GOVERNANCE_EVENTS.DOWN && rawEvent.name !== GOVERNANCE_EVENTS.ABSTAIN && rawEvent.name !== GOVERNANCE_EVENTS.DOWN_VETO) {
                this.logger.info('Event skipped', {
                    address: rawEvent.address,
                    identifier: rawEvent.identifier,
                    name: rawEvent.name,
                    topics: rawEvent.topics,
                });
                continue;
            }
            this.logger.info('Processing event', {
                address: rawEvent.address,
                identifier: rawEvent.identifier,
                name: rawEvent.name,
                topics: rawEvent.topics,
            });
            switch (rawEvent.name) {
                case SIMPLE_LOCK_ENERGY_EVENTS.ENERGY_UPDATED:
                    await this.energyHandler.handleUpdateEnergy(
                        new EnergyEvent(rawEvent),
                    );
                    break;
                case GOVERNANCE_EVENTS.UP:
                case GOVERNANCE_EVENTS.DOWN:
                case GOVERNANCE_EVENTS.DOWN_VETO:
                case GOVERNANCE_EVENTS.ABSTAIN:
                    await this.governanceHandler.handleGovernanceVoteEvent(new VoteEvent(rawEvent), rawEvent.name);
                    break;
            }
        }

        this.logger.info('Finish Processing events...');
    }

    async getFilterAddresses(): Promise<void> {
        this.filterAddresses = governanceContractsAddresses();
        this.filterAddresses.push(scAddress.simpleLockEnergy)
    }

    private isFilteredAddress(address: string): boolean {
        return (this.filterAddresses.find((filterAddress) => address === filterAddress) !== undefined);
    }
}
