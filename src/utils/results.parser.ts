import { ArgSerializer, ReturnCode, Type, TypedOutcomeBundle, TypedValue } from "@multiversx/sdk-core/out";

enum WellKnownEvents {
    OnTransactionCompleted = "completedTxEvent",
    OnSignalError = "signalError",
    OnWriteLog = "writeLog"
}

enum WellKnownTopics {
    TooMuchGas = "@too much gas provided for processing"
}

interface IResultsParserOptions {
    argsSerializer: IArgsSerializer;
}

interface IParameterDefinition {
    type: Type;
}

interface IEventInputDefinition {
    name: string;
    type: Type;
    indexed: boolean;
}

interface ITransactionEvent {
    readonly topics: { valueOf(): Uint8Array }[];
    readonly dataPayload?: { valueOf(): Uint8Array };
    readonly additionalData?: { valueOf(): Uint8Array }[];
}

interface IArgsSerializer {
    buffersToValues(buffers: Buffer[], parameters: IParameterDefinition[]): TypedValue[];
    stringToBuffers(joinedString: string): Buffer[];
}

// TODO: perhaps move default construction options to a factory (ResultsParserFactory), instead of referencing them in the constructor
// (postpone as much as possible, breaking change)
const defaultResultsParserOptions: IResultsParserOptions = {
    argsSerializer: new ArgSerializer()
};

/**
 * Parses contract query responses and smart contract results.
 * The parsing involves some heuristics, in order to handle slight inconsistencies (e.g. some SCRs are present on API, but missing on Gateway).
 */
export class ResultsParser {
    private readonly argsSerializer: IArgsSerializer;

    constructor(options?: IResultsParserOptions) {
        options = { ...defaultResultsParserOptions, ...options };
        this.argsSerializer = options.argsSerializer;
    }

    parseQueryResponse(queryResponse: any, endpoint: { output: IParameterDefinition[] }): TypedOutcomeBundle {
        const parts = queryResponse.getReturnDataParts();
        const values = this.argsSerializer.buffersToValues(parts, endpoint.output);
        const returnCode = new ReturnCode(queryResponse.returnCode.toString());

        return {
            returnCode: returnCode,
            returnMessage: queryResponse.returnMessage,
            values: values,
            firstValue: values[0],
            secondValue: values[1],
            thirdValue: values[2],
            lastValue: values[values.length - 1]
        };
    }
}
