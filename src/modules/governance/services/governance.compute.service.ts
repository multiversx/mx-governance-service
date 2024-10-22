import { Injectable } from '@nestjs/common';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { VoteType } from '../models/governance.proposal.model';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { GovernanceSetterService } from './governance.setter.service';
import { Address } from '@multiversx/sdk-core/out';
import { decimalToHex } from '../../../utils/token.converters';
import { ElasticQuery, ElasticSortOrder, QueryType } from '@multiversx/sdk-nestjs-elastic';
import { ElasticService } from 'src/helpers/elastic.service';
import { GovernanceType, governanceType, toVoteType } from '../../../utils/governance';

@Injectable()
export class GovernanceComputeService {
    constructor(
        private readonly elasticService: ElasticService,
        private readonly governanceSetter: GovernanceSetterService,
    ) {
    }

    async userVotedProposalsWithVoteType(scAddress: string, userAddress: string, proposalId: number): Promise<VoteType> {
        const currentCachedProposalVoteTypes = await this.userVoteTypesForContract(scAddress, userAddress);
        const cachedVoteType = currentCachedProposalVoteTypes.find((proposal) => proposal.proposalId === proposalId);
        if (cachedVoteType) {
            return cachedVoteType.vote;
        }

        const event = await this.getVoteEvent('vote', scAddress, userAddress, proposalId);
        let voteType = VoteType.NotVoted;
        if(event) {
                const voteEvent = event._source;
                const decodedVoteType = Buffer.from(voteEvent.topics[0], 'hex').toString();
                voteType = toVoteType(decodedVoteType);
        }
        
        const proposalVoteType = {
            proposalId,
            vote: voteType,
        }
        currentCachedProposalVoteTypes.push(proposalVoteType);
        await this.governanceSetter.userVoteTypesForContract(scAddress, userAddress, currentCachedProposalVoteTypes);
        return proposalVoteType.vote;
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userVoteTypesForContract(scAddress: string, userAddress: string): Promise<{ proposalId: number, vote: VoteType }[]> {
        return [];
    }

    private async getVoteEvent (
        eventName: string,
        scAddress: string,
        callerAddress: string,
        proposalId: number,
    ): Promise<any> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        const proposalIdHex = decimalToHex(proposalId);
        const callerAddressHex = Address.fromString(callerAddress).hex();

        elasticQueryAdapter.condition.must = [
            QueryType.Match('address', scAddress),
            QueryType.Match('identifier', eventName),
            QueryType.Match('topics', proposalIdHex),
            QueryType.Match('topics', callerAddressHex),
        ];

        const list = await this.elasticService.get(
            'events',
            '',
            elasticQueryAdapter,
        );

        return list.filter((event) => event._source.topics[2] === proposalIdHex)[0];
    }
}
