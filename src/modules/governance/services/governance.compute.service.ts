import { Injectable } from '@nestjs/common';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { VoteType } from '../models/governance.proposal.model';
import { GetOrSetCache } from '../../../helpers/decorators/caching.decorator';
import { CacheTtlInfo } from '../../../services/caching/cache.ttl.info';
import { GovernanceSetterService } from './governance.setter.service';
import { Address } from '@multiversx/sdk-core/out';
import { decimalToHex } from '../../../utils/token.converters';
import { ElasticQuery, QueryType } from '@multiversx/sdk-nestjs-elastic';
import { ElasticService } from 'src/helpers/elastic.service';
import {  toVoteType } from '../../../utils/governance';
import { governanceConfig } from 'src/config';
import { DelegateGovernanceService } from './delegate-governance.service';

@Injectable()
export class GovernanceComputeService {
    constructor(
        private readonly elasticService: ElasticService,
        private readonly governanceSetter: GovernanceSetterService,
    ) {
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'governance',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async getUserVoteOnChain(scAddress: string, userAddress: string, proposalId: number): Promise<VoteType> {
        const onChainScAddress = governanceConfig.onChain.linear[0];
        const isDelegateVote = onChainScAddress !== scAddress;

         if(isDelegateVote && !DelegateGovernanceService.getDelegateStakingProvider(scAddress).isEnabled) {
            return VoteType.NotVoted;
        }

        let voteType = VoteType.NotVoted;
        const eventName = isDelegateVote ? 'delegateVote' : 'vote';
       
        const event = await this.getVoteEventOnChain(eventName, scAddress, userAddress, proposalId, onChainScAddress);
        if(event) {
            const voteEvent = event._source;
            const decodedVoteType = Buffer.from(voteEvent.topics[1], 'hex').toString();
            voteType = toVoteType(decodedVoteType);
        }

        return voteType;
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

    private async getVoteEventOnChain (
        eventName: string,
        scAddress: string,
        callerAddress: string,
        proposalId: number,
        logAddress: string,
    ): Promise<any> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        const proposalIdHex = decimalToHex(proposalId);
        const callerAddressHex = Address.newFromBech32(callerAddress).toHex();

        elasticQueryAdapter.condition.must = [
            QueryType.Match('logAddress', logAddress),
            QueryType.Match('identifier', eventName),
            QueryType.Match('topics', proposalIdHex),
        ];
        if(eventName === 'delegateVote') {
            elasticQueryAdapter.condition.must.push(QueryType.Match('address', scAddress))
            elasticQueryAdapter.condition.must.push(QueryType.Match('topics', callerAddressHex))
        } else {
            elasticQueryAdapter.condition.must.push(QueryType.Match('address', callerAddress))
        }

        const list = await this.elasticService.get(
            'events',
            '',
            elasticQueryAdapter,
        );

        return list.filter((event) => event._source.topics[0] === proposalIdHex)[0];
    }

    private async getVoteEvent (
        eventName: string,
        scAddress: string,
        callerAddress: string,
        proposalId: number,
    ): Promise<any> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        const proposalIdHex = decimalToHex(proposalId);
        const callerAddressHex = Address.newFromBech32(callerAddress).toHex();

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
