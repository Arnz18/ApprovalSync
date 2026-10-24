/**
 * ApprovalSync — Storage Adapter Interface & Injection Token
 * Milestone: DOC-01
 *
 * Provides abstraction for document persistence behind a server-controlled seam.
 * Supports local filesystem storage in development and future S3/GCS object storage.
 */

import { Readable } from 'stream';

export const STORAGE_ADAPTER_TOKEN = 'STORAGE_ADAPTER_TOKEN';

export interface StorageSaveResult {
  storagePath: string;
  fileSizeBytes: number;
  sha256Checksum: string;
}

export interface IStorageAdapter {
  /**
   * Save a file buffer to storage using a server-controlled key.
   */
  save(
    storageKey: string,
    fileBuffer: Buffer,
    mimeType?: string,
  ): Promise<StorageSaveResult>;

  /**
   * Retrieve a file as a readable stream for streaming downloads.
   */
  getStream(storageKey: string): Promise<Readable>;

  /**
   * Retrieve a file as an in-memory buffer.
   */
  getBuffer(storageKey: string): Promise<Buffer>;

  /**
   * Delete a stored file by key. Idempotent if file does not exist.
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Check whether a file exists at the given storage key.
   */
  exists(storageKey: string): Promise<boolean>;
}
