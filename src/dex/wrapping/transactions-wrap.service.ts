import { Injectable } from '@nestjs/common';
import {
    Interaction,
    GasLimit,
    Balance,
    BytesValue,
    BigUIntValue,
} from '@elrondnetwork/erdjs';
import { ContextService } from '../utils/context.service';
import { TransactionModel } from '../models/transaction.model';
import { AbiWrapService } from './abi-wrap.service';
import { gasConfig } from 'src/config';
import { WrapService } from './wrap.service';

@Injectable()
export class TransactionsWrapService {
    constructor(
        private abiService: AbiWrapService,
        private wrapService: WrapService,
        private context: ContextService,
    ) {}

    async wrapEgld(amount: string): Promise<TransactionModel> {
        const contract = await this.abiService.getContract();
        const interaction: Interaction = contract.methods.wrapEgld([]);
        const transaction = interaction.buildTransaction();
        transaction.setValue(new Balance(amount));
        transaction.setGasLimit(new GasLimit(gasConfig.default));

        return transaction.toPlainObject();
    }

    async unwrapEgld(amount: string): Promise<TransactionModel> {
        const contract = await this.abiService.getContract();

        const wrappedEgldToken = await this.wrapService.getWrappedEgldToken();

        const args = [
            BytesValue.fromUTF8(wrappedEgldToken.token),
            new BigUIntValue(
                this.context.toBigNumber(amount, wrappedEgldToken),
            ),
            BytesValue.fromUTF8('unwrapEgld'),
        ];

        return this.context.esdtTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );
    }
}