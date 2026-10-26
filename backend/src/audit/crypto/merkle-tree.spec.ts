/**
 * ApprovalSync — RFC 6962 Merkle Tree Unit Tests
 * Milestone: BE-07
 */

import {
  hashLeaf,
  hashChildren,
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  EMPTY_MERKLE_ROOT,
} from './merkle-tree';

describe('RFC 6962 Merkle Tree & Inclusion Proofs', () => {
  describe('Domain Separation', () => {
    it('uses 0x00 domain separator for leaf hashes', () => {
      const data = 'block-001';
      const leaf = hashLeaf(data);
      expect(leaf).toHaveLength(64);

      // Node hashing uses 0x01 prefix, so hashLeaf(data + data) must not collide with hashChildren
      const doubleLeaf = hashLeaf(data + data);
      const parent = hashChildren(leaf, leaf);
      expect(doubleLeaf).not.toBe(parent);
    });

    it('uses 0x01 domain separator for internal node hashes', () => {
      const left = '1'.repeat(64);
      const right = '2'.repeat(64);
      const parent = hashChildren(left, right);
      expect(parent).toHaveLength(64);

      // Order matters (left vs right)
      const parentReversed = hashChildren(right, left);
      expect(parent).not.toBe(parentReversed);
    });
  });

  describe('Merkle Root Computation', () => {
    it('returns EMPTY_MERKLE_ROOT for empty leaf list', () => {
      expect(computeMerkleRoot([])).toBe(EMPTY_MERKLE_ROOT);
    });

    it('returns the leaf hash itself for a single leaf', () => {
      const item = 'single-block-hash';
      const expectedLeaf = hashLeaf(item);
      const root = computeMerkleRoot([item]);
      expect(root).toBe(expectedLeaf);
    });

    it('computes expected root for 2 leaves (power of 2)', () => {
      const items = ['block-1', 'block-2'];
      const l1 = hashLeaf(items[0]);
      const l2 = hashLeaf(items[1]);
      const expectedRoot = hashChildren(l1, l2);

      expect(computeMerkleRoot(items)).toBe(expectedRoot);
    });

    it('computes expected root for 3 leaves (odd leaf promotion)', () => {
      const items = ['b1', 'b2', 'b3'];
      const l1 = hashLeaf(items[0]);
      const l2 = hashLeaf(items[1]);
      const l3 = hashLeaf(items[2]);

      // Level 1: pair(l1, l2) and promote l3
      const p1 = hashChildren(l1, l2);
      // Level 2: pair(p1, l3)
      const expectedRoot = hashChildren(p1, l3);

      expect(computeMerkleRoot(items)).toBe(expectedRoot);
    });

    it('computes deterministic roots for varying leaf counts (4, 5, 8, 17)', () => {
      for (const count of [4, 5, 8, 17]) {
        const items = Array.from({ length: count }, (_, i) => `item-${i}`);
        const root1 = computeMerkleRoot(items);
        const root2 = computeMerkleRoot(items);
        expect(root1).toBe(root2);
        expect(root1).toHaveLength(64);
      }
    });
  });

  describe('Merkle Inclusion Proof Generation & Verification', () => {
    it('throws RangeError when generating proof for empty list or out-of-bound index', () => {
      expect(() => generateMerkleProof([], 0)).toThrow(RangeError);
      expect(() => generateMerkleProof(['a', 'b'], -1)).toThrow(RangeError);
      expect(() => generateMerkleProof(['a', 'b'], 2)).toThrow(RangeError);
    });

    it('generates and verifies valid inclusion proofs for single leaf (0 siblings)', () => {
      const items = ['solo-block'];
      const proof = generateMerkleProof(items, 0);

      expect(proof.leafIndex).toBe(0);
      expect(proof.totalLeaves).toBe(1);
      expect(proof.proofPath).toHaveLength(0);
      expect(verifyMerkleProof(proof)).toBe(true);
    });

    it('generates and verifies valid inclusion proofs for all leaves in an even-sized tree (4 leaves)', () => {
      const items = ['leaf-0', 'leaf-1', 'leaf-2', 'leaf-3'];
      const root = computeMerkleRoot(items);

      for (let i = 0; i < items.length; i++) {
        const proof = generateMerkleProof(items, i);
        expect(proof.expectedRoot).toBe(root);
        expect(verifyMerkleProof(proof)).toBe(true);
      }
    });

    it('generates and verifies valid inclusion proofs for all leaves in an odd-sized tree (5 leaves)', () => {
      const items = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
      const root = computeMerkleRoot(items);

      for (let i = 0; i < items.length; i++) {
        const proof = generateMerkleProof(items, i);
        expect(proof.expectedRoot).toBe(root);
        expect(verifyMerkleProof(proof)).toBe(true);
      }
    });

    it('generates and verifies proofs for larger trees (25 leaves)', () => {
      const items = Array.from({ length: 25 }, (_, i) => `block-record-${i}`);
      const root = computeMerkleRoot(items);

      for (let i = 0; i < items.length; i++) {
        const proof = generateMerkleProof(items, i);
        expect(proof.expectedRoot).toBe(root);
        expect(verifyMerkleProof(proof)).toBe(true);
      }
    });

    it('rejects proof when leaf hash has been tampered', () => {
      const items = ['e1', 'e2', 'e3', 'e4'];
      const proof = generateMerkleProof(items, 1);

      const tamperedProof = {
        ...proof,
        leafHash: 'f'.repeat(64),
      };

      expect(verifyMerkleProof(tamperedProof)).toBe(false);
    });

    it('rejects proof when sibling hash in path has been tampered', () => {
      const items = ['e1', 'e2', 'e3', 'e4'];
      const proof = generateMerkleProof(items, 1);

      const tamperedProof = {
        ...proof,
        proofPath: proof.proofPath.map((step, idx) =>
          idx === 0 ? { ...step, hash: '0'.repeat(64) } : step,
        ),
      };

      expect(verifyMerkleProof(tamperedProof)).toBe(false);
    });

    it('rejects proof when sibling position is inverted', () => {
      const items = ['e1', 'e2', 'e3', 'e4'];
      const proof = generateMerkleProof(items, 0);

      const tamperedProof = {
        ...proof,
        proofPath: proof.proofPath.map((step) => ({
          ...step,
          position: (step.position === 'left' ? 'right' : 'left') as
            'left' | 'right',
        })),
      };

      expect(verifyMerkleProof(tamperedProof)).toBe(false);
    });

    it('rejects proof when expected root is altered', () => {
      const items = ['e1', 'e2'];
      const proof = generateMerkleProof(items, 0);

      const tamperedProof = {
        ...proof,
        expectedRoot: 'c'.repeat(64),
      };

      expect(verifyMerkleProof(tamperedProof)).toBe(false);
    });
  });
});
