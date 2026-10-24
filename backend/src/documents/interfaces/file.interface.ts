/**
 * ApprovalSync — Uploaded File Interface
 * Milestone: DOC-01
 *
 * Defines the contract for multipart-uploaded files processed by Multer and NestJS.
 */

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface ValidatedFile {
  sanitizedFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  buffer: Buffer;
  sha256Checksum: string;
}
