import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { EnergyResolver } from './energy.resolver';
import { EnergyAbiService } from './services/energy.abi.service';
import { EnergyComputeService } from './services/energy.compute.service';
import { EnergyGetterService } from './services/energy.getter.service';
import { EnergyService } from './services/energy.service';
import { EnergySetterService } from './services/energy.setter.service';
import { EnergyTransactionService } from './services/energy.transaction.service';

@Module({
    imports: [
        CommonAppModule,
        CachingModule,
        MXCommunicationModule,
        ContextModule,
        TokenModule,
    ],
    providers: [
        EnergyService,
        EnergyAbiService,
        EnergyGetterService,
        EnergySetterService,
        EnergyComputeService,
        EnergyTransactionService,
        EnergyResolver,
    ],
    exports: [EnergyGetterService, EnergySetterService, EnergyComputeService],
})
export class EnergyModule {}