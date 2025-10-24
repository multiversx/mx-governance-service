import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { EnergyModule } from '../energy/energy.module';
import { GovernanceEnergyAbiService, GovernanceTokenSnapshotAbiService } from './services/governance.abi.service';
import { GovernanceQuorumService } from './services/governance.quorum.service';
import { GovernanceTokenSnapshotMerkleService } from './services/governance.token.snapshot.merkle.service';
import { GovernanceComputeService } from './services/governance.compute.service';
import { GovernanceTransactionService } from './resolvers/governance.transaction.resolver';
import { GovernanceDescriptionService } from './services/governance.description.service';
import {
    GovernanceEnergyContractResolver,
    GovernanceOnChainContractResolver,
    GovernancePulseContractResolver,
    GovernanceTokenSnapshotContractResolver,
} from './resolvers/governance.contract.resolver';
import { GovernanceSetterService } from './services/governance.setter.service';
import { GovernanceQueryResolver } from './resolvers/governance.query.resolver';
import { GovernanceProposalResolver } from './resolvers/governance.proposal.resolver';
import { GovernanceEnergyService, GovernanceOnChainService, GovernanceTokenSnapshotService } from './services/governance.service';
import { GovernanceAbiFactory } from './services/governance.abi.factory';
import { GovernanceServiceFactory } from './services/governance.factory';
import { GovernanceOldEnergyAbiService } from './services/governance.old.energy.abi.service';
import { LockedAssetModule } from '../locked-asset-factory/locked-asset.module';
import { ElasticService } from 'src/helpers/elastic.service';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { GovernanceOnChainAbiService } from './services/governance.onchain.abi.service';
import { DelegateGovernanceService } from './services/delegate-governance.service';
import { GithubService } from './services/github.service';
import { GithubResolver } from './resolvers/github.resolver';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { GovGithubModule } from '../gov-github/gov-github.module';
import { GovernanceOnchainProvidersSnapshotsMerkleService } from './services/governance.onchain.providers.snapshots.merkle.service';
import { GovernancePulseAbiService } from './services/governance.pulse.abi.service';
import { GovernancePulseService } from './services/governance.pulse.service';
import { PulsePollResolver } from './resolvers/pulse.poll.resolver';
import { PulseComputeService } from './services/pulse.compute.service';
import { ApiModule } from '@multiversx/sdk-nestjs-http';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { PulseSetterService } from './services/pulse.setter.service';
import { PulseIdeaResolver } from './resolvers/pulse.idea.resolver';
import { PulseAggregationResolver } from './resolvers/pulse.aggregation.resolver';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        CommonAppModule,
        MXCommunicationModule,
        ContextModule,
        TokenModule,
        EnergyModule,
        LockedAssetModule,
        RemoteConfigModule,
        DynamicModuleUtils.getApiModule(),
        GovGithubModule,
        ApiModule,
    ],
    providers: [
        GovernanceTokenSnapshotService,
        GovernanceEnergyService,
        GovernanceAbiFactory,
        GovernanceServiceFactory,
        GovernanceTokenSnapshotAbiService,
        GovernanceEnergyAbiService,
        GovernanceOldEnergyAbiService,
        GovernanceQuorumService,
        GovernanceTokenSnapshotMerkleService,
        GovernanceOnchainProvidersSnapshotsMerkleService,
        GovernanceSetterService,
        GovernanceComputeService,
        GovernanceTransactionService,
        GovernanceDescriptionService,
        GovernanceQueryResolver,
        GovernanceEnergyContractResolver,
        GovernanceTokenSnapshotContractResolver,
        GovernanceOnChainContractResolver,
        GovernanceProposalResolver,
        ElasticService,
        GovernanceOnChainAbiService,
        GovernanceOnChainService,
        DelegateGovernanceService,
        GithubService,
        GithubResolver,
        GovernancePulseContractResolver,
        GovernancePulseAbiService,
        GovernancePulseService,
        PulsePollResolver,
        PulseComputeService,
        ApiConfigService,
        PulseSetterService,
        PulseIdeaResolver,
        PulseAggregationResolver
    ],
    exports: [
        GovernanceTokenSnapshotAbiService,
        GovernanceEnergyAbiService,
        GovernanceSetterService,
        GovernanceComputeService,
        GovernanceTokenSnapshotService,
        GovernanceEnergyService,
        GovernanceAbiFactory,
        GovernanceOnChainAbiService,
        GovernanceOnChainService,
        DelegateGovernanceService,
        GithubService,
        GovernancePulseContractResolver,
        GovernancePulseAbiService,
        GovernancePulseService,
        PulseComputeService,
        ApiConfigService,
        PulseSetterService,
    ],
})
export class GovernanceModule { }
