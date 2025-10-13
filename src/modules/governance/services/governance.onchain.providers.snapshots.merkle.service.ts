import { Inject, Injectable } from '@nestjs/common';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MerkleTreeUtils } from '../../../utils/merkle-tree/markle-tree.utils';
import { promises } from 'fs';
import { githubConfig } from 'src/config';
import path from 'path';
import { GithubService } from './github.service';

@Injectable()
export class GovernanceOnchainProvidersSnapshotsMerkleService {
    private static merkleTrees: MerkleTreeUtils[];
    private readonly snapshotsPath: string;
    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        GovernanceOnchainProvidersSnapshotsMerkleService.merkleTrees = [];
        const env = process.env.NODE_ENV;
        let network = '';
        if(env === 'devnet' || env === 'testnet') {
            network = env;
        }
        
        this.snapshotsPath = path.join(
            process.cwd(),
            // network !== '' ? `${githubConfig.repository}` : githubConfig.repository,
            githubConfig.repository,
            'snapshots'
        )
    }

    static getMerkleTreeKeyForProvider(
        providerAddress: string,
        proposalId: string,
    ): string {
        return `${providerAddress}-${proposalId}`;
    }

    async getMerkleTreeForProvider(
        providerAddress: string,
        proposalId: string,
    ): Promise<MerkleTreeUtils> {
        const key = GovernanceOnchainProvidersSnapshotsMerkleService.getMerkleTreeKeyForProvider(providerAddress, proposalId);
        return (
            GovernanceOnchainProvidersSnapshotsMerkleService.merkleTrees[key] ||
            this.createMerkleTreeForProvider(providerAddress, proposalId)
        );
    }

    async getRootHashForProvider(
        providerAddress: string,
        proposalId: string,
    ): Promise<string> {
        const merkleTree = await this.getMerkleTreeForProvider(
            providerAddress,
            proposalId,
        );
        const rootHashRaw = merkleTree.getRootHash();
        const rootHash = rootHashRaw.slice(2); // 0x should not appear
        return rootHash;
    }

    async getAddressBalance(
        providerAddress: string,
        proposalId: string,
        address: string,
    ): Promise<string> {
        try{
        const merkleTree = await this.getMerkleTreeForProvider(
            providerAddress,
            proposalId,
        );
        return merkleTree.getLeaves().find(leaf => leaf.address === address)?.balance ?? '0';
        } catch (error) {
            //TODO: remove for development, add for production, should not happen on mainnet
            // this.logger.error(`Error getting address balance for ${address} in provider ${providerAddress} and proposal ${proposalId}: ${error.message}`);
            return '0';
        }
    }

    private async createMerkleTreeForProvider(
        providerAddress: string,
        proposalId: string,
    ): Promise<MerkleTreeUtils> {
        const jsonContent: string = await promises.readFile(`${this.snapshotsPath}/${providerAddress}/${proposalId}.json`, {
            encoding: 'utf8',
        });
        const leaves = JSON.parse(jsonContent);
        const newMT = new MerkleTreeUtils(leaves);
        // if (newMT.getRootHash() !== `0x${rootHash}`) {
        //     throw new Error("Computed root hash doesn't match the provided root hash.");
        // }
        const key = GovernanceOnchainProvidersSnapshotsMerkleService.getMerkleTreeKeyForProvider(providerAddress, proposalId);
        GovernanceOnchainProvidersSnapshotsMerkleService.merkleTrees[key] = newMT;
        return newMT;
    }
}
