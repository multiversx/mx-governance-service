import { Constants } from '@multiversx/sdk-nestjs-common';

export class CacheTtlInfo {
    remoteTtl: number;
    localTtl?: number;
    cacheKey?: string;

    constructor(remoteTtl = Constants.oneMinute(), localTtl?: number, cacheKey?: string) {
        this.remoteTtl = remoteTtl;
        this.localTtl = localTtl ? localTtl : this.remoteTtl / 2;
        if(cacheKey) {
            this.cacheKey = cacheKey;
        }
    }

    static Token: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 10,
        Constants.oneMinute() * 5,
    );

    static ContractState: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 10,
        Constants.oneMinute() * 3,
    );

    static ContractInfo: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 3,
        Constants.oneMinute(),
    );

    static ContractBalance: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute(),
        Constants.oneSecond() * 30,
    );

    static Price: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute(),
        Constants.oneSecond() * 30,
    );

    static Analytics: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 30,
        Constants.oneMinute() * 10,
    );

    static Attributes: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneHour(),
        Constants.oneMinute() * 45,
    );

    static BlockTime: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneSecond() * 6,
        Constants.oneSecond() * 6, 
    );

    static GithubProposals: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 3,
        Constants.oneMinute() * 3, 
        `governance:github:proposals`
    );

    static DynamicInfo: CacheTtlInfo = new CacheTtlInfo(
        Constants.oneMinute() * 3,
        Constants.oneMinute() * 3, 
    );
}
