import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { QueryType } from '@multiversx/sdk-nestjs-elastic';
import { ElasticQuery } from '@multiversx/sdk-nestjs-elastic';
import { ElasticService } from 'src/helpers/elastic.service';
import { TransactionType } from 'src/helpers/entities/transaction.type';

@Injectable()
export class MetricsService {
    constructor(
        private readonly elasticService: ElasticService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async computeTxCount(address: string): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
        ];
        elasticQueryAdapter.withMustMatchCondition('type', TransactionType.NORMAL_TRANSACTION)
        return await this.elasticService.getCount(
            'operations',
            elasticQueryAdapter,
        );
    }

    async computePairSwapCount(address: string): Promise<number> {
        let swapTxCount = 0;
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();

        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
            QueryType.Wildcard(
                'data',
                '*QDczNzc2MTcwNTQ2ZjZiNjU2ZTczNDY2OTc4NjU2NDQ5NmU3MDc1NzR*',
            ),
        ];
        elasticQueryAdapter.withMustMatchCondition('type', TransactionType.NORMAL_TRANSACTION)
        let txCount = await this.elasticService.getCount(
            'operations',
            elasticQueryAdapter,
        );
        swapTxCount += txCount;

        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
            QueryType.Wildcard(
                'data',
                '*QDczNzc2MTcwNTQ2ZjZiNjU2ZTczNDY2OTc4NjU2NDRmNzU3NDcwNzU3NE*',
            ),
        ];
        elasticQueryAdapter.withMustMatchCondition('type', TransactionType.NORMAL_TRANSACTION)
        txCount = await this.elasticService.getCount(
            'operations',
            elasticQueryAdapter,
        );
        swapTxCount += txCount;

        return swapTxCount;
    }

    async computePairAddLiquidityCount(address: string): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
            QueryType.Wildcard('data', '*YWRkTGlxdWlkaXR*'),
        ];
        elasticQueryAdapter.withMustMatchCondition('type', TransactionType.NORMAL_TRANSACTION)
        return await this.elasticService.getCount(
            'operations',
            elasticQueryAdapter,
        );
    }

    async computePairRemoveLiquidityCount(address: string): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
            QueryType.Wildcard(
                'data',
                '*QDcyNjU2ZDZmNzY2NTRjNjk3MTc1Njk2NDY5NzQ3OU*',
            ),
        ];
        elasticQueryAdapter.withMustMatchCondition('type', TransactionType.NORMAL_TRANSACTION)
        return await this.elasticService.getCount(
            'operations',
            elasticQueryAdapter,
        );
    }

    async computeEventsCount(
        address: string,
        eventIdentifier: string,
    ): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Nested('events', [
                QueryType.Match('events.address', address),
                QueryType.Match('events.identifier', eventIdentifier),
            ]),
        ];

        return await this.elasticService.getCount('logs', elasticQueryAdapter);
    }

    async computeUniqueUsers(address: string): Promise<number> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', address),
        ];
        elasticQueryAdapter.withMustMatchCondition('type', TransactionType.NORMAL_TRANSACTION)
        const transactions = await this.elasticService.getList(
            'operations',
            'sender',
            elasticQueryAdapter,
        );

        const uniqueUsersMap = new Map<string, number>();
        for (const transaction of transactions) {
            const sender = transaction._source.sender;
            if (!uniqueUsersMap.has(sender)) {
                uniqueUsersMap.set(sender, 1);
            } else {
                uniqueUsersMap.set(sender, uniqueUsersMap.get(sender) + 1);
            }
        }

        return uniqueUsersMap.size;
    }

    async computeAvgUserTransactions(address: string): Promise<number> {
        const [totalTxCount, uniqueUsersCount] = await Promise.all([
            this.computeTxCount(address),
            this.computeUniqueUsers(address),
        ]);
        return totalTxCount / uniqueUsersCount;
    }
}
