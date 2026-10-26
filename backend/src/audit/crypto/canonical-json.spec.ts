/**
 * ApprovalSync — RFC 8785 Canonical JSON & SHA-256 Unit Tests
 * Milestone: BE-07
 */

import {
  canonicalJsonStringify,
  sha256Hex,
  computeLeafHash,
  computeCurrentHash,
  GENESIS_PREVIOUS_HASH,
} from './canonical-json';

describe('Canonical JSON & Crypto Primitives (RFC 8785)', () => {
  describe('canonicalJsonStringify', () => {
    it('sorts object keys lexicographically regardless of insertion order', () => {
      const obj1 = { z: 1, a: 2, m: 3 };
      const obj2 = { a: 2, m: 3, z: 1 };
      const obj3 = { m: 3, z: 1, a: 2 };

      const canon1 = canonicalJsonStringify(obj1);
      const canon2 = canonicalJsonStringify(obj2);
      const canon3 = canonicalJsonStringify(obj3);

      expect(canon1).toBe('{"a":2,"m":3,"z":1}');
      expect(canon2).toBe('{"a":2,"m":3,"z":1}');
      expect(canon3).toBe('{"a":2,"m":3,"z":1}');
      expect(canon1).toEqual(canon2);
      expect(canon2).toEqual(canon3);
    });

    it('produces identical SHA-256 hashes for logically identical objects with different key order', () => {
      const payloadA = {
        applicationNumber: 'APP-2026-DEMO-001',
        submittedAt: '2026-10-26T10:00:00.000Z',
        details: { feePaid: true, amount: 50000, programs: ['MCA', 'B.Tech'] },
      };

      const payloadB = {
        details: { programs: ['MCA', 'B.Tech'], amount: 50000, feePaid: true },
        submittedAt: '2026-10-26T10:00:00.000Z',
        applicationNumber: 'APP-2026-DEMO-001',
      };

      const hashA = computeLeafHash(payloadA);
      const hashB = computeLeafHash(payloadB);

      expect(hashA).toBe(hashB);
      expect(hashA).toHaveLength(64);
    });

    it('handles nested objects and arrays deterministically', () => {
      const complex = {
        meta: {
          b: 2,
          a: 1,
        },
        items: [{ y: 'last', x: 'first' }, 42, null, true],
      };

      expect(canonicalJsonStringify(complex)).toBe(
        '{"items":[{"x":"first","y":"last"},42,null,true],"meta":{"a":1,"b":2}}',
      );
    });

    it('handles primitives: strings, numbers, booleans, null, dates', () => {
      expect(canonicalJsonStringify(null)).toBe('null');
      expect(canonicalJsonStringify(true)).toBe('true');
      expect(canonicalJsonStringify(false)).toBe('false');
      expect(canonicalJsonStringify(1234.56)).toBe('1234.56');
      expect(canonicalJsonStringify('ApprovalSync')).toBe('"ApprovalSync"');

      const date = new Date('2026-10-26T12:00:00.000Z');
      expect(canonicalJsonStringify(date)).toBe('"2026-10-26T12:00:00.000Z"');
    });

    it('normalizes -0 to 0 per RFC 8785', () => {
      expect(canonicalJsonStringify(-0)).toBe('0');
      expect(canonicalJsonStringify(0)).toBe('0');
    });

    it('omits undefined, symbol, and function keys from objects', () => {
      const objWithSpecials = {
        valid: 'ok',
        fn: () => 42,
        sym: Symbol('test'),
        und: undefined,
      };

      expect(canonicalJsonStringify(objWithSpecials)).toBe('{"valid":"ok"}');
    });

    it('converts undefined, symbol, and function values in arrays to null', () => {
      const arr = ['first', undefined, () => {}, Symbol('x'), 'last'];
      expect(canonicalJsonStringify(arr)).toBe(
        '["first",null,null,null,"last"]',
      );
    });

    it('throws TypeError on non-finite numbers (NaN, Infinity)', () => {
      expect(() => canonicalJsonStringify(NaN)).toThrow(TypeError);
      expect(() => canonicalJsonStringify(Infinity)).toThrow(TypeError);
      expect(() => canonicalJsonStringify(-Infinity)).toThrow(TypeError);
    });

    it('throws TypeError on circular object references', () => {
      const circular: any = { name: 'cycle' };
      circular.self = circular;

      expect(() => canonicalJsonStringify(circular)).toThrow(TypeError);
    });
  });

  describe('Hash Computation', () => {
    it('computes expected SHA-256 hex string', () => {
      const data = 'ApprovalSync';
      const hash = sha256Hex(data);
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('computes current hash binding predecessor, leaf, and timestamp', () => {
      const prev = GENESIS_PREVIOUS_HASH;
      const leaf = sha256Hex('test-payload');
      const timestamp = '2026-10-26T12:00:00.000Z';

      const current = computeCurrentHash(prev, leaf, timestamp);
      expect(current).toHaveLength(64);

      // Altering any input must alter current hash
      const alteredPrev = computeCurrentHash('a'.repeat(64), leaf, timestamp);
      const alteredLeaf = computeCurrentHash(prev, 'b'.repeat(64), timestamp);
      const alteredTime = computeCurrentHash(
        prev,
        leaf,
        '2026-10-26T12:00:01.000Z',
      );

      expect(current).not.toBe(alteredPrev);
      expect(current).not.toBe(alteredLeaf);
      expect(current).not.toBe(alteredTime);
    });
  });
});
