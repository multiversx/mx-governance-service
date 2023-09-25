import { Module } from '@nestjs/common';
import { MXCommunicationModule } from '../multiversx-communication/mx.communication.module';
import { ContextGetterService } from './context.getter.service';

@Module({
    imports: [MXCommunicationModule],
    providers: [ContextGetterService],
    exports: [ContextGetterService],
})
export class ContextModule {}
