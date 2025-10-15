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
        const owner = githubConfig.owner;
        const repo = githubConfig.repository;
        const baseBranch = githubConfig.branch;
        const apiBase = 'https://api.github.com';
        const headers = {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
        };

        try {
            // -------------------------------
            // 1️⃣ Create fork or get existing fork
            // -------------------------------
            let forkOwner: string;
            let forkRepo: string;

            try {
            const forkRes = await this.httpService.axiosRef.post(
                `${apiBase}/repos/${owner}/${repo}/forks`,
                {},
                { headers }
            );
            forkOwner = forkRes.data.owner.login;
            forkRepo = forkRes.data.name;
            } catch (err) {
            // Fork already exists → get it
            const existingFork = await this.httpService.axiosRef.get(
                `${apiBase}/repos/${user}/${repo}`,
                { headers }
            );
            forkOwner = existingFork.data.owner.login;
            forkRepo = existingFork.data.name;
            }

            // -------------------------------
            // 2️⃣ Force sync main branch (development) using polling
            // -------------------------------
            const upstreamRef = await this.httpService.axiosRef.get(
            `${apiBase}/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
            { headers }
            );
            const upstreamSha = upstreamRef.data.object.sha;

            const forkBranchUrl = `${apiBase}/repos/${forkOwner}/${forkRepo}/git/ref/heads/${baseBranch}`;
            let forkHasBranch = true;
            try {
                await this.waitForGitRef(forkBranchUrl, headers, 10, 2000);
            } catch {
                forkHasBranch = false;
            }

            if (!forkHasBranch) {
            // Branch does not exist → create it from upstream
            await this.httpService.axiosRef.post(
                `${apiBase}/repos/${forkOwner}/${forkRepo}/git/refs`,
                { ref: `refs/heads/${baseBranch}`, sha: upstreamSha },
                { headers }
            );
            } else {
            // Branch exists → force update it to match upstream
            await this.httpService.axiosRef.patch(
                forkBranchUrl,
                { sha: upstreamSha, force: true },
                { headers }
            );
            }

            // -------------------------------
            // 3️⃣ Create proposal branch
            // -------------------------------
            const refRes = await this.waitForGitRef(forkBranchUrl, headers);
            const baseCommitSha = refRes.object.sha;
            const branchName = `proposal-${Date.now()}`;

            await this.httpService.axiosRef.post(
            `${apiBase}/repos/${forkOwner}/${forkRepo}/git/refs`,
            { ref: `refs/heads/${branchName}`, sha: baseCommitSha },
            { headers }
            );

            // -------------------------------
            // 4️⃣ Create blob, tree, and commit
            // -------------------------------
            const content = Buffer.from(`${title}\n${description}\n${proposal}\n${user}`).toString('base64');
            const blobRes = await this.httpService.axiosRef.post(
            `${apiBase}/repos/${forkOwner}/${forkRepo}/git/blobs`,
            { content, encoding: 'base64' },
            { headers }
            );

            const commitRes = await this.httpService.axiosRef.get(
            `${apiBase}/repos/${forkOwner}/${forkRepo}/git/commits/${baseCommitSha}`,
            { headers }
            );
            const baseTreeSha = commitRes.data.tree.sha;
            const filePath = `proposals/${branchName}.md`;

            const treeRes = await this.httpService.axiosRef.post(
            `${apiBase}/repos/${forkOwner}/${forkRepo}/git/trees`,
            { base_tree: baseTreeSha, tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blobRes.data.sha }] },
            { headers }
            );

            const newCommitRes = await this.httpService.axiosRef.post(
            `${apiBase}/repos/${forkOwner}/${forkRepo}/git/commits`,
            { message: `Add proposal: ${title}`, tree: treeRes.data.sha, parents: [baseCommitSha] },
            { headers }
            );

            // Force update the proposal branch to point to the new commit
            await this.httpService.axiosRef.patch(
            `${apiBase}/repos/${forkOwner}/${forkRepo}/git/refs/heads/${branchName}`,
            { sha: newCommitRes.data.sha, force: true },
            { headers }
            );

            // -------------------------------
            // 5️⃣ Create Pull Request
            // -------------------------------
            const prRes = await this.httpService.axiosRef.post(
            `${apiBase}/repos/${owner}/${repo}/pulls`,
            { title, head: `${forkOwner}:${branchName}`, base: baseBranch, body: description },
            { headers }
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
            console.log('GitHub proposal creation error:', message);
            throw new HttpException(message, status);
        }
    }


     private async waitForGitRef(
        url: string,
        headers: Record<string, string>,
        maxRetries = 10,
        intervalMs = 2000
    ) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                // Attempt to get the Git reference
                const res = await this.httpService.axiosRef.get(url, { headers });
                return res.data;
            } catch (err) {
                // If the ref is not found, wait and retry
                if ((err as any).response?.status === 404) {
                    await new Promise((resolve) => setTimeout(resolve, intervalMs));
                } else {
                    // If it's another error, throw immediately
                    throw err;
                }
            }
        }
        throw new Error(`Git ref not available after ${maxRetries} retries: ${url}`);
    }
}
