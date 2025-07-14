import * as crypto from 'crypto';

export class PendingExecutor<TIN, TOUT> {
    private dictionary: Record<string, Promise<TOUT>> = {};

    constructor(private readonly executor: (value: any) => Promise<TOUT>) { }

    async execute(value: TIN): Promise<TOUT> {
        // can not stringify bigint
        const key = crypto.createHash('md5').update(JSON.stringify(value, (_key, val) =>
                        typeof val === 'bigint' ? val.toString() : val
                        )).digest('hex');

        let pendingRequest = this.dictionary[key];
        if (pendingRequest) {
            return await pendingRequest;
        }

        pendingRequest = this.executor(value);
        this.dictionary[key] = pendingRequest;

        try {
            return await pendingRequest;
        } finally {
            delete this.dictionary[key];
        }
    }
}
