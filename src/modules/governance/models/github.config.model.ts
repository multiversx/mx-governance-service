export class GithubConfig {
    user: string;
    repository: string;
    branch: string;

    constructor(init?: Partial<GithubConfig>) {
        Object.assign(this, init);
    }
}