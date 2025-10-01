import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ContextModule } from './context/context.module';
import { CacheWarmerService } from './crons/cache.warmer.service';
import { MXCommunicationModule } from './multiversx-communication/mx.communication.module';
import { CommonAppModule } from 'src/common.app.module';
import { RemoteConfigModule } from 'src/modules/remote-config/remote-config.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { ElasticService } from 'src/helpers/elastic.service';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { GovernanceCacheWarmerService } from './crons/governance.cache.warmer.service';
import { GovernanceModule } from '../modules/governance/governance.module';
import { GithubProposalCacheWarmerService } from './crons/github.proposals.cache.warmer';
import { PulseCacheWarmerService } from './crons/pulse.cache.warmer.service';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        CommonAppModule,
        MXCommunicationModule,
        ContextModule,
        TokenModule,
        RemoteConfigModule,
        GovernanceModule,
        DynamicModuleUtils.getCacheModule(),
    ],
    controllers: [],
    providers: [
        CacheWarmerService,
        GovernanceCacheWarmerService,
        GithubProposalCacheWarmerService,
        PulseCacheWarmerService,
        ElasticService,
    ],
})
export class CacheWarmerModule {}
