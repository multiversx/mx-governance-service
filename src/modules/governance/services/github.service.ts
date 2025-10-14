import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { githubConfig, governanceConfig } from 'src/config';
import { DescriptionV3, GovernanceProposalStatus } from '../models/governance.proposal.model';
import { GovernanceOnChainAbiService } from './governance.onchain.abi.service';
import { ChainInfo, FileContent, GithubProposal } from '../models/github.proposal.model';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from "@multiversx/sdk-nestjs-common";
@Injectable()
export class GithubService implements OnModuleInit {
  private git: SimpleGit;
  private repoPath: string;
  private networkPath: string;
  private readonly onChainScAddress: string = governanceConfig.onChain.linear[0];
  private readonly repoSlug: string;
  constructor(
    private readonly config: ConfigService,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => GovernanceOnChainAbiService))
    private readonly governanceOnChainAbiService: GovernanceOnChainAbiService,
  ) {
    this.repoSlug = `${githubConfig.owner}/${githubConfig.repository}`;
    this.repoPath = GithubService.getRepoPath(this.repoSlug);
    this.networkPath = GithubService.getNetworkPath(this.repoPath);
    console.log(`Repo path: ${this.repoPath}`);
  }

  static getRepoPath(repoSlug: string): string {
    const repoName = repoSlug.split('/').pop();
    const rootPath = process.cwd();
    const baseRepoPath = path.join(rootPath, repoName);

    return baseRepoPath;
  }

  static getNetworkPath(baseRepoPath: string) {
    return baseRepoPath;
    // const env = process.env.NODE_ENV;
    // if (env === 'devnet') {
    //     return path.join(baseRepoPath, 'devnet');
    //   } else if (env === 'testnet') {
    //     return path.join(baseRepoPath, 'testnet');
    //   } else {
    //     // mainnet or default
    //     return baseRepoPath;
    //   }
  }

  async cloneAndCheckout(repoSlug: string, branch: string): Promise<void> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    if (!token) throw new Error('GITHUB_TOKEN must be set in .env');
    try {
      // Check if repo exists locally
      await fs.access(this.repoPath);
      console.log(`Repo ${repoSlug} already exists, perform git pull on branch: ${branch}.`);
      this.git = simpleGit(this.repoPath);
      await this.git.fetch();
      await this.git.checkout(branch);
      await this.git.pull('origin', branch);
      console.log(`Fetch, checkout & pull done.`);
    } catch {
      // Repo doesn't exist. We clone it...
      const authedUrl = `https://${token}@github.com/${repoSlug}.git`;
      const baseGit = simpleGit();
      await baseGit.clone(authedUrl, this.repoPath);

      this.git = simpleGit(this.repoPath);
      await this.git.checkout(branch);
      console.log(`Repo ${repoSlug} cloned and branch ${branch} set.`);
    }
  }

  async getGithubProposals(): Promise<GithubProposal[]> {
    return await this.cacheService.getOrSet(
      CacheTtlInfo.GithubProposals.cacheKey,
      async () => await this.getGithubProposalsRaw(),
      CacheTtlInfo.GithubProposals.remoteTtl,
    )
  }

  async getGithubProposalsRaw(): Promise<GithubProposal[]> {
    if (!this.git) {
      await this.cloneAndCheckout(this.repoSlug, githubConfig.branch)
    };

    await this.git.checkout(githubConfig.branch);

    // Determine the proposals folder based on env
    const env = process.env.NODE_ENV;
    let proposalsFolder = 'proposals';
    // if (env === 'devnet' || env === 'testnet') {
    //   proposalsFolder = path.join(env, 'proposals');
    // }

    const commits = await this.git.log();
    const seenFiles = new Set<string>();
    const results: GithubProposal[] = [];

    // Fetch open PRs first
    const openPRs = await this.getOpenPullRequests();

    for (const pr of openPRs) {
      try {
        const prFilesUrl = pr.url + '/files';
        const token = this.config.get<string>('GITHUB_TOKEN');
        const prFilesResp = await fetch(prFilesUrl, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github+json',
          },
        });
        if (prFilesResp.ok) {
          const prFiles = await prFilesResp.json();
          const addedFiles = prFiles.filter((f: any) => f.status === 'added' && f.filename.endsWith('.md') && f.filename.startsWith(proposalsFolder + '/'));
          if (addedFiles.length === 1) {
            const fileRawResp = await fetch(addedFiles[0].raw_url);
            if (fileRawResp.ok) {
              const fileContentRaw = await fileRawResp.text();
              const fileContent = this.parseFileContent(fileContentRaw);
              results.push({
                commitHash: pr.head.sha,
                fileName: addedFiles[0].filename,
                fileContent,
                prMerged: false,
                prUrl: pr.html_url,
              });
              seenFiles.add(addedFiles[0].filename);
            }
          }
        }
      } catch (err) {
        console.warn(`Skipping PR ${pr.url} due to error: ${err.message}`);
        continue;
      }
    }
    for (const commit of commits.all) {
      // check if commit has a parent
      const parentsRaw = await this.git.raw(['rev-list', '--parents', '-n', '1', commit.hash]);
      const parentHashes = parentsRaw.trim().split(' ').slice(1);

      if (parentHashes.length === 0) {
        // commit with no parent, we skip it
        continue;
      }

      const diffOutput = await this.git.diff([
        '--diff-filter=A',
        '--name-only',
        `${commit.hash}~1`,
        commit.hash,
      ]);
      const addedMdFiles = diffOutput
        .split('\n')
        .map((f) => f.trim())
        .filter((f) =>
          f.endsWith('.md') &&
          f.startsWith(proposalsFolder + '/') &&
          !seenFiles.has(f) &&
          !f.toLowerCase().includes('readme')
        );

      for (const file of addedMdFiles) {
        try {
          const filePath = `${this.repoPath}/${file}`
          const exists = await this.fileExists(filePath);
          if(!exists) {
            continue;
          }
          const fileContentRaw = await this.git.show([`${commit.hash}:${file}`]);
          const fileContent = this.parseFileContent(fileContentRaw);
          results.push({
            commitHash: commit.hash,
            fileName: file,
            fileContent,
            prMerged: true,
          });
          seenFiles.add(file);
        } catch (err) {
          console.error(`Error reading file ${file} în ${commit.hash}: ${err.message}`);
        }
      }
    }

    return results;
  }

  private parseFileContent(fileContentRaw: string) {
    const lines = fileContentRaw.split('\n').map(line => line.trim());

    if (lines.length < 4) {
      throw new Error('Input must have at least 4 lines');
    }

    const title = lines[0];
    const description = lines[1];
    const proposer = lines[lines.length - 1];
    const content = lines.slice(2, -1).join('\n');

    const fileContent = new FileContent({
      title,
      description,
      content,
      proposer,
    });

    return fileContent;
  }

  //TODO: maybe cache this computing
  async getGithubProposalWithChainInfo() {
    const onChainProposals = await this.governanceOnChainAbiService.proposals(this.onChainScAddress);
    const githubProposals = await this.getGithubProposals();

    const proposalsWithChainInfo = githubProposals.map(gitProposal => {
      const chainInfoRaw = onChainProposals.find(onChainProposal => onChainProposal.commitHash === gitProposal.commitHash)
      const existsOnChain = chainInfoRaw !== undefined;

      return {
        ...gitProposal,
        chainInfo: new ChainInfo({
          existsOnChain,
          status: existsOnChain ? chainInfoRaw?.status : GovernanceProposalStatus.None,
          proposalId: existsOnChain ? chainInfoRaw?.proposalId : undefined,
        }),
      }
    })

    return proposalsWithChainInfo;
  }

  async getDescription(commitHash: string) {
    const gitProposals = await this.getGithubProposals();
    const target = gitProposals.find(proposal => proposal.commitHash === commitHash);
    return new DescriptionV3({
      fileContent: target?.fileContent ?? new FileContent({
        title: 'No title found',
        description: 'No description found',
        content: 'No content found',
        proposer: 'No proposer found',
      }),
      version: 3,
    })
  }


  async cleanup(repoSlug: string): Promise<void> {
    const pathToRemove = GithubService.getRepoPath(repoSlug);
    try {
      await fs.rm(pathToRemove, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Error on cleanup: ${err.message}`);
    }
  }

  async onModuleInit() {
    await this.cloneOrUpdate()
  }

  async cloneOrUpdate() {
    const branch = githubConfig.branch;
    if (this.repoSlug) {
      console.log(`Cloning repo ${this.repoSlug} on branch ${branch} on start...`);
      try {
        await this.cloneAndCheckout(this.repoSlug, branch);
        console.log('Clone or update done.');
      } catch (error) {
        console.error('Eroare la cloneAndCheckout:', error);
      }
    } else {
      console.error('Env var INIT_REPO is NOT set. Nothing is cloned...');
    }
  }

  async getOpenPullRequests(): Promise<any[]> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    const owner = githubConfig.owner;
    const repo = githubConfig.repository;
    const baseBranch = githubConfig.branch;
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&base=${baseBranch}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch open PRs: ${response.statusText}`);
    }
    return response.json();
  }

  private async fileExists(filePath: string) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  @Cron("*/20 * * * * *")
  @Lock({ name: 'fetchGithubBranchUpdates', verbose: true })
  async fetchGithubBranchUpdates(): Promise<void> {
    await this.cloneOrUpdate();
  }
}
