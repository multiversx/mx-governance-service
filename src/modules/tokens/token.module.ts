import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EsdtTokenDbModel, EsdtTokenSchema } from './schemas/token.schema';
import { TokenService } from './services/token.service';
import { DatabaseModule } from 'src/services/database/database.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';

@Module({
    imports: [
        MXCommunicationModule,
        DatabaseModule,
        MongooseModule.forFeature([
            { name: EsdtTokenDbModel.name, schema: EsdtTokenSchema },
        ]),
    ],
    providers: [
        TokenService,
    ],
    exports: [
        TokenService,
    ],
})
export class TokenModule {}
