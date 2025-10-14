import { MerkleTreeUtils, AddressVotingPower } from './markle-tree.utils';
import * as fs from 'fs';
import * as path from 'path';

const max_proofs_to_generate = 3;

// Function to load voting power data from utk_snapshot.json
function loadUtkSnapshotData(): AddressVotingPower[] {
    console.log('Loading utk_snapshot.json...');

    const snapshotPath = path.join(__dirname, '..', '..', 'snapshots', 'utk_snapshot.json');

    try {
        const data = fs.readFileSync(snapshotPath, 'utf8');
        const snapshotData = JSON.parse(data);

        console.log(` Loaded utk_snapshot.json`);
        console.log(` Total holders: ${snapshotData.total_holders}`);
        console.log(` Total voting power: ${snapshotData.total_voting_power}`);
        console.log(` Timestamp: ${snapshotData.timestamp}`);
        console.log(` Holders in data: ${snapshotData.holders.length}`);
        console.log('');

        // Convert to AddressVotingPower format
        return snapshotData.holders.map((holder: any) => ({
            address: holder.address,
            balance: holder.balance
        }));
    } catch (err) {
        console.error('Failed to load utk_snapshot.json:', err);
        return [];
    }
}

const sampleVotingPowerData: AddressVotingPower[] = loadUtkSnapshotData();

export function testGetProof() {
    console.log('=== MerkleTreeUtils getProof Test (UTK Snapshot) ===\n');

    if (sampleVotingPowerData.length === 0) {
        console.log('No data loaded from utk_snapshot.json');
        return;
    }

    const merkleTree = new MerkleTreeUtils(sampleVotingPowerData);

    console.log('Merkle Tree initialized with', sampleVotingPowerData.length, 'leaves');
    console.log('Root hash:', merkleTree.getRootHash());
    console.log('Tree depth:', merkleTree.getDepth());
    console.log('Total balance:', merkleTree.getTotalBalance());
    console.log('');

    // Test getProof for few addresses
    const testCount = Math.min(max_proofs_to_generate, sampleVotingPowerData.length);
    console.log(`Testing getProof for first ${testCount} addresses:\n`);

    for (let i = 0; i < testCount; i++) {
        const votingPower = sampleVotingPowerData[i];
        console.log(`--- Testing getProof for address ${i + 1} ---`);
        console.log('Address:', votingPower.address);
        console.log('Balance:', votingPower.balance);

        // Get the proof for this address
        const proof = merkleTree.getProof(votingPower);
        console.log('Proof (hex array):', proof);
        console.log('Proof length:', proof.length);

        const proofBuffer = merkleTree.getProofBuffer(votingPower);
        console.log('Proof buffer length:', proofBuffer.length);
        console.log('Proof buffer (hex):', proofBuffer.toString('hex'));

        // Verify the proof is valid
        const isValid = merkleTree.verifyProof(votingPower);
        console.log('Proof verification:', isValid ? 'VALID' : 'INVALID');
        console.log('');
    }

}

if (require.main === module) {
    testGetProof();
}

export { sampleVotingPowerData };
