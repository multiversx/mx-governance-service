import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { RewardsModel } from '../../models/farm.model';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { FarmAbiServiceV1_3 } from './farm.v1.3.abi.service';
import { FarmGetterServiceV1_3 } from './farm.v1.3.getter.service';
import { FarmComputeServiceV1_3 } from './farm.v1.3.compute.service';
import { FarmTokenAttributesV1_3 } from '@multiversx/sdk-exchange';
import { FarmTokenAttributesModelV1_3 } from '../../models/farmTokenAttributes.model';
import { FarmServiceBase } from '../../base-module/services/farm.base.service';

@Injectable()
export class FarmServiceV1_3 extends FarmServiceBase {
    constructor(
        protected readonly abiService: FarmAbiServiceV1_3,
        @Inject(forwardRef(() => FarmGetterServiceV1_3))
        protected readonly farmGetter: FarmGetterServiceV1_3,
        protected readonly farmCompute: FarmComputeServiceV1_3,
        protected readonly contextGetter: ContextGetterService,
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            abiService,
            farmGetter,
            farmCompute,
            contextGetter,
            cachingService,
            logger,
        );
    }

    async getRewardsForPosition(
        positon: CalculateRewardsArgs,
    ): Promise<RewardsModel> {
        const farmTokenAttributes = FarmTokenAttributesV1_3.fromAttributes(
            positon.attributes,
        );
        let rewards: BigNumber;
        if (positon.vmQuery) {
            rewards = await this.abiService.calculateRewardsForGivenPosition(
                positon,
            );
        } else {
            rewards = await this.farmCompute.computeFarmRewardsForPosition(
                positon,
                farmTokenAttributes.rewardPerShare,
            );
        }

        return new RewardsModel({
            identifier: positon.identifier,
            remainingFarmingEpochs: await this.getRemainingFarmingEpochs(
                positon.farmAddress,
                farmTokenAttributes.enteringEpoch,
            ),
            rewards: rewards.integerValue().toFixed(),
        });
    }

    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModelV1_3 {
        return new FarmTokenAttributesModelV1_3({
            ...FarmTokenAttributesV1_3.fromAttributes(attributes).toJSON(),
            attributes: attributes,
            identifier: identifier,
        });
    }
}