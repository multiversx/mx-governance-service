import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PUB_SUB } from "../redis.pubSub.module";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { GovernanceSetterService } from "src/modules/governance/services/governance.setter.service";
import { GovernanceAbiFactory } from "src/modules/governance/services/governance.abi.factory";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Lock } from '@multiversx/sdk-nestjs-common';
import { governanceContractsAddresses, GovernanceType } from "src/utils/governance";
import { GovernancePulseService } from "src/modules/governance/services/governance.pulse.service";
import { PulseSetterService } from "src/modules/governance/services/pulse.setter.service";

@Injectable()
export class PulseCacheWarmerService {
    constructor(
        private readonly pulseService: GovernancePulseService,
        private readonly pulseSetter: PulseSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron('*/6 * * * * *')
    @Lock({ name: 'warmPulsePolls', verbose: true })
    async warmPulsePolls(): Promise<void> {
        const scAddresses = governanceContractsAddresses([
            GovernanceType.PULSE,
        ])
        const totalPolls = await this.refreshPollsNumber(scAddresses);
        await this.refreshPollsInfo(scAddresses, totalPolls);
    }

    private async refreshPollsNumber(scAddresses: string[], ) {
        const cacheKeyPromises= [];
        const totalPolls: number[] = []
        for(const scAddress of scAddresses) {
            const totalPollsForContract = await this.pulseService.getTotalPollsRaw(scAddress);
            cacheKeyPromises.push(this.pulseSetter.getTotalPolls(scAddress, totalPollsForContract));
            totalPolls.push(totalPollsForContract);
        }

        const cacheKeys = await Promise.all(cacheKeyPromises);
        await this.deleteCacheKeys(cacheKeys);

        return totalPolls;
    }

    private async refreshPollsInfo(scAddresses: string[], totalPolls: number[]) {
        const cacheKeysPromises = [];
        for(let scIndex = 0; scIndex < scAddresses.length; scIndex++) {
            const scAddress = scAddresses[scIndex];
            const totalPollsForContract = totalPolls[scIndex];
 
            for(let pollId = 0; pollId < totalPollsForContract; pollId++) {
                const [poll, pollResults] = await Promise.all([
                    this.pulseService.getPollRaw(scAddress, pollId),
                    this.pulseService.getPollResultsRaw(scAddress, pollId),
                ]);

                cacheKeysPromises.push(
                    this.pulseSetter.getPoll(scAddress, pollId, poll),
                    this.pulseSetter.getPollResults(scAddress, pollId, pollResults)
                );
            }
        }

        const cacheKeys = await Promise.all(cacheKeysPromises);
        
        await this.deleteCacheKeys(cacheKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}