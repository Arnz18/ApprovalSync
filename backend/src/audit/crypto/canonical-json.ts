/**
 * ApprovalSync — RFC 8785 Canonical JSON Serialization & SHA-256 Hashing
 * Milestone: BE-07
 *
 * Implements deterministic canonical JSON serialization strictly complying with RFC 8785:
 * 1. Lexicographical UTF-16 code-unit sorting of object properties.
 * 2. Stable representation of primitive values (numbers, booleans, strings, null).
 * 3. Consistent UTF-8 byte encoding without whitespace between structural tokens.
 * 4. Cycle detection preventing infinite recursion.
 * 5. Deterministic ISO-8601 UTC string serialization for Date objects.
 */

import * as crypto from 'crypto';

export const GENESIS_PREVIOUS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Serializes an arbitrary JavaScript value into deterministic canonical JSON (RFC 8785).
 */
export function canonicalJsonStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  function serialize(val: unknown): string {
    if (val === null) {
      return 'null';
    }

    if (val === undefined) {
      return 'null';
    }

    const type = typeof val;

    if (type === 'boolean') {
      return val ? 'true' : 'false';
    }

    if (type === 'number') {
      if (!Number.isFinite(val as number)) {
        throw new TypeError(
          'Cannot serialize non-finite numbers in canonical JSON',
        );
      }
      // Normalize -0 to 0 per RFC 8785 Section 3.2.2.3
      if (Object.is(val, -0)) {
        return '0';
      }
      return JSON.stringify(val);
    }

    if (type === 'string') {
      return JSON.stringify(val);
    }

    if (type === 'bigint') {
      return (val as bigint).toString();
    }

    if (type === 'symbol' || type === 'function') {
      return 'null';
    }

    if (type === 'object') {
      const obj = val as Record<string, unknown>;

      // Handle Date instances deterministically as ISO UTC strings
      if (val instanceof Date) {
        if (isNaN(val.getTime())) {
          return 'null';
        }
        return JSON.stringify(val.toISOString());
      }

      // Handle custom toJSON methods if present (unless it is a plain object or array)
      if (
        typeof (obj as { toJSON?: unknown }).toJSON === 'function' &&
        !(val instanceof Date)
      ) {
        return serialize((obj as { toJSON: () => unknown }).toJSON());
      }

      if (seen.has(obj)) {
        throw new TypeError(
          'Circular reference detected during canonical JSON serialization',
        );
      }
      seen.add(obj);

      try {
        if (Array.isArray(val)) {
          const elements = val.map((elem) => {
            if (
              elem === undefined ||
              typeof elem === 'function' ||
              typeof elem === 'symbol'
            ) {
              return 'null';
            }
            return serialize(elem);
          });
          return `[${elements.join(',')}]`;
        }

        // Plain object: sort keys lexicographically by UTF-16 code units (RFC 8785 Section 3.2.3)
        const keys = Object.keys(obj).sort((a, b) =>
          a < b ? -1 : a > b ? 1 : 0,
        );
        const entries: string[] = [];

        for (const key of keys) {
          const propertyValue = obj[key];
          // Omit undefined, symbol, and function valued properties in objects (standard JSON behavior)
          if (
            propertyValue === undefined ||
            typeof propertyValue === 'function' ||
            typeof propertyValue === 'symbol'
          ) {
            continue;
          }
          entries.push(`${JSON.stringify(key)}:${serialize(propertyValue)}`);
        }

        return `{${entries.join(',')}}`;
      } finally {
        seen.delete(obj);
      }
    }

    return 'null';
  }

  return serialize(value);
}

/**
 * Computes standard SHA-256 hexadecimal hash string (64 characters).
 */
export function sha256Hex(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Computes standard SHA-256 digest buffer (32 bytes).
 */
export function sha256Buffer(data: string | Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

/**
 * Computes the canonical leaf hash of an event payload snapshot.
 * leafHash = SHA-256(canonicalJsonStringify(payloadSnapshot))
 */
export function computeLeafHash(
  payloadSnapshot: Record<string, unknown>,
): string {
  const canonicalJson = canonicalJsonStringify(payloadSnapshot);
  return sha256Hex(canonicalJson);
}

/**
 * Computes the sequential chain current hash binding predecessor, leaf, and timestamp.
 * currentHash = SHA-256(previousHash + leafHash + timestampIso)
 */
export function computeCurrentHash(
  previousHash: string,
  leafHash: string,
  timestampIso: string,
): string {
  const preimage = `${previousHash}${leafHash}${timestampIso}`;
  return sha256Hex(preimage);
}
