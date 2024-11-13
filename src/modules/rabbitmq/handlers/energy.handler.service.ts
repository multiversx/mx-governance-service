import {
    EnergyEvent,
    SIMPLE_LOCK_ENERGY_EVENTS,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { EnergySetterService } from 'src/modules/energy/services/energy.setter.service';
import { GovernanceProposalStatus } from 'src/modules/governance/models/governance.proposal.model';
import { GovernanceAbiFactory } from 'src/modules/governance/services/governance.abi.factory';
import { GovernanceSetterService } from 'src/modules/governance/services/governance.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import {
    governanceContractsAddresses,
    GovernanceType,
} from 'src/utils/governance';
import { Logger } from 'winston';

@Injectable()
export class EnergyHandler {
    constructor(
        private readonly energySetter: EnergySetterService,
        private readonly governanceAbiFactory: GovernanceAbiFactory,
        private readonly governanceSetter: GovernanceSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleUpdateEnergy(event: EnergyEvent): Promise<void> {
        const caller = event.decodedTopics.caller;
        const cachedKeys = [];
        cachedKeys.push(
            await this.energySetter.setEnergyEntryForUser(
                caller.bech32(),
                event.newEnergyEntry.toJSON(),
            ),
        );

        const governanceAddresses = governanceContractsAddresses([
            GovernanceType.ENERGY,
        ]);

        const deletePromises = [];
        for (const address of governanceAddresses) {
            const proposals = await this.governanceAbiFactory
                .useAbi(address)
                .proposals(address);
            const statuses = await Promise.all(
                proposals.map((proposal) =>
                    this.governanceAbiFactory
                        .useAbi(address)
                        .proposalStatus(address, proposal.proposalId),
                ),
            );

            for (const [index, status] of statuses.entries()) {
                if (status === GovernanceProposalStatus.Active) {
                    deletePromises.push(
                        this.governanceSetter.deleteUserVotingPower(
                            address,
                            proposals[index].proposalId,
                            caller.bech32(),
                        ),
                    );
                }
            }
        }
        const deletedKeys = await Promise.all(deletePromises)

        cachedKeys.push(
          ...deletedKeys
        )
        await this.deleteCacheKeys(cachedKeys);
        await this.pubSub.publish(SIMPLE_LOCK_ENERGY_EVENTS.ENERGY_UPDATED, {
            updatedEnergy: event,
        });
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
