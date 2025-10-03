import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql';


@ArgsType()
export class VotePollArgs {
    @Field()
    contractAddress: string;
    @Field()
    pollId: number;
    @Field()
    optionId: number;
    votingPower?: string;
    proof?: Buffer;

    constructor(init: Partial<VotePollArgs>) {
        Object.assign(this, init);
    }
}

@ArgsType()
export class EndPollArgs {
    @Field()
    contractAddress: string;
    @Field(() => Int)
    pollId: number;
}

export enum PollStatus {
  ONGOING = 'Ongoing',
  ENDED = 'Ended'
}

@ArgsType()
export class NewPollArgs {
    @Field()
    contractAddress!: string;
    @Field()
    question!: string;
    @Field(() => [String])
    options!: string[];
    @Field(() => Int)
    duration!: number; // in seconds
}

@ObjectType()
export class PollResults {
    @Field(() => [PollResult])
    pollResults: PollResult[];

    @Field(() => Int)
    totalVotesCount: number

    @Field()
    totalVotingPower: string

    constructor(init: Partial<PollResults>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PollResult {
    @Field(() => Int)
    optionId: number

    @Field()
    votingPower: string

    @Field()
    nrVotes: number;

    constructor(init: Partial<PollResult>) {
        Object.assign(this, init);
    }
}

export class PollInfoRaw {
    initiator: string;
    question: string;
    options: string[];
    voteScore: string[];
    endTime: number;
    status: boolean;

    constructor(init: Partial<PollInfoRaw>) {
        Object.assign(this, init);
    }
}

export class IdeaInfoRaw {
    initiator: string;
    description: string;
    voteScore: string[];
    proposeTime: number;

    constructor(init: Partial<IdeaInfoRaw>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PulsePollModel {
    @Field()
    contractAddress: string;
    @Field()
    pollId: number;
    @Field()
    initiator: string;
    @Field(() => [String])
    options: string[];
    @Field(() => String)
    question: string;
    @Field()
    status: PollStatus;
    @Field(() => Int)
    pollEndTime: number;
    @Field()
    pollResults?: PollResults;
    @Field()
    hasVoted?: boolean;
    @Field()
    userVotingOption?: number;
    
    constructor(init: Partial<PulsePollModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PulseIdeaModel {
    @Field()
    contractAddress: string;
    @Field()
    proposalId: number;
    @Field()
    initiator: string;
    @Field(() => String)
    description: string;
    @Field(() => Int)
    proposalTime: number;
    @Field(() => Int)
    totalVotesCount: number
    @Field()
    totalVotingPower: string
    @Field()
    hasVoted?: boolean;

    constructor(init: Partial<PulseIdeaModel>) {
        Object.assign(this, init);
    }
}
