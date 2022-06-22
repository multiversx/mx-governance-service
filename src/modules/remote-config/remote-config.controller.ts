import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Res,
    UseGuards,
} from '@nestjs/common';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { SCAddressRepositoryService } from 'src/services/database/repositories/scAddress.repository';
import { JwtAdminGuard } from '../auth/jwt.admin.guard';
import { FlagArgs } from './args/flag.args';
import { FlagModel } from './models/flag.model';
import { SCAddressModel, SCAddressType } from './models/sc-address.model';
import { Response } from 'express';
import { RemoteConfigSetterService } from './remote-config.setter.service';
import mongoose from 'mongoose';

@Controller('remote-config')
export class RemoteConfigController {
    constructor(
        private readonly flagRepositoryService: FlagRepositoryService,
        private readonly scAddressRepositoryService: SCAddressRepositoryService,
        private readonly remoteConfigSetterService: RemoteConfigSetterService,
    ) {}

    @UseGuards(JwtAdminGuard)
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

    @UseGuards(JwtAdminGuard)
    @Put('/flags')
    async updateRemoteConfigFlag(
        @Body() flag: FlagArgs,
        @Res() res: Response,
    ): Promise<FlagModel | Response> {
        try {
            if (flag.name && flag.value != null) {
                const result = await this.flagRepositoryService.findOneAndUpdate(
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

    @UseGuards(JwtAdminGuard)
    @Get('/flags')
    async getRemoteConfigFlags(): Promise<FlagModel[]> {
        return await this.flagRepositoryService.find({});
    }

    @UseGuards(JwtAdminGuard)
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
            .then(result => {
                if (result) return res.status(200).send(result);
                return res.status(404).send();
            });
    }

    @UseGuards(JwtAdminGuard)
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

    @UseGuards(JwtAdminGuard)
    @Post('/sc-address')
    async addRemoteConfigSCAddress(
        @Body() scAddress: SCAddressModel,
        @Res() res: Response,
    ) {
        try {
            if (
                scAddress.address &&
                scAddress.category &&
                scAddress.category in SCAddressType
            ) {
                const newSCAddress = await this.scAddressRepositoryService.create(
                    scAddress,
                );
                if (newSCAddress) {
                    await this.remoteConfigSetterService.setSCAddressesFromDB(
                        scAddress.category,
                    );
                    return res.status(201).send(newSCAddress);
                }
            }

            return res
                .status(500)
                .send(
                    `SC address & category not found, not in application/json format or category not in SCAddressType enum.`,
                );
        } catch (error) {
            return res.status(500).send(error.message);
        }
    }

    @UseGuards(JwtAdminGuard)
    @Get('/sc-address')
    async getRemoteConfigSCAddresses(): Promise<SCAddressModel[]> {
        return await this.scAddressRepositoryService.find({});
    }

    @UseGuards(JwtAdminGuard)
    @Get('/sc-address/:addressOrID')
    async getRemoteConfigSCAddress(
        @Param('addressOrID') addressOrID: string,
        @Res() res: Response,
    ): Promise<SCAddressModel | Response> {
        return await this.scAddressRepositoryService
            .findOne(
                mongoose.Types.ObjectId.isValid(addressOrID)
                    ? { _id: addressOrID }
                    : { address: addressOrID },
            )
            .then(result => {
                if (result) return res.status(200).send(result);
                return res.status(404).send();
            });
    }

    @UseGuards(JwtAdminGuard)
    @Delete('/sc-address/:addressOrID')
    async deleteRemoteConfigSCAddress(
        @Param('addressOrID') addressOrID: string,
    ): Promise<boolean> {
        const entity = await this.scAddressRepositoryService.findOneAndDelete(
            mongoose.Types.ObjectId.isValid(addressOrID)
                ? { _id: addressOrID }
                : { address: addressOrID },
        );

        if (entity) {
            await this.remoteConfigSetterService.setSCAddressesFromDB(
                entity.category,
            );
            return true;
        }

        return false;
    }
}