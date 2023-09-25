import { LoggerService, MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { LockedAssetModule } from './modules/locked-asset-factory/locked-asset.module';
import { GraphQLFormattedError } from 'graphql';
import { CommonAppModule } from './common.app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TokenModule } from './modules/tokens/token.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { deprecationLoggerMiddleware } from './utils/deprecate.logger.middleware';
import { EnergyModule } from './modules/energy/energy.module';
import { GuestCachingMiddleware } from './utils/guestCaching.middleware';
import { GovernanceModule } from './modules/governance/governance.module';
import { DynamicModuleUtils } from './utils/dynamic.module.utils';
import '@multiversx/sdk-nestjs-common/lib/utils/extensions/array.extensions';

@Module({
    imports: [
        CommonAppModule,
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
            driver: ApolloDriver,
            imports: [CommonAppModule],
            useFactory: async (logger: LoggerService) => ({
                autoSchemaFile: 'schema.gql',
                installSubscriptionHandlers: true,
                buildSchemaOptions: {
                    fieldMiddleware: [deprecationLoggerMiddleware],
                },
                formatError: (
                    formattedError: GraphQLFormattedError,
                    error: any,
                ): GraphQLFormattedError => {
                    const errorStatus = formattedError.extensions?.code;
                    switch (errorStatus) {
                        case 'FORBIDDEN':
                            logger.log(error.message, 'GraphQLModule');
                            break;
                    }

                    return {
                        message: formattedError.message,
                        path: formattedError.path,
                        extensions: {
                            code: errorStatus,
                        },
                    };
                },
                fieldResolverEnhancers: ['guards'],
            }),
            inject: [WINSTON_MODULE_NEST_PROVIDER],
        }),
        LockedAssetModule,
        TokenModule,
        EnergyModule,
        GovernanceModule,
        DynamicModuleUtils.getCacheModule(),
    ],
})
export class PublicAppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(GuestCachingMiddleware)
            .forRoutes({ path: 'graphql', method: RequestMethod.POST });
    }
}
