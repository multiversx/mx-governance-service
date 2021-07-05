import { Inject } from '@nestjs/common';
import { Query, Args, Resolver } from '@nestjs/graphql';
import { UserToken } from '../../models/user.model';
import { UserTokensArgs } from './dto/user.args';
import { UserNftTokens } from './nfttokens.union';
import { UserService } from './user.service';

@Resolver()
export class UserResolver {
    constructor(@Inject(UserService) private userService: UserService) {}

    @Query(returns => [UserToken])
    async tokens(@Args() args: UserTokensArgs): Promise<UserToken[]> {
        return await this.userService.getAllEsdtTokens(args);
    }

    @Query(returns => [UserNftTokens])
    async nfts(
        @Args() args: UserTokensArgs,
    ): Promise<Array<typeof UserNftTokens>> {
        return await this.userService.getAllNftTokens(args);
    }
}