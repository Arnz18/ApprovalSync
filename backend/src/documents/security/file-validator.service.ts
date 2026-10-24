/**
 * ApprovalSync — File Security & Binary Signature Validator
 * Milestone: DOC-01
 *
 * Implements defensive file validation:
 * 1. Rejection of zero-byte / empty files.
 * 2. 15MB file size limit enforcement (THR-02).
 * 3. File extension allowlisting (.pdf, .jpg, .jpeg, .png).
 * 4. Magic byte inspection (does not trust client-supplied MIME or extension).
 * 5. Explicit rejection of executable (PE/ELF/scripts) and archive formats (THR-01).
 * 6. MIME spoofing / signature mismatch detection.
 * 7. Path traversal & filename sanitization.
 * 8. Deterministic SHA-256 checksum calculation.
 */

import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import { UploadedFile, ValidatedFile } from '../interfaces/file.interface';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Megabytes

interface MagicByteSignature {
  mimeType: string;
  extension: string;
  matches: (buf: Buffer) => boolean;
}

const SUPPORTED_SIGNATURES: MagicByteSignature[] = [
  {
    mimeType: 'application/pdf',
    extension: '.pdf',
    // %PDF-
    matches: (buf: Buffer) =>
      buf.length >= 5 &&
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46 &&
      buf[4] === 0x2d,
  },
  {
    mimeType: 'image/jpeg',
    extension: '.jpg',
    // \xFF\xD8\xFF
    matches: (buf: Buffer) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    mimeType: 'image/png',
    extension: '.png',
    // \x89PNG\r\n\x1a\n
    matches: (buf: Buffer) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
];

const FORBIDDEN_SIGNATURES = [
  {
    name: 'Windows PE / DOS Executable (MZ)',
    matches: (buf: Buffer) =>
      buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a,
  },
  {
    name: 'Linux ELF Executable (\x7FELF)',
    matches: (buf: Buffer) =>
      buf.length >= 4 &&
      buf[0] === 0x7f &&
      buf[1] === 0x45 &&
      buf[2] === 0x4c &&
      buf[3] === 0x46,
  },
  {
    name: 'Shell Script Shebang (#!)',
    matches: (buf: Buffer) =>
      buf.length >= 2 && buf[0] === 0x23 && buf[1] === 0x21,
  },
  {
    name: 'ZIP / Office Archive (PK)',
    matches: (buf: Buffer) =>
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07) &&
      (buf[3] === 0x04 || buf[3] === 0x06 || buf[3] === 0x08),
  },
  {
    name: 'RAR Archive',
    matches: (buf: Buffer) =>
      buf.length >= 4 &&
      buf[0] === 0x52 &&
      buf[1] === 0x61 &&
      buf[2] === 0x72 &&
      buf[3] === 0x21,
  },
  {
    name: 'GZIP Archive',
    matches: (buf: Buffer) =>
      buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b,
  },
];

const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

@Injectable()
export class FileValidatorService {
  /**
   * Performs end-to-end security validation on an uploaded file.
   * Throws standardized HttpException with specific error code if invalid.
   */
  validate(file: UploadedFile): ValidatedFile {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        code: 'ERR_EMPTY_FILE',
        message: 'No file buffer received in upload payload.',
      });
    }

    const buffer = file.buffer;
    const fileSizeBytes = buffer.length;

    // 1. Zero-byte check
    if (fileSizeBytes === 0) {
      throw new BadRequestException({
        code: 'ERR_EMPTY_FILE',
        message: 'Uploaded file is empty (0 bytes).',
      });
    }

    // 2. Maximum file size check (15MB)
    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException({
        code: 'ERR_FILE_TOO_LARGE',
        message: `File size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds maximum permitted limit of 15 MB.`,
      });
    }

    // 3. Inspect raw original filename & extension
    const rawFileName = file.originalname || 'document';
    const rawExt = path.extname(rawFileName).toLowerCase();

    const allowedExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
    if (!allowedExtensions.has(rawExt)) {
      throw new BadRequestException({
        code: 'ERR_INVALID_FILE_TYPE',
        message: `Unsupported file extension '${rawExt}'. Only PDF (.pdf), JPEG (.jpg, .jpeg), and PNG (.png) files are accepted.`,
      });
    }

    // 4. Check for explicitly forbidden executable or archive binary signatures
    for (const forbidden of FORBIDDEN_SIGNATURES) {
      if (forbidden.matches(buffer)) {
        throw new BadRequestException({
          code: 'ERR_MALICIOUS_FILE_TYPE',
          message: `Upload rejected: file binary signature matches forbidden format '${forbidden.name}'.`,
        });
      }
    }

    // 5. Inspect magic bytes for supported formats
    const matchedSignature = SUPPORTED_SIGNATURES.find((sig) =>
      sig.matches(buffer),
    );

    if (!matchedSignature) {
      throw new BadRequestException({
        code: 'ERR_INVALID_FILE_SIGNATURE',
        message:
          'File binary signature does not match any accepted document format (PDF, JPEG, or PNG).',
      });
    }

    // 6. Signature / Extension consistency verification (MIME spoofing defense)
    const normalizedDetectedExt =
      matchedSignature.extension === '.jpg' && rawExt === '.jpeg'
        ? '.jpeg'
        : matchedSignature.extension;

    const isExtensionConsistent =
      (matchedSignature.mimeType === 'application/pdf' && rawExt === '.pdf') ||
      (matchedSignature.mimeType === 'image/jpeg' &&
        (rawExt === '.jpg' || rawExt === '.jpeg')) ||
      (matchedSignature.mimeType === 'image/png' && rawExt === '.png');

    if (!isExtensionConsistent) {
      throw new BadRequestException({
        code: 'ERR_FILE_SIGNATURE_MISMATCH',
        message: `File content signature (${matchedSignature.mimeType}) does not match the declared extension '${rawExt}'. Possible MIME spoofing detected.`,
      });
    }

    // 7. Sanitize filename (Path traversal and illegal characters defense)
    const sanitizedFileName = this.sanitizeFileName(
      rawFileName,
      normalizedDetectedExt,
    );

    // 8. Deterministic SHA-256 calculation
    const sha256Checksum = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex');

    return {
      sanitizedFileName,
      mimeType: matchedSignature.mimeType,
      fileSizeBytes,
      buffer,
      sha256Checksum,
    };
  }

  /**
   * Sanitizes an untrusted filename, stripping directory traversal sequences,
   * path separators, control characters, and Windows reserved names.
   */
  sanitizeFileName(originalName: string, expectedExt: string): string {
    // Strip null bytes and control characters
    let cleaned = originalName.replace(/[\x00-\x1f\x7f]/g, '');

    // Extract basename to eliminate path traversal (/ or \)
    cleaned = path.basename(cleaned);

    // Remove path traversal sequences e.g. ../ or ..\
    cleaned = cleaned.replace(/\.\.+/g, '.');

    // Remove any character not alphanumeric, dot, underscore, or hyphen
    cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Extract base name without extension
    const baseName = path.basename(cleaned, path.extname(cleaned));

    // Check Windows reserved names
    if (WINDOWS_RESERVED_NAMES.has(baseName.toUpperCase())) {
      cleaned = `doc_${cleaned}`;
    }

    // If cleaned name is empty or only dots
    if (!cleaned || cleaned.replace(/\./g, '').trim().length === 0) {
      cleaned = `document_${Date.now()}${expectedExt}`;
    }

    // Ensure the filename ends with the verified extension
    if (!cleaned.toLowerCase().endsWith(expectedExt.toLowerCase())) {
      cleaned = `${cleaned}${expectedExt}`;
    }

    // Enforce max filename length of 200 characters
    if (cleaned.length > 200) {
      const ext = path.extname(cleaned);
      const nameWithoutExt = cleaned.slice(0, 200 - ext.length);
      cleaned = `${nameWithoutExt}${ext}`;
    }

    return cleaned;
  }
}
