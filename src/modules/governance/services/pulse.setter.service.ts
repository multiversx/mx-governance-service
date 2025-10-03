import { CacheService } from "@multiversx/sdk-nestjs-cache";
import { Inject } from "@nestjs/common";
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { GenericSetterService } from "src/services/generics/generic.setter.service";
import { CacheTtlInfo } from "src/services/caching/cache.ttl.info";
import { PollResult, PollResults, PulseIdeaModel, PulsePollModel } from '../models/pulse.poll.model';

export class PulseSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'pulse';
    }

    async getTotalPolls(scAddress: string, value: number) {
        return await this.setData(
            this.getCacheKey('getTotalPolls', scAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getTotalIdeas(scAddress: string, value: number) {
        return await this.setData(
            this.getCacheKey('getTotalIdeas', scAddress),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getIdea(scAddress: string, ideaID: number, value: PulseIdeaModel) {
        return await this.setData(
            this.getCacheKey('getIdea', scAddress, ideaID),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getPoll(scAddress: string, pollId: number, value: PulsePollModel) {
        return await this.setData(
            this.getCacheKey('getPoll', scAddress, pollId),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getPollResults(scAddress: string, pollId: number, value: PollResults) {
        return await this.setData(
            this.getCacheKey('getPollResults', scAddress, pollId),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getUserVotePulse(scAddress: string, userAddress: string, pollId: number, value: number) {
        return await this.setData(
            this.getCacheKey('getUserVotePulse', scAddress, userAddress, pollId),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async hasUserVotedIdea(scAddress: string, userAddress: string, ideaId: number, value: boolean) {
        return await this.setData(
            this.getCacheKey('hasUserVotedIdea', scAddress, userAddress, ideaId),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getIdeaVotesTotalCount(scAddress: string, ideaId: number, value: number) {
        return await this.setData(
            this.getCacheKey('getIdeaVotesTotalCount', scAddress, ideaId),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}