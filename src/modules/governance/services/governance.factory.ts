import { Injectable } from '@nestjs/common';
import { GovernanceType, governanceType } from '../../../utils/governance';
import { GovernanceEnergyService, GovernanceOnChainService, GovernanceTokenSnapshotService } from './governance.service';
import {  GovernancePulseService } from './governance.pulse.service';


@Injectable()
export class GovernanceServiceFactory {
    constructor(
        private readonly governanceTokenSnapshot: GovernanceTokenSnapshotService,
        private readonly governanceEnergy: GovernanceEnergyService,
        private readonly governanceOnChain: GovernanceOnChainService,
        private readonly governancePulse: GovernancePulseService,
    ) {
    }

    userService(contractAddress: string) {
        switch (governanceType(contractAddress)) {
            case GovernanceType.ENERGY:
            case GovernanceType.OLD_ENERGY:
                return this.governanceEnergy;
            case GovernanceType.TOKEN_SNAPSHOT:
                return this.governanceTokenSnapshot;
            case GovernanceType.ONCHAIN:
                return this.governanceOnChain;
            case GovernanceType.PULSE:
                return this.governancePulse;
        }
    }
}
