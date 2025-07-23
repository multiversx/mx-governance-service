import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GithubProposal } from '../resolvers/github.resolver';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { githubConfig, governanceConfig } from 'src/config';
import { GithubConfig } from '../models/github.config.model';
import { DescriptionV2 } from '../models/governance.proposal.model';
import { GovernanceOnChainAbiService } from './governance.onchain.abi.service';

@Injectable()
export class GithubService implements OnModuleInit {
  private git: SimpleGit;
  private repoPath: string;
  private readonly onChainScAddress: string = governanceConfig.onChain.linear[0];
  private readonly repoSlug;;
  constructor(
    private readonly config: ConfigService,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => GovernanceOnChainAbiService))
    private readonly governanceOnChainAbiService: GovernanceOnChainAbiService,
   ) {
      this.repoSlug = `${githubConfig.user}/${githubConfig.repository}`;
      this.repoPath = this.getRepoPath(this.repoSlug);
   }

  private getRepoPath(repoSlug: string): string {
    const repoName = repoSlug.split('/').pop();
    const rootPath = process.cwd();
    return path.join(rootPath, repoName);
  }

  async cloneAndCheckout(repoSlug: string, branch: string): Promise<void> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    if (!token) throw new Error('GITHUB_TOKEN must be set in .env');

    try {
      // Check if repo exists locally
      await fs.access(this.repoPath);

      this.git = simpleGit(this.repoPath);
      await this.git.fetch();
      await this.git.checkout(branch);
      await this.git.pull('origin', branch);
      console.log(`Repo ${repoSlug} already exists, perform git pull on branch: ${branch}.`);
    } catch {
      // Repo doesn't exist. We clone it...
      const authedUrl = `https://${token}@github.com/${repoSlug}.git`;
      const baseGit = simpleGit();
      await baseGit.clone(authedUrl, this.repoPath);

      this.git = simpleGit(this.repoPath);
      await this.git.checkout(branch);
      console.log(`Repo ${repoSlug} clonat și branch-ul ${branch} setat.`);
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
    if (!this.git){
      await this.cloneAndCheckout(this.repoSlug, githubConfig.branch)
    };

    await this.git.checkout(githubConfig.branch);

    const commits = await this.git.log();

    const seenFiles = new Set<string>();
    const results: GithubProposal[] = [];

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
          !seenFiles.has(f) &&
          !f.toLowerCase().includes('readme')
        );

      for (const file of addedMdFiles) {
        try {
          const content = await this.git.show([`${commit.hash}:${file}`]);
          
          results.push({
            commitHash: commit.hash,
            fileName: file,
            content,
          });

          seenFiles.add(file);
        } catch (err) {
          console.error(`Error reading file ${file} în ${commit.hash}: ${err.message}`);
        }
      }
    }

    return results;
  }

  //TODO: maybe cache this computing
  async getGithubProposalWithStatus() {
    const onChainProposals = await this.governanceOnChainAbiService.proposals(this.onChainScAddress);
    const githubProposals = await this.getGithubProposals();

    const proposalWithStatus = githubProposals.map(gitProposal => {
      const existsOnChain = onChainProposals.find(onChainProposal => onChainProposal.commitHash === gitProposal.commitHash) !== undefined
      return {
        ...gitProposal,
        existsOnChain,
      }
    })

    return proposalWithStatus;
  }

  async getDescription(commitHash: string) {
    const gitProposals = await this.getGithubProposals();
    const target = gitProposals.find(proposal => proposal.commitHash === commitHash);
      return new DescriptionV2({
            strapiId: 0,
            strapiHash: 'test strapiHash',
            shortDescription: target?.content ?? 'not found',
            title: 'test title',
            version: 0,
        }) // TODO: fix description
  }


  async cleanup(repoSlug: string): Promise<void> {
    const pathToRemove = this.getRepoPath(repoSlug);
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
      console.log(`Cloning repo ${this.repoSlug} on branach ${branch} on start...`);
      try {
        await this.cloneAndCheckout(this.repoSlug, branch);
        console.log('Clone & checkout done.');
      } catch (error) {
        console.error('Eroare la cloneAndCheckout:', error);
      }
    } else {
      console.error('Env var INIT_REPO is NOT set. Nothing is cloned...');
    }
  }
}
