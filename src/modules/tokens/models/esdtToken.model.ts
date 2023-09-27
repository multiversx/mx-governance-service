import { ObjectType } from '@nestjs/graphql';
import { AssetsModel } from './assets.model';
import { IEsdtToken } from './esdtToken.interface';

@ObjectType({
    implements: () => [IEsdtToken],
})
export class EsdtToken implements IEsdtToken {
    identifier: string;
    name: string;
    ticker: string;
    owner: string;
    minted?: string;
    burnt?: string;
    initialMinted?: string;
    decimals: number;
    price?: string;
    supply?: string;
    circulatingSupply?: string;
    assets?: AssetsModel;
    transactions: number;
    accounts: number;
    isPaused: boolean;
    canUpgrade: boolean;
    canMint: boolean;
    canBurn: boolean;
    canChangeOwner: boolean;
    canPause: boolean;
    canFreeze: boolean;
    canWipe: boolean;
    type?: string;
    balance?: string;

    constructor(init?: Partial<EsdtToken>) {
        Object.assign(this, init);
        this.assets = new AssetsModel(init.assets);
    }
}
