/**
 * ApprovalSync — RFC 6962 Merkle Tree & Inclusion Proof Implementation
 * Milestone: BE-07
 *
 * Implements standard RFC 6962 domain-separated Merkle Tree construction:
 * - Leaf Hash: SHA-256(0x00 || data)
 * - Internal Node: SHA-256(0x01 || left || right)
 * - Lone odd nodes at any level are promoted to the next tree level without pairing.
 * - Provides deterministic proof path generation and standalone verification.
 */

import * as crypto from 'crypto';

export const EMPTY_MERKLE_ROOT =
  '0000000000000000000000000000000000000000000000000000000000000000';

const RFC6962_LEAF_PREFIX = Buffer.from([0x00]);
const RFC6962_NODE_PREFIX = Buffer.from([0x01]);

export interface MerkleProofStep {
  hash: string; // 64-character hex hash of the sibling node
  position: 'left' | 'right'; // Position of the sibling relative to the current hash
}

export interface MerkleInclusionProof {
  leafIndex: number;
  totalLeaves: number;
  leafHash: string; // 64-character hex hash of the leaf
  proofPath: MerkleProofStep[];
  expectedRoot: string; // 64-character hex Merkle root
}

/**
 * Computes RFC 6962 Leaf Hash: SHA-256(0x00 || data)
 */
export function hashLeaf(data: string | Buffer): string {
  const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  return crypto
    .createHash('sha256')
    .update(RFC6962_LEAF_PREFIX)
    .update(dataBuf)
    .digest('hex');
}

/**
 * Computes RFC 6962 Internal Node Hash: SHA-256(0x01 || left || right)
 */
export function hashChildren(leftHex: string, rightHex: string): string {
  const leftBuf = Buffer.from(leftHex, 'hex');
  const rightBuf = Buffer.from(rightHex, 'hex');
  return crypto
    .createHash('sha256')
    .update(RFC6962_NODE_PREFIX)
    .update(leftBuf)
    .update(rightBuf)
    .digest('hex');
}

/**
 * Constructs the full Merkle tree levels from a list of raw leaf items (e.g. audit block currentHashes).
 * Returns array of levels, where level 0 is leaf hashes and the last level contains exactly one element (the root).
 */
export function buildMerkleTreeLevels(
  leafDataList: (string | Buffer)[],
): string[][] {
  if (leafDataList.length === 0) {
    return [[EMPTY_MERKLE_ROOT]];
  }

  // Level 0: Compute RFC 6962 leaf hashes
  let currentLevel: string[] = leafDataList.map((item) => hashLeaf(item));
  const levels: string[][] = [currentLevel];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Paired nodes: SHA-256(0x01 || left || right)
        nextLevel.push(hashChildren(currentLevel[i], currentLevel[i + 1]));
      } else {
        // Lone odd node: promoted to next level per RFC 6962 Section 2.1
        nextLevel.push(currentLevel[i]);
      }
    }
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  return levels;
}

/**
 * Computes the RFC 6962 Merkle Root hash from a list of leaf data items.
 */
export function computeMerkleRoot(leafDataList: (string | Buffer)[]): string {
  if (leafDataList.length === 0) {
    return EMPTY_MERKLE_ROOT;
  }
  const levels = buildMerkleTreeLevels(leafDataList);
  return levels[levels.length - 1][0];
}

/**
 * Generates an RFC 6962 Merkle Inclusion Proof for the leaf at the specified index.
 */
export function generateMerkleProof(
  leafDataList: (string | Buffer)[],
  leafIndex: number,
): MerkleInclusionProof {
  if (leafDataList.length === 0) {
    throw new RangeError('Cannot generate Merkle proof for empty leaf list');
  }

  if (leafIndex < 0 || leafIndex >= leafDataList.length) {
    throw new RangeError(
      `Leaf index ${leafIndex} out of bounds for leaf list of length ${leafDataList.length}`,
    );
  }

  const levels = buildMerkleTreeLevels(leafDataList);
  const leafHash = levels[0][leafIndex];
  const expectedRoot = levels[levels.length - 1][0];
  const proofPath: MerkleProofStep[] = [];

  let currentIndex = leafIndex;

  for (let level = 0; level < levels.length - 1; level++) {
    const currentLevelNodes = levels[level];
    const isEven = currentIndex % 2 === 0;

    if (isEven) {
      // Sibling is to the right, if one exists
      if (currentIndex + 1 < currentLevelNodes.length) {
        proofPath.push({
          hash: currentLevelNodes[currentIndex + 1],
          position: 'right',
        });
      }
      // If no right sibling exists (lone odd node), it was promoted without pairing; no sibling step.
    } else {
      // Sibling is to the left
      proofPath.push({
        hash: currentLevelNodes[currentIndex - 1],
        position: 'left',
      });
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leafIndex,
    totalLeaves: leafDataList.length,
    leafHash,
    proofPath,
    expectedRoot,
  };
}

/**
 * Verifies an RFC 6962 Merkle Inclusion Proof against the expected root hash.
 * Computes upward along the proof path and asserts equality with expectedRoot.
 */
export function verifyMerkleProof(proof: MerkleInclusionProof): boolean {
  if (
    !proof.leafHash ||
    !proof.expectedRoot ||
    !Array.isArray(proof.proofPath)
  ) {
    return false;
  }

  let current = proof.leafHash;

  for (const step of proof.proofPath) {
    if (
      !step.hash ||
      typeof step.hash !== 'string' ||
      step.hash.length !== 64
    ) {
      return false;
    }

    if (step.position === 'right') {
      current = hashChildren(current, step.hash);
    } else if (step.position === 'left') {
      current = hashChildren(step.hash, current);
    } else {
      return false;
    }
  }

  return current.toLowerCase() === proof.expectedRoot.toLowerCase();
}
