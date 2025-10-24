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
import { GOVERNANCE_ONCHAIN_EVENTS, governanceContractsAddresses } from '../../utils/governance';
import { GovernanceHandlerService } from './handlers/governance.handler.service';
import { governanceConfig, scAddress } from 'src/config';
import { Address } from '@multiversx/sdk-core/out';
import { GovernanceOnChainHandlerService } from './handlers/governance.onchain.handler.service';
import { PulseHandlerService } from './handlers/pulse.handler.service';

@Injectable()
export class RabbitMqConsumer {
    private filterAddresses: string[];
    private data: any[];

    constructor(
        private readonly energyHandler: EnergyHandler,
        private readonly governanceHandler: GovernanceHandlerService,
        private readonly onChainGovernanceHandler: GovernanceOnChainHandlerService,
        private readonly pulseHandler: PulseHandlerService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @CompetingRabbitConsumer({
        queueName: process.env.RABBITMQ_QUEUE,
        exchange: process.env.RABBITMQ_EXCHANGE,
    })
    async consumeEvents(rawEvents: any) {
        this.logger.info('Start Processing events...');
        if (!rawEvents.events) {
            return;
        }
        const pulseScAddresses: string[] = governanceConfig.pulse.linear;
        
        const pulseEvents = rawEvents.events.filter((event: any) => pulseScAddresses.includes(event.address));
        if(pulseEvents.length > 0) {
            await this.pulseHandler.handlePulseEvents(pulseEvents);
        }
        
        const events: RawEvent[] = rawEvents?.events
            ?.filter((rawEvent: {
                address: string;
                identifier: string
            }) => this.isFilteredAddress(rawEvent.address) || this.isOnChainGovernanceEvent(rawEvent, rawEvents.shardId.toString()))
            .map((rawEventType) => {
                // means is on chain governance event
                if(!this.isFilteredAddress(rawEventType.address)) {
                    this.logger.info('Processing on-chain governance event', rawEventType);
                    if(rawEventType.identifier === 'delegateVote') {
                        rawEventType.topics =  [rawEventType.topics[1], rawEventType.topics[2], rawEventType.topics[0], rawEventType.topics[3], rawEventType.topics[4]] 
                    } else if (rawEventType.identifier === 'vote') {
                        const hexAddress = Address.newFromBech32(rawEventType.address).toHex();
                        const base64Address = Buffer.from(hexAddress, 'hex').toString('base64');

                        rawEventType.address = governanceConfig.onChain.linear[0];
                        
                        rawEventType.topics = [rawEventType.topics[1], base64Address, rawEventType.topics[0], rawEventType.topics[2], rawEventType.topics[3]];
                    }
                }
                return new RawEvent(rawEventType);
            });
        
        this.data = [];

        for (const rawEvent of events) {
            const validEvents = Object.values(GOVERNANCE_EVENTS).map(event => event.toString()).concat(Object.values(GOVERNANCE_ONCHAIN_EVENTS).map(event => event.toString()));
            if (rawEvent.data === '' && !validEvents.includes(rawEvent.name)) {
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
                case GOVERNANCE_ONCHAIN_EVENTS.YES:
                case GOVERNANCE_ONCHAIN_EVENTS.NO:
                case GOVERNANCE_ONCHAIN_EVENTS.ABSTAIN:
                case GOVERNANCE_ONCHAIN_EVENTS.VETO:
                    await this.onChainGovernanceHandler.handleOnChainGovernanceVoteEvent(new VoteEvent(rawEvent), rawEvent.name);
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

    private isOnChainGovernanceEvent(event: {address: string, identifier: string}, shardId: string): boolean {
        return ['vote', 'delegateVote'].includes(event.identifier) && shardId === '4294967295';
    }
}
