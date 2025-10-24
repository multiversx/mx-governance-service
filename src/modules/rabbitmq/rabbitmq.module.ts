import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { RabbitMqConsumer } from './rabbitmq.consumer';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { ContextModule } from 'src/services/context/context.module';
import { TokenModule } from '../tokens/token.module';
import { EnergyHandler } from './handlers/energy.handler.service';
import { EnergyModule } from '../energy/energy.module';
import { GovernanceHandlerService } from './handlers/governance.handler.service';
import { GovernanceModule } from '../governance/governance.module';
import { GovernanceOnChainHandlerService } from './handlers/governance.onchain.handler.service';
import { PulseHandlerService } from './handlers/pulse.handler.service';

@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        ContextModule,
        TokenModule,
        EnergyModule,
        GovernanceModule,
    ],
    providers: [
        RabbitMqConsumer,
        EnergyHandler,
        GovernanceHandlerService,
        GovernanceOnChainHandlerService,
        PulseHandlerService,
    ],
})
export class RabbitMqModule {
    static register(): DynamicModule {
        return {
            module: RabbitMqModule,
            imports: [
                RabbitMQModule.forRootAsync(RabbitMQModule, {
                    useFactory: () => {
                        return {
                            name: process.env.RABBITMQ_EXCHANGE,
                            type: 'fanout',
                            options: {},
                            uri: process.env.RABBITMQ_URL,
                            prefetchCount: 1,
                        };
                    },
                }),
            ],
        };
    }
}
