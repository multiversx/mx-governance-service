import { Injectable } from '@nestjs/common';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { EnergyModel } from '../models/energy.model';
import { EnergyAbiService } from './energy.abi.service';
import { EnergyComputeService } from './energy.compute.service';

@Injectable()
export class EnergyService {
    constructor(
        private readonly energyAbi: EnergyAbiService,
        private readonly energyCompute: EnergyComputeService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    async getUserEnergy(
        userAddress: string,
        vmQuery = false,
    ): Promise<EnergyModel> {
        if (vmQuery) {
            const userEnergyEntry =
                await this.energyAbi.getEnergyEntryForUserRaw(userAddress);
            return new EnergyModel(userEnergyEntry);
        }
        const [userEnergyEntry, currentEpoch] = await Promise.all([
            this.energyAbi.energyEntryForUser(userAddress),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const depletedEnergy = this.energyCompute.depleteUserEnergy(
            userEnergyEntry,
            currentEpoch,
        );

        return new EnergyModel(depletedEnergy);
    }
}
