import { Field, Int, ObjectType } from '@nestjs/graphql';
import { FarmTokenAttributesModel } from '../farm.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class FarmToken extends NftToken {
    @Field(type => Int) decimals: number;
    @Field(type => FarmTokenAttributesModel)
    decodedAttributes: FarmTokenAttributesModel;
}