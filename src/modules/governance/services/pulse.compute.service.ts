import { ElasticService } from "@multiversx/sdk-nestjs-elastic";
import { Injectable } from "@nestjs/common";
import { GovernanceSetterService } from "./governance.setter.service";
import { ErrorLoggerAsync } from "@multiversx/sdk-nestjs-common";
import { GetOrSetCache } from "src/helpers/decorators/caching.decorator";
import { CacheTtlInfo } from "src/services/caching/cache.ttl.info";
import { governanceConfig } from "src/config";
import { ApiService } from "@multiversx/sdk-nestjs-http";
import { ApiConfigService } from "src/helpers/api.config.service";

@Injectable()
export class PulseComputeService {
    constructor(
        // private readonly elasticService: ElasticService,
        // private readonly governanceSetter: GovernanceSetterService,
        private readonly apiService: ApiService,
        private readonly apiConfigService: ApiConfigService,
    ) {
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'pulse',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async getUserVotePulse(scAddress: string, userAddress: string, pollId: number): Promise<number> {
        const optionId = await this.getUserVotePulseRaw(scAddress, userAddress);

        return optionId;
    }

    private async getUserVotePulseRaw(scAddress: string, userAddress: string) {
        const url = `${this.apiConfigService.getApiUrl()}/accounts/${userAddress}/transactions?status=success&function=votePoll&receiver=${scAddress}`;
        const { data } = await this.apiService.get(url);
        console.log(data)

        // TODO: parse option from data and return -1 in case didn't vote
        const optionId = -1;

        return optionId;
    }
}