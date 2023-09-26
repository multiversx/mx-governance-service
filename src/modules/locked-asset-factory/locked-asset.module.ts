import { Module } from '@nestjs/common';
import { AbiLockedAssetService } from './services/abi-locked-asset.service';
import { ContextModule } from '../../services/context/context.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { LockedAssetGetterService } from './services/locked.asset.getter.service';
import { TokenModule } from '../tokens/token.module';

@Module({
    imports: [MXCommunicationModule, ContextModule, TokenModule],
    providers: [
        AbiLockedAssetService,
        LockedAssetGetterService,
    ],
    exports: [LockedAssetGetterService],
})
export class LockedAssetModule {}
