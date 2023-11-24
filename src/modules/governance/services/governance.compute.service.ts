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
import { toVoteType } from '../../../utils/governance';
import { VoteEvent } from '@multiversx/sdk-exchange';

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

        const log = await this.getVoteLog('vote', scAddress, userAddress, proposalId);
        let voteType = VoteType.NotVoted;
        for (let i = 0; i < log.length; i++) {
            const logEntry = log[i]._source;
            const voteEvent = logEntry.events.find((event) => event.identifier === 'vote');

            // Check if the voteEvent exists and the address matches the desired address
            const event = new VoteEvent(voteEvent);
            const topics = event.getTopics();
            if (voteEvent && topics.voter === userAddress) {
                voteType = toVoteType(atob(voteEvent.topics[0]));
                break; // Optional: break the loop if you only need the first match
            }
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

    private async getVoteLog(
        eventName: string,
        scAddress: string,
        callerAddress: string,
        proposalId: number,
    ): Promise<any[]> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        const encodedProposalId = Buffer.from(decimalToHex(proposalId), 'hex').toString('base64');
        const encodedCallerAddress = Buffer.from(Address.fromString(callerAddress).hex(), 'hex').toString('base64');
        elasticQueryAdapter.condition.must = [
            QueryType.Match('address', scAddress),
            QueryType.Nested('events', [
                QueryType.Match('events.address', scAddress),
                QueryType.Match('events.identifier', eventName),
            ]),
            QueryType.Nested('events', [
                QueryType.Match('events.topics', encodedProposalId),
            ]),
            QueryType.Nested('events', [
                QueryType.Match('events.topics', encodedCallerAddress),
            ]),
        ];

        elasticQueryAdapter.sort = [
            { name: 'timestamp', order: ElasticSortOrder.ascending },
        ];


        const list = await this.elasticService.getList(
            'logs',
            '',
            elasticQueryAdapter,
        );
        return list;
    }
}
