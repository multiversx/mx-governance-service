import { Injectable } from '@nestjs/common';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { AWSTimestreamQueryService } from '../aws/aws.timestream.query';
import { DataApiQueryService } from '../data-api/data-api.query.service';
import { AnalyticsQueryMode } from '../entities/analytics.query.mode';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class AnalyticsQueryService implements AnalyticsQueryInterface {
  constructor(
    private readonly remoteConfigGetterService: RemoteConfigGetterService,
    private readonly awsQuery: AWSTimestreamQueryService,
    private readonly dataApiQuery: DataApiQueryService,
  ) { }

  async getAggregatedValue(args: { table: any; series: any; metric: any; time: any; }): Promise<string> {
    const service = await this.getService();
    return await service.getAggregatedValue(args);
  }

  async getLatestCompleteValues(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await service.getLatestCompleteValues(args);
  }

  async getSumCompleteValues(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await service.getSumCompleteValues(args);
  }

  async getValues24h(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await service.getValues24h(args);
  }

  async getValues24hSum(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await service.getValues24hSum(args);
  }

  async getLatestHistoricData(args: { table: any, time: any, series: any, metric: any, start: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await service.getLatestHistoricData(args);
  }

  async getLatestBinnedHistoricData(args: { table: any, time: any, series: any, metric: any, bin: any, start: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await service.getLatestBinnedHistoricData(args);
  }

  private async getService(): Promise<AnalyticsQueryInterface> {
    const queryMode = await this.remoteConfigGetterService.getAnalyticsQueryMode();

    if (queryMode === AnalyticsQueryMode.AWS_TIMESTREAM) {
      return this.awsQuery;
    }
    return this.dataApiQuery;
  }
}