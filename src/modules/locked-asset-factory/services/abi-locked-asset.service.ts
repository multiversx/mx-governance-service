import { Injectable } from '@nestjs/common';
import { Interaction } from '@multiversx/sdk-core/out';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiLockedAssetService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    async getLockedTokenID(): Promise<string> {
        const contract =
            await this.mxProxy.getLockedAssetFactorySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedAssetTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }
}
