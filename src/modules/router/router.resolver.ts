import { RouterService } from './router.service';
import {
    Resolver,
    Query,
    ResolveField,
    Parent,
    Args,
    Int,
} from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { GetPairsArgs, PairModel } from '../../models/pair.model';
import { FactoryModel } from '../../models/factory.model';

@Resolver(of => FactoryModel)
export class RouterResolver {
    constructor(@Inject(RouterService) private routerService: RouterService) {}

    @Query(returns => FactoryModel)
    async factory() {
        return this.routerService.getFactory();
    }

    @ResolveField(returns => Int!)
    async pairCount(@Parent() factoryModel: FactoryModel) {
        return this.routerService.getPairCount();
    }

    @ResolveField(returns => Int!)
    async totalTxCount(@Parent() factoryModel: FactoryModel) {
        return this.routerService.getTotalTxCount();
    }

    @Query(returns => [String])
    async pairAddresses(): Promise<string[]> {
        return this.routerService.getAllPairsAddress();
    }

    @Query(returns => [PairModel])
    async pairs(@Args() page: GetPairsArgs): Promise<PairModel[]> {
        return this.routerService.getAllPairs(page.offset, page.limit);
    }

    @Query(returns => TransactionModel)
    async createPair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
    ): Promise<TransactionModel> {
        return this.routerService.createPair(firstTokenID, secondTokenID);
    }

    @Query(returns => TransactionModel)
    async issueLPToken(
        @Args('address') address: string,
        @Args('lpTokenName') lpTokenName: string,
        @Args('lpTokenTicker') lpTokenTicker: string,
    ): Promise<TransactionModel> {
        return this.routerService.issueLpToken(
            address,
            lpTokenName,
            lpTokenTicker,
        );
    }

    @Query(returns => TransactionModel)
    async setLocalRoles(
        @Args('address') address: string,
    ): Promise<TransactionModel> {
        return this.routerService.setLocalRoles(address);
    }

    @Query(returns => TransactionModel)
    async setState(
        @Args('address') address: string,
        @Args('enable') enable: boolean,
    ): Promise<TransactionModel> {
        return this.routerService.setState(address, enable);
    }

    @Query(returns => TransactionModel)
    async setFee(
        @Args('pairAddress') pairAddress: string,
        @Args('feeToAddress') feeToAddress: string,
        @Args('feeTokenID') feeTokenID: string,
        @Args('enable') enable: boolean,
    ): Promise<TransactionModel> {
        return this.routerService.setFee(
            pairAddress,
            feeToAddress,
            feeTokenID,
            enable,
        );
    }
}