import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from 'src/services/database/database.module';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { Flag, FlagSchema } from './schemas/flag.schema';
import { RemoteConfigController } from './remote-config.controller';
import { RemoteConfigGetterService } from './remote-config.getter.service';
import { RemoteConfigSetterService } from './remote-config.setter.service';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Module({
    imports: [
        DatabaseModule,
        MongooseModule.forFeature([{ name: Flag.name, schema: FlagSchema }]),
    ],
    providers: [
        RemoteConfigController,
        FlagRepositoryService,
        RemoteConfigGetterService,
        RemoteConfigSetterService,
        ApiConfigService,
    ],
    exports: [
        RemoteConfigGetterService,
        RemoteConfigSetterService,
        FlagRepositoryService,
    ],
})
export class RemoteConfigModule {}
