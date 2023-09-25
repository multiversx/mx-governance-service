import { Module } from '@nestjs/common';
import { CommonAppModule } from './common.app.module';
import { MetricsController } from './endpoints/metrics/metrics.controller';
import { MetricsService } from './endpoints/metrics/metrics.service';
import { ElasticService } from './helpers/elastic.service';
import { RemoteConfigController } from './modules/remote-config/remote-config.controller';
import { RemoteConfigModule } from './modules/remote-config/remote-config.module';
import { TokenModule } from './modules/tokens/token.module';
import { DynamicModuleUtils } from './utils/dynamic.module.utils';

@Module({
    imports: [
        CommonAppModule,
        TokenModule,
        RemoteConfigModule,
        DynamicModuleUtils.getCacheModule(),
    ],
    controllers: [MetricsController, RemoteConfigController],
    providers: [MetricsService, ElasticService],
})
export class PrivateAppModule {}
