/**
 * ApprovalSync — Correlation Middleware Unit Tests
 * Milestone: BE-01
 */

import {
  CorrelationMiddleware,
  sanitizeCorrelationId,
  RequestWithCorrelation,
} from './correlation.middleware';
import { Response } from 'express';
import { validate as validateUuid } from 'uuid';

describe('CorrelationMiddleware & sanitizeCorrelationId', () => {
  let middleware: CorrelationMiddleware;

  beforeEach(() => {
    middleware = new CorrelationMiddleware();
  });

  describe('sanitizeCorrelationId', () => {
    it('should preserve valid UUIDv4 identifiers', () => {
      const validUuid = 'c3f8d1e0-4a8b-4f9e-9d2a-1b2c3d4e5f6a';
      expect(sanitizeCorrelationId(validUuid)).toBe(validUuid);
    });

    it('should preserve safe alphanumeric identifiers up to 64 chars', () => {
      const safeCustomId = 'req_test-1234567890';
      expect(sanitizeCorrelationId(safeCustomId)).toBe(safeCustomId);
    });

    it('should generate a valid UUIDv4 when input is undefined or null', () => {
      const id1 = sanitizeCorrelationId(undefined);
      const id2 = sanitizeCorrelationId(null);
      expect(validateUuid(id1)).toBe(true);
      expect(validateUuid(id2)).toBe(true);
    });

    it('should replace empty or whitespace-only IDs with a valid UUIDv4', () => {
      const id1 = sanitizeCorrelationId('');
      const id2 = sanitizeCorrelationId('   ');
      expect(validateUuid(id1)).toBe(true);
      expect(validateUuid(id2)).toBe(true);
    });

    it('should reject and replace oversized IDs (> 64 characters)', () => {
      const oversized = 'a'.repeat(65);
      const result = sanitizeCorrelationId(oversized);
      expect(validateUuid(result)).toBe(true);
      expect(result).not.toBe(oversized);
    });

    it('should reject and replace IDs containing CRLF or control characters', () => {
      const crlfId = 'valid-prefix\r\nInjected-Header: evil';
      const result = sanitizeCorrelationId(crlfId);
      expect(validateUuid(result)).toBe(true);
      expect(result).not.toContain('\r');
      expect(result).not.toContain('\n');
    });

    it('should reject and replace IDs containing spaces or special characters', () => {
      const invalidChars = [
        'id with space',
        'id<script>alert(1)</script>',
        'id;DROP TABLE users;',
        'id/with/slashes',
        'id?query=param',
      ];

      for (const input of invalidChars) {
        const result = sanitizeCorrelationId(input);
        expect(validateUuid(result)).toBe(true);
      }
    });
  });

  describe('middleware execution', () => {
    it('should attach correlationId to request and set response header', () => {
      const req = {
        headers: {
          'x-correlation-id': 'test-corr-id-001',
        },
      } as unknown as RequestWithCorrelation;

      const headersSet: Record<string, string> = {};
      const res = {
        setHeader: jest.fn((key: string, value: string) => {
          headersSet[key] = value;
        }),
      } as unknown as Response;

      const next = jest.fn();

      middleware.use(req, res, next);

      expect(req.correlationId).toBe('test-corr-id-001');
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Correlation-Id',
        'test-corr-id-001',
      );
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should generate fresh UUIDv4 and set on request and response when header is missing', () => {
      const req = {
        headers: {},
      } as unknown as RequestWithCorrelation;

      const res = {
        setHeader: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      middleware.use(req, res, next);

      expect(req.correlationId).toBeDefined();
      expect(validateUuid(req.correlationId!)).toBe(true);
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Correlation-Id',
        req.correlationId,
      );
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
