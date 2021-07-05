import { Test, TestingModule } from '@nestjs/testing';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { RedlockService } from '../../services';
import { CachePairService } from '../../services/cache-manager/cache-pair.service';
import { AbiPairService } from './abi-pair.service';
import { PairService } from './pair.service';
import {
    AbiPairServiceMock,
    CachePairServiceMock,
    ContextServiceMock,
    PriceFeedServiceMock,
    RedlockServiceMock,
} from './pair.test-constants';
import { ContextService } from '../../services/context/context.service';

describe('PairService', () => {
    let service: PairService;

    const AbiPairServiceProvider = {
        provide: AbiPairService,
        useClass: AbiPairServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const CachePairServiceProvider = {
        provide: CachePairService,
        useClass: CachePairServiceMock,
    };

    const RedlockServiceProvider = {
        provide: RedlockService,
        useClass: RedlockServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AbiPairServiceProvider,
                CachePairServiceProvider,
                ContextServiceProvider,
                RedlockServiceProvider,
                PriceFeedServiceProvider,
                PairService,
            ],
        }).compile();

        service = module.get<PairService>(PairService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get first token', async () => {
        const firstToken = await service.getFirstToken('pair_address_1');
        expect(firstToken).toEqual({
            token: 'WEGLD-b9cba1',
            name: 'WEGLD-b9cba1',
            type: 'FungibleESDT',
            owner: 'user_address_1',
            minted: '0',
            burnt: '0',
            decimals: 18,
            isPaused: false,
            canUpgrade: true,
            canMint: true,
            canBurn: true,
            canChangeOwner: true,
            canPause: true,
            canFreeze: true,
            canWipe: true,
        });
    });

    it('should get all temporary funds for user', async () => {
        const allTemporaryFunds = await service.getTemporaryFunds(
            'user_address_1',
        );
        expect(allTemporaryFunds[0]).toEqual({
            pairAddress: 'pair_address_1',
            firstToken: {
                token: 'WEGLD-b9cba1',
                name: 'WEGLD-b9cba1',
                type: 'FungibleESDT',
                owner: 'user_address_1',
                minted: '0',
                burnt: '0',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
            },
            firstAmount: '100',
            secondToken: {
                token: 'MEX-bd9937',
                name: 'MEX-bd9937',
                type: 'FungibleESDT',
                owner: 'user_address_1',
                minted: '0',
                burnt: '0',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
            },
            secondAmount: '100',
        });
    });

    it('should get simple token price in USD', async () => {
        const tokenPriceUSD = await service.getTokenPriceUSD(
            'pair_address_1',
            'MEX-bd9937',
        );
        expect(tokenPriceUSD.toFixed()).toEqual('50');
    });

    it('should get token price in USD from simple path', async () => {
        const tokenPriceUSD = await service.getTokenPriceUSD(
            'pair_address_3',
            'BUSD-fd5ddb',
        );
        expect(tokenPriceUSD.toFixed()).toEqual('100');
    });

    it('should get token price in USD from multiple path', async () => {
        const tokenPriceUSD = await service.getTokenPriceUSD(
            'pair_address_4',
            'SPT-f66742',
        );
        expect(tokenPriceUSD.toFixed()).toEqual('16.66666666666666665');
    });

    it('should get liquidity position from pair', async () => {
        const liquidityPosition = await service.getLiquidityPosition(
            'pair_address_1',
            '1',
        );
        expect(liquidityPosition).toEqual({
            firstTokenAmount: '1',
            secondTokenAmount: '2',
        });
    });

    it('should get lpToken Price from pair', async () => {
        const lpTokenPrice = await service.getLpTokenSecondTokenEquivalent(
            'pair_address_1',
        );
        expect(lpTokenPrice).toEqual('4');
    });

    it('should get lpToken Price in USD from pair', async () => {
        const lpTokenPriceUSD = await service.getLpTokenPriceUSD(
            'pair_address_1',
        );
        expect(lpTokenPriceUSD).toEqual('200');
    });
});