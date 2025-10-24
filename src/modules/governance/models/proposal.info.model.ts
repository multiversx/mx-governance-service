export declare type ProposalInfoModel = {
    cost: string;
    commitHash: string;
    nonce: number;
    issuer: string;
    startVoteEpoch: number;
    endVoteEpoch: number;
    quorumStake: string;
    numYesVotes: string;
    numNoVotes: string;
    numVetoVotes: string;
    numAbstainVotes: string;
    isClosed: boolean;
    isPassed: boolean;
};