import { createUnionType } from '@nestjs/graphql';
import { GovernanceEnergyContract, GovernanceOnChainContract, GovernancePulseContract, GovernanceTokenSnapshotContract } from './governance.contract.model';
import { DescriptionV0, DescriptionV1, DescriptionV2, DescriptionV3 } from './governance.proposal.model';

export const GovernanceUnion = createUnionType({
    name: 'GovernanceTypes',
    types: () =>
        [
            GovernanceTokenSnapshotContract,
            GovernanceEnergyContract,
            GovernanceOnChainContract,
            GovernancePulseContract,
        ] as const,
    resolveType(governance) {
        switch (governance.constructor.name) {
            case GovernanceTokenSnapshotContract.name:
                return GovernanceTokenSnapshotContract;
            case GovernanceEnergyContract.name:
                return GovernanceEnergyContract;
            case GovernanceOnChainContract.name:
                return GovernanceOnChainContract;
            case GovernancePulseContract.name:
                return GovernancePulseContract;
        }
    },
});

export const GovernanceDescriptionUnion = createUnionType({
    name: 'GovernanceDescriptionVersions',
    types: () =>
        [
            DescriptionV0,
            DescriptionV1,
            DescriptionV2,
            DescriptionV3,
        ] as const,
    resolveType(description) {
        switch (description.version) {
            case 0:
                return DescriptionV0;
            case 1:
                return DescriptionV1;
            case 2:
                return DescriptionV2;
            case 3:
                return DescriptionV3;
        }
    },
});
