/**
 * ApprovalSync — Local Filesystem Storage Adapter
 * Milestone: DOC-01
 *
 * Implements IStorageAdapter for local filesystem storage outside web root.
 * Enforces server-controlled storage keys and defends against path traversal.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import {
  IStorageAdapter,
  StorageSaveResult,
} from '../interfaces/storage-adapter.interface';

@Injectable()
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly storageRoot: string;

  constructor(private readonly configService: ConfigService) {
    const configuredPath = this.configService.get<string>('STORAGE_ROOT');
    this.storageRoot = configuredPath
      ? path.resolve(configuredPath)
      : path.resolve(process.cwd(), 'storage', 'documents');

    // Ensure the storage root exists on instantiation
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  /**
   * Resolves a relative storage key to an absolute path, strictly verifying
   * that it does not escape the configured storage root (path traversal defense).
   */
  private resolveSafePath(storageKey: string): string {
    if (!storageKey || storageKey.trim().length === 0) {
      throw new BadRequestException({
        code: 'ERR_INVALID_STORAGE_KEY',
        message: 'Storage key cannot be empty.',
      });
    }

    // Strip leading slashes to prevent root-relative escapes
    const normalizedKey = storageKey.replace(/^[/\\]+/, '');
    const resolvedPath = path.resolve(this.storageRoot, normalizedKey);

    // Verify resolved path is strictly inside storageRoot
    if (!resolvedPath.startsWith(this.storageRoot)) {
      this.logger.error(
        `Path traversal attempt detected with storage key: '${storageKey}' -> '${resolvedPath}'`,
      );
      throw new BadRequestException({
        code: 'ERR_PATH_TRAVERSAL_DETECTED',
        message: 'Invalid storage key: directory traversal attempt detected.',
      });
    }

    return resolvedPath;
  }

  async save(
    storageKey: string,
    fileBuffer: Buffer,
  ): Promise<StorageSaveResult> {
    const targetPath = this.resolveSafePath(storageKey);
    const parentDir = path.dirname(targetPath);

    // Ensure target directory exists
    await fs.promises.mkdir(parentDir, { recursive: true });

    // Write file with non-executable private permissions (0o600: read/write by owner only)
    await fs.promises.writeFile(targetPath, fileBuffer, { mode: 0o600 });

    const sha256Checksum = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    return {
      storagePath: storageKey,
      fileSizeBytes: fileBuffer.length,
      sha256Checksum,
    };
  }

  async getBuffer(storageKey: string): Promise<Buffer> {
    const targetPath = this.resolveSafePath(storageKey);
    try {
      return await fs.promises.readFile(targetPath);
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        throw new NotFoundException({
          code: 'ERR_FILE_NOT_FOUND',
          message: 'The requested document file does not exist in storage.',
        });
      }
      throw err;
    }
  }

  async getStream(storageKey: string): Promise<Readable> {
    const targetPath = this.resolveSafePath(storageKey);
    try {
      await fs.promises.access(targetPath, fs.constants.R_OK);
      return fs.createReadStream(targetPath);
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        throw new NotFoundException({
          code: 'ERR_FILE_NOT_FOUND',
          message: 'The requested document file does not exist in storage.',
        });
      }
      throw err;
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      const targetPath = this.resolveSafePath(storageKey);
      await fs.promises.unlink(targetPath);
      this.logger.debug(`Deleted storage file: ${storageKey}`);
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code !== 'ENOENT') {
        this.logger.warn(
          `Failed to delete storage file '${storageKey}': ${nodeErr.message}`,
        );
      }
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      const targetPath = this.resolveSafePath(storageKey);
      await fs.promises.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
