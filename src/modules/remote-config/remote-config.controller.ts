import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { FlagArgs } from './args/flag.args';
import { FlagModel } from './models/flag.model';
import { Response } from 'express';
import { RemoteConfigSetterService } from './remote-config.setter.service';
import mongoose from 'mongoose';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { CacheKeysArgs } from './args/cacheKeys.args';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { NativeAdminGuard } from '../auth/native.admin.guard';

@Controller('remote-config')
export class RemoteConfigController {
    constructor(
        private readonly flagRepositoryService: FlagRepositoryService,
        private readonly remoteConfigSetterService: RemoteConfigSetterService,
        private readonly cacheService: CacheService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @UseGuards(NativeAdminGuard)
    @Post('/flags')
    async addRemoteConfigFlag(
        @Body() flag: FlagArgs,
        @Res() res: Response,
    ): Promise<FlagModel | Response> {
        try {
            if (flag.name && flag.value != null) {
                const result = await this.flagRepositoryService.create(flag);
                this.remoteConfigSetterService.setFlag(
                    result.name,
                    result.value,
                );
                return res.status(201).send(result);
            }

            return res
                .status(500)
                .send(
                    'Flag name & value not found or not in application/json format.',
                );
        } catch (error) {
            return res.status(500).send(error.message);
        }
    }

    @UseGuards(NativeAdminGuard)
    @Put('/flags')
    async updateRemoteConfigFlag(
        @Body() flag: FlagArgs,
        @Res() res: Response,
    ): Promise<FlagModel | Response> {
        try {
            if (flag.name && flag.value != null) {
                const result =
                    await this.flagRepositoryService.findOneAndUpdate(
                        { name: flag.name },
                        flag,
                    );

                if (result) {
                    await this.remoteConfigSetterService.setFlag(
                        result.name,
                        result.value,
                    );
                    return res.status(201).send(result);
                }

                return res.status(404);
            }

            return res
                .status(500)
                .send(
                    'Flag name & value not found or not in application/json format.',
                );
        } catch (error) {
            return res.status(500).send(error.message);
        }
    }

    @UseGuards(NativeAdminGuard)
    @Get('/flags')
    async getRemoteConfigFlags(): Promise<FlagModel[]> {
        return await this.flagRepositoryService.find({});
    }

    @UseGuards(NativeAdminGuard)
    @Get('/flags/:nameOrID')
    async getRemoteConfigFlag(
        @Param('nameOrID') nameOrID: string,
        @Res() res: Response,
    ): Promise<FlagModel | Response> {
        return await this.flagRepositoryService
            .findOne(
                mongoose.Types.ObjectId.isValid(nameOrID)
                    ? { _id: nameOrID }
                    : { name: nameOrID },
            )
            .then((result) => {
                if (result) return res.status(200).send(result);
                return res.status(404).send();
            });
    }

    @UseGuards(NativeAdminGuard)
    @Delete('/flags/:nameOrID')
    async deleteRemoteConfigFlag(
        @Param('nameOrID') nameOrID: string,
    ): Promise<boolean> {
        const flag = await this.flagRepositoryService.findOneAndDelete(
            mongoose.Types.ObjectId.isValid(nameOrID)
                ? { _id: nameOrID }
                : { name: nameOrID },
        );

        if (flag) {
            await this.remoteConfigSetterService.deleteFlag(flag.name);
            return true;
        }

        return false;
    }

    @UseGuards(NativeAdminGuard)
    @Post('/cache/delete-keys')
    async deleteCacheKeys(
        @Body() cacheKeys: CacheKeysArgs,
        @Res() res: Response,
    ): Promise<Response> {
        for (const key of cacheKeys.keys) {
            await this.cacheService.deleteInCache(key);
        }
        await this.pubSub.publish('deleteCacheKeys', cacheKeys.keys);
        return res.status(200).send();
    }

    @UseGuards(NativeAdminGuard)
    @Post('/cache/get-keys')
    async getCacheKeys(
        @Body() cacheKeys: CacheKeysArgs,
        @Res() res: Response,
    ): Promise<Response> {
        const keys = [];
        for (const key of cacheKeys.keys) {
            keys.push(await this.cacheService.get(key));
        }
        return res.status(200).send(keys);
    }
}
