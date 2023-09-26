import { EnergyType } from '@multiversx/sdk-exchange';

export interface IEnergyComputeService {
    depleteUserEnergy(
        energyEntry: EnergyType,
        currentEpoch: number,
    ): EnergyType;
}

export interface IEnergyAbiService {
    energyEntryForUser(userAddress: string): Promise<EnergyType>;
    energyAmountForUser(userAddress: string): Promise<string>;
    isPaused(): Promise<boolean>;
}
