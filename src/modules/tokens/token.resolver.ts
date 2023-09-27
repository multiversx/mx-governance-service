import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AssetsModel } from './models/assets.model';
import { EsdtToken } from './models/esdtToken.model';

@Resolver(() => EsdtToken)
export class TokensResolver {

    @ResolveField(() => AssetsModel, { nullable: true })
    async assets(@Parent() parent: EsdtToken): Promise<AssetsModel> {
        return new AssetsModel(parent.assets);
    }
}
