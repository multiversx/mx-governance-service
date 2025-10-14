export class GithubConfig {
    owner: string;
    repository: string;
    branch: string;

    constructor(init?: Partial<GithubConfig>) {
        Object.assign(this, init);
    }
}