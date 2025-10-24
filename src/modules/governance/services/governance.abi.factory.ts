import { Injectable } from '@nestjs/common';
import { GovernanceEnergyAbiService, GovernanceTokenSnapshotAbiService } from './governance.abi.service';
import { GovernanceType, governanceType } from '../../../utils/governance';
import { GovernanceOldEnergyAbiService } from './governance.old.energy.abi.service';
import { GovernanceOnChainAbiService } from './governance.onchain.abi.service';


@Injectable()
export class GovernanceAbiFactory {
    constructor(
        private readonly governanceEnergyAbi: GovernanceEnergyAbiService,
        private readonly governanceOldEnergyAbi: GovernanceOldEnergyAbiService,
        private readonly governanceTokenSnapshotAbi: GovernanceTokenSnapshotAbiService,
        private readonly governanceOnChainAbiService: GovernanceOnChainAbiService,
    ) {
    }

    useAbi(contractAddress: string) {
        switch (governanceType(contractAddress)) {
            case GovernanceType.ENERGY:
                return this.governanceEnergyAbi;
            case GovernanceType.TOKEN_SNAPSHOT:
                return this.governanceTokenSnapshotAbi;
            case GovernanceType.OLD_ENERGY:
                return this.governanceOldEnergyAbi;
            case GovernanceType.ONCHAIN:
                return this.governanceOnChainAbiService;
        }
    }
}
