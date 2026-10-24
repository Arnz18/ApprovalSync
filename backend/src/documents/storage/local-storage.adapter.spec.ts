/**
 * ApprovalSync — LocalStorageAdapter Unit Tests
 * Milestone: DOC-01
 */

import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LocalStorageAdapter } from './local-storage.adapter';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  let testStorageRoot: string;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    testStorageRoot = path.join(
      os.tmpdir(),
      `approvalsync-storage-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );

    mockConfigService = {
      get: jest.fn().mockReturnValue(testStorageRoot),
    } as unknown as jest.Mocked<ConfigService>;

    adapter = new LocalStorageAdapter(mockConfigService);
  });

  afterEach(async () => {
    try {
      if (fs.existsSync(testStorageRoot)) {
        await fs.promises.rm(testStorageRoot, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup errors in test teardown
    }
  });

  it('should save a file buffer and return file metadata with correct checksum', async () => {
    const buffer = Buffer.from('%PDF-1.4\nTest storage content');
    const storageKey = 'documents/app-1/doc-1.pdf';

    const result = await adapter.save(storageKey, buffer);

    expect(result).toBeDefined();
    expect(result.storagePath).toBe(storageKey);
    expect(result.fileSizeBytes).toBe(buffer.length);
    expect(result.sha256Checksum).toHaveLength(64);

    const exists = await adapter.exists(storageKey);
    expect(exists).toBe(true);

    const retrievedBuffer = await adapter.getBuffer(storageKey);
    expect(retrievedBuffer.equals(buffer)).toBe(true);
  });

  it('should stream a stored file correctly', async () => {
    const buffer = Buffer.from('%PDF-1.4\nStreaming test content');
    const storageKey = 'documents/app-1/doc-stream.pdf';

    await adapter.save(storageKey, buffer);

    const stream = await adapter.getStream(storageKey);
    expect(stream).toBeDefined();

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const combined = Buffer.concat(chunks);
    expect(combined.equals(buffer)).toBe(true);
  });

  it('should delete a stored file safely and idempotently', async () => {
    const buffer = Buffer.from('%PDF-1.4\nDelete test');
    const storageKey = 'documents/app-1/to-delete.pdf';

    await adapter.save(storageKey, buffer);
    expect(await adapter.exists(storageKey)).toBe(true);

    await adapter.delete(storageKey);
    expect(await adapter.exists(storageKey)).toBe(false);

    // Deleting again should be safe and idempotent
    await expect(adapter.delete(storageKey)).resolves.not.toThrow();
  });

  it('should throw NotFoundException when getting buffer for non-existent key', async () => {
    await expect(adapter.getBuffer('documents/missing.pdf')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should reject path traversal in storage keys', async () => {
    const buffer = Buffer.from('malicious');
    const traversalKey = '../../../../etc/evil.txt';

    await expect(adapter.save(traversalKey, buffer)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject empty storage keys', async () => {
    const buffer = Buffer.from('test');

    await expect(adapter.save('', buffer)).rejects.toThrow(BadRequestException);
  });
});
