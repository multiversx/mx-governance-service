import { Args, Query, Resolver } from '@nestjs/graphql';
import { GovernanceContractsFiltersArgs } from '../models/governance.contracts.filter.args';
import { GovernanceUnion } from '../models/governance.union';
import { GovernanceTokenSnapshotService } from '../services/governance.service';
import { RemoteConfigGetterService } from '../../remote-config/remote-config.getter.service';

@Resolver()
export class GovernanceQueryResolver {
    constructor(
        private readonly governanceService: GovernanceTokenSnapshotService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
    ) {
    }

    @Query(() => [GovernanceUnion])
    async governanceContracts(
        @Args() filters: GovernanceContractsFiltersArgs
    ): Promise<Array<typeof GovernanceUnion>> {
        return this.governanceService.getGovernanceContracts(filters);
    }

    @Query(() => Boolean)
    async maintenance(): Promise<boolean> {
        return this.remoteConfigGetterService.getMaintenanceFlagValue();
    }
}
