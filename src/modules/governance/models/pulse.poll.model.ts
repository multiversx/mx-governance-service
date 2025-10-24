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
export class VoteUpIdeaArgs {
    @Field()
    contractAddress: string;
    @Field()
    ideaId: number;
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

@ArgsType()
export class NewIdeaArgs {
    @Field()
    contractAddress: string;
    @Field()
    description: string;
    votingPower?: string;
    proof?: Buffer;

    constructor(init: Partial<NewIdeaArgs>) {
        Object.assign(this, init);
    }
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
    voteScore: string;
    ideaStartTime: number;

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
    @Field()
    userVotingPower?: string;
    @Field()
    index?: number;
    
    constructor(init: Partial<PulsePollModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PulseIdeaModel {
    @Field()
    contractAddress: string;
    @Field()
    ideaId: number;
    @Field()
    initiator: string;
    @Field(() => String)
    description: string;
    @Field(() => Int)
    ideaStartTime: number;
    @Field()
    totalVotingPower: string
    @Field(() => Int)
    totalVotesCount: number
    @Field()
    hasVoted?: boolean;
    @Field()
    userVotingPower?: string;
    @Field(() => Int)
    index?: number;

    constructor(init: Partial<PulseIdeaModel>) {
        Object.assign(this, init);
    }
}

