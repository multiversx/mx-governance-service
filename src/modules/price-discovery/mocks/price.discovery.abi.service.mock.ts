import { PhaseModel } from '../models/price.discovery.model';
import { IPriceDiscoveryAbiService } from '../services/interfaces';
import { PriceDiscoveryAbiService } from '../services/price.discovery.abi.service';

export class PriceDiscoveryAbiServiceMock implements IPriceDiscoveryAbiService {
    launchedTokenID(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    acceptedTokenID(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async redeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        return 'RTOK-1234';
    }
    launchedTokenAmount(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    acceptedTokenAmount(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    launchedTokenRedeemAmount(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    acceptedTokenRedeemAmount(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    startBlock(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    endBlock(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    currentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        throw new Error('Method not implemented.');
    }
    minLaunchedTokenPrice(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    noLimitPhaseDurationBlocks(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    linearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        throw new Error('Method not implemented.');
    }
    fixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        throw new Error('Method not implemented.');
    }
    lockingScAddress(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    unlockEpoch(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    penaltyMinPercentage(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    penaltyMaxPercentage(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    fixedPenaltyPercentage(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
}

export const PriceDiscoveryAbiServiceProvider = {
    provide: PriceDiscoveryAbiService,
    useClass: PriceDiscoveryAbiServiceMock,
};