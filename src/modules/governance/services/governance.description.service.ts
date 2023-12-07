import {Injectable} from '@nestjs/common';
import {GovernanceDescriptionUnion} from '../models/governance.union';
import {DescriptionV0, DescriptionV1, DescriptionV2} from '../models/governance.proposal.model';


@Injectable()
export class GovernanceDescriptionService {
    getGovernanceDescription(descriptionJson: string): typeof GovernanceDescriptionUnion {
        const description = JSON.parse(descriptionJson);
        switch (description.version) {
            case 0:
                return new DescriptionV0(description);
            case 1:
                return new DescriptionV1(description);
            case 2:
                return new DescriptionV2(description);
            default:
                throw new Error(`Unknown description version: ${description.version}`);
        }
    }
}
