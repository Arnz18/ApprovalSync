/**
 * ApprovalSync — FileValidatorService Unit Tests
 * Milestone: DOC-01
 */

import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import {
  FileValidatorService,
  MAX_FILE_SIZE_BYTES,
} from './file-validator.service';
import { UploadedFile } from '../interfaces/file.interface';

describe('FileValidatorService', () => {
  let validator: FileValidatorService;

  beforeEach(() => {
    validator = new FileValidatorService();
  });

  const createMockFile = (
    buffer: Buffer,
    originalname = 'document.pdf',
    mimetype = 'application/pdf',
  ): UploadedFile => ({
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
  });

  describe('Supported Formats & Binary Signatures', () => {
    it('should successfully validate a valid PDF file starting with %PDF-', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      const mockFile = createMockFile(
        pdfBuffer,
        'land_record.pdf',
        'application/pdf',
      );

      const result = validator.validate(mockFile);

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('application/pdf');
      expect(result.sanitizedFileName).toBe('land_record.pdf');
      expect(result.fileSizeBytes).toBe(pdfBuffer.length);
      expect(result.sha256Checksum).toHaveLength(64);
    });

    it('should successfully validate a valid JPEG file starting with FF D8 FF', () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const mockFile = createMockFile(
        jpegBuffer,
        'campus_photo.jpg',
        'image/jpeg',
      );

      const result = validator.validate(mockFile);

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.sanitizedFileName).toBe('campus_photo.jpg');
      expect(result.fileSizeBytes).toBe(jpegBuffer.length);
    });

    it('should successfully validate a valid PNG file starting with 89 PNG', () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const mockFile = createMockFile(pngBuffer, 'floor_plan.png', 'image/png');

      const result = validator.validate(mockFile);

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('image/png');
      expect(result.sanitizedFileName).toBe('floor_plan.png');
      expect(result.fileSizeBytes).toBe(pngBuffer.length);
    });
  });

  describe('Empty and Missing File Handling', () => {
    it('should reject a 0-byte file buffer with ERR_EMPTY_FILE', () => {
      const mockFile = createMockFile(Buffer.alloc(0), 'empty.pdf');

      expect(() => validator.validate(mockFile)).toThrow(BadRequestException);
      try {
        validator.validate(mockFile);
      } catch (err: unknown) {
        const resp = (err as BadRequestException).getResponse() as {
          code: string;
        };
        expect(resp.code).toBe('ERR_EMPTY_FILE');
      }
    });

    it('should reject when file object or buffer is undefined', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 0,
        buffer: undefined as unknown as Buffer,
      };

      expect(() => validator.validate(mockFile)).toThrow(BadRequestException);
    });
  });

  describe('File Size Limit (15 MB)', () => {
    it('should reject a file larger than 15 MB with ERR_FILE_TOO_LARGE', () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
      oversizedBuffer[0] = 0x25; // %
      oversizedBuffer[1] = 0x50; // P
      oversizedBuffer[2] = 0x44; // D
      oversizedBuffer[3] = 0x46; // F
      oversizedBuffer[4] = 0x2d; // -

      const mockFile = createMockFile(oversizedBuffer, 'huge_document.pdf');

      expect(() => validator.validate(mockFile)).toThrow(
        PayloadTooLargeException,
      );
      try {
        validator.validate(mockFile);
      } catch (err: unknown) {
        const resp = (err as PayloadTooLargeException).getResponse() as {
          code: string;
        };
        expect(resp.code).toBe('ERR_FILE_TOO_LARGE');
      }
    });
  });

  describe('Extension Allowlisting and Disguised Executables', () => {
    it('should reject forbidden file extensions (.exe, .sh, .php, .zip)', () => {
      const buffer = Buffer.from('echo hello');
      const mockFile = createMockFile(buffer, 'script.sh', 'application/x-sh');

      expect(() => validator.validate(mockFile)).toThrow(BadRequestException);
      try {
        validator.validate(mockFile);
      } catch (err: unknown) {
        const resp = (err as BadRequestException).getResponse() as {
          code: string;
        };
        expect(resp.code).toBe('ERR_INVALID_FILE_TYPE');
      }
    });

    it('should reject a Windows executable (MZ header) disguised with .pdf extension', () => {
      const peBuffer = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00,
      ]);
      const mockFile = createMockFile(
        peBuffer,
        'trojan.pdf',
        'application/pdf',
      );

      expect(() => validator.validate(mockFile)).toThrow(BadRequestException);
      try {
        validator.validate(mockFile);
      } catch (err: unknown) {
        const resp = (err as BadRequestException).getResponse() as {
          code: string;
        };
        expect(resp.code).toBe('ERR_MALICIOUS_FILE_TYPE');
      }
    });

    it('should reject a Linux ELF executable disguised with .pdf extension', () => {
      const elfBuffer = Buffer.from([
        0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00,
      ]);
      const mockFile = createMockFile(
        elfBuffer,
        'payload.pdf',
        'application/pdf',
      );

      expect(() => validator.validate(mockFile)).toThrow(BadRequestException);
      try {
        validator.validate(mockFile);
      } catch (err: unknown) {
        const resp = (err as BadRequestException).getResponse() as {
          code: string;
        };
        expect(resp.code).toBe('ERR_MALICIOUS_FILE_TYPE');
      }
    });

    it('should reject a ZIP archive disguised with .pdf extension', () => {
      const zipBuffer = Buffer.from([
        0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00,
      ]);
      const mockFile = createMockFile(
        zipBuffer,
        'archive.pdf',
        'application/pdf',
      );

      expect(() => validator.validate(mockFile)).toThrow(BadRequestException);
      try {
        validator.validate(mockFile);
      } catch (err: unknown) {
        const resp = (err as BadRequestException).getResponse() as {
          code: string;
        };
        expect(resp.code).toBe('ERR_MALICIOUS_FILE_TYPE');
      }
    });
  });

  describe('MIME Spoofing and Signature Mismatch', () => {
    it('should reject a file declared as .pdf but containing JPEG binary bytes', () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const mockFile = createMockFile(
        jpegBuffer,
        'spoofed.pdf',
        'application/pdf',
      );

      expect(() => validator.validate(mockFile)).toThrow(BadRequestException);
      try {
        validator.validate(mockFile);
      } catch (err: unknown) {
        const resp = (err as BadRequestException).getResponse() as {
          code: string;
        };
        expect(resp.code).toBe('ERR_FILE_SIGNATURE_MISMATCH');
      }
    });

    it('should reject a file declared as .jpg but containing PDF binary bytes', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\ncontent');
      const mockFile = createMockFile(pdfBuffer, 'spoofed.jpg', 'image/jpeg');

      expect(() => validator.validate(mockFile)).toThrow(BadRequestException);
      try {
        validator.validate(mockFile);
      } catch (err: unknown) {
        const resp = (err as BadRequestException).getResponse() as {
          code: string;
        };
        expect(resp.code).toBe('ERR_FILE_SIGNATURE_MISMATCH');
      }
    });

    it('should reject a file with unknown/random binary signature', () => {
      const randomBuffer = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
      const mockFile = createMockFile(
        randomBuffer,
        'corrupted.pdf',
        'application/pdf',
      );

      expect(() => validator.validate(mockFile)).toThrow(BadRequestException);
      try {
        validator.validate(mockFile);
      } catch (err: unknown) {
        const resp = (err as BadRequestException).getResponse() as {
          code: string;
        };
        expect(resp.code).toBe('ERR_INVALID_FILE_SIGNATURE');
      }
    });
  });

  describe('Path Traversal & Filename Sanitization', () => {
    it('should sanitize path traversal attempts in filenames', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\ntest');
      const mockFile = createMockFile(
        pdfBuffer,
        '../../../../etc/passwd.pdf',
        'application/pdf',
      );

      const result = validator.validate(mockFile);
      expect(result.sanitizedFileName).toBe('passwd.pdf');
      expect(result.sanitizedFileName).not.toContain('..');
      expect(result.sanitizedFileName).not.toContain('/');
    });

    it('should sanitize Windows reserved device names (CON, PRN)', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\ntest');
      const mockFile = createMockFile(pdfBuffer, 'CON.pdf', 'application/pdf');

      const result = validator.validate(mockFile);
      expect(result.sanitizedFileName).toBe('doc_CON.pdf');
    });

    it('should replace dangerous special characters with safe underscores', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\ntest');
      const mockFile = createMockFile(
        pdfBuffer,
        'affidavit<script>&alert.pdf',
        'application/pdf',
      );

      const result = validator.validate(mockFile);
      expect(result.sanitizedFileName).toBe('affidavit_script__alert.pdf');
      expect(result.sanitizedFileName).not.toContain('<');
      expect(result.sanitizedFileName).not.toContain('>');
    });

    it('should compute exact deterministic SHA-256 checksum', () => {
      const pdfBuffer = Buffer.from(
        '%PDF-1.4\nApprovalSync-Deterministic-Test',
      );
      const mockFile = createMockFile(pdfBuffer, 'test.pdf');

      const result1 = validator.validate(mockFile);
      const result2 = validator.validate(mockFile);

      expect(result1.sha256Checksum).toBe(result2.sha256Checksum);
      expect(result1.sha256Checksum).toHaveLength(64);
    });
  });
});
