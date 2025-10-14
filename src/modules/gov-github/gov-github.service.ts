import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { githubConfig } from 'src/config';

@Injectable()
export class GovGithubService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
        const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');
        const oauthTokenUrl = 'https://github.com/login/oauth/access_token';
        try {
            const response = await this.httpService.axiosRef.post(
                oauthTokenUrl,
                {
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                },
                {
                    headers: { Accept: 'application/json' },
                },
            );
            const data = response.data;
            if (!data.access_token) {
                throw new HttpException(
                    data.error_description || data.error || 'No access token returned from GitHub',
                    400,
                );
            }
            return { access_token: data.access_token };
        } catch (err) {
            const error = err as { response?: { data?: unknown; status?: number } };
            const message: string | Record<string, unknown> =
                typeof error.response?.data === 'string'
                    ? error.response.data
                    : (error.response?.data as Record<string, unknown>) || 'GitHub API request failed';
            const status: number =
                typeof error.response?.status === 'number' ? error.response.status : 500;
            throw new HttpException(message, status);
        }
    }

    async createProposal(dto: {
        title: string;
        description: string;
        proposal: string;
        accessToken: string;
        user: string;
    }): Promise<{ url: string }> {
        const { title, description, proposal, accessToken, user } = dto;
        // const owner = this.configService.get<string>('GITHUB_OWNER');
        const owner = githubConfig.owner;
        // const repo = this.configService.get<string>('GITHUB_REPO');
        const repo = githubConfig.repository;
        const baseBranch = githubConfig.branch;
        // const baseBranch = this.configService.get<string>('GITHUB_BASE_BRANCH');
        const apiBase = 'https://api.github.com';
        const headers = {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
        };
        try {
            const forkRes = await this.httpService.axiosRef.post(
                `${apiBase}/repos/${owner}/${repo}/forks`,
                {},
                { headers },
            );
            const forkOwner = forkRes.data.owner.login;
            const forkRepo = forkRes.data.name;
            await new Promise((resolve) => setTimeout(resolve, 10000));
            const refRes = await this.httpService.axiosRef.get(
                `${apiBase}/repos/${forkOwner}/${forkRepo}/git/ref/heads/${baseBranch}`,
                { headers },
            );
            const baseCommitSha = refRes.data.object.sha;
            const branchName = `proposal-${Date.now()}`;
            await this.httpService.axiosRef.post(
                `${apiBase}/repos/${forkOwner}/${forkRepo}/git/refs`,
                { ref: `refs/heads/${branchName}`, sha: baseCommitSha },
                { headers },
            );
            const blobRes = await this.httpService.axiosRef.post(
                `${apiBase}/repos/${forkOwner}/${forkRepo}/git/blobs`,
                {
                    content: Buffer.from(title + '\n' + description + '\n' + proposal + '\n' + user).toString('base64'),
                    encoding: 'base64',
                },
                { headers },
            );
            const commitRes = await this.httpService.axiosRef.get(
                `${apiBase}/repos/${forkOwner}/${forkRepo}/git/commits/${baseCommitSha}`,
                { headers },
            );
            const baseTreeSha = commitRes.data.tree.sha;
            // const folder = process.env.NODE_ENV === 'devnet' || process.env.NODE_ENV === 'testnet'
                // ? `${process.env.NODE_ENV}/proposals`
                // : 'proposals';
            const folder = 'proposals';
            const filePath = `${folder}/${branchName}.md`;
            const treeRes = await this.httpService.axiosRef.post(
                `${apiBase}/repos/${forkOwner}/${forkRepo}/git/trees`,
                {
                    base_tree: baseTreeSha,
                    tree: [
                        {
                            path: filePath,
                            mode: '100644',
                            type: 'blob',
                            sha: blobRes.data.sha,
                        },
                    ],
                },
                { headers },
            );
            const commitMessage = `Add proposal: ${title}`;
            const newCommitRes = await this.httpService.axiosRef.post(
                `${apiBase}/repos/${forkOwner}/${forkRepo}/git/commits`,
                {
                    message: commitMessage,
                    tree: treeRes.data.sha,
                    parents: [baseCommitSha],
                },
                { headers },
            );
            await this.httpService.axiosRef.patch(
                `${apiBase}/repos/${forkOwner}/${forkRepo}/git/refs/heads/${branchName}`,
                { sha: newCommitRes.data.sha, force: true },
                { headers },
            );
            const prRes = await this.httpService.axiosRef.post(
                `${apiBase}/repos/${owner}/${repo}/pulls`,
                {
                    title,
                    head: `${forkOwner}:${branchName}`,
                    base: baseBranch,
                    body: description,
                },
                { headers },
            );
            return { url: prRes.data.html_url };
        } catch (err) {
            const error = err as { response?: { data?: unknown; status?: number } };
            const message: string | Record<string, unknown> =
                typeof error.response?.data === 'string'
                    ? error.response.data
                    : (error.response?.data as Record<string, unknown>) || 'GitHub API request failed';
            const status: number =
                typeof error.response?.status === 'number' ? error.response.status : 500;
            // log
            console.error('GitHub proposal creation error:', message);
            throw new HttpException(message, status);
        }
    }
}
