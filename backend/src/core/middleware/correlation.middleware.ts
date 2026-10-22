/**
 * ApprovalSync — Request Correlation Middleware
 * Milestone: BE-01
 *
 * Validates or assigns an immutable correlationId to every incoming request.
 * Enforces safe character set and length constraints to prevent CR/LF injection
 * and header smuggling attacks.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

// Allow canonical UUID or safe alphanumeric identifiers with hyphen/underscore up to 64 chars
const SAFE_CORRELATION_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export function sanitizeCorrelationId(rawId?: unknown): string {
  if (typeof rawId !== 'string') {
    return uuidv4();
  }

  const trimmed = rawId.trim();

  // Reject oversized values or values containing CR/LF, spaces, or illegal chars
  if (
    trimmed.length === 0 ||
    trimmed.length > 64 ||
    !SAFE_CORRELATION_ID_REGEX.test(trimmed)
  ) {
    return uuidv4();
  }

  return trimmed;
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelation, res: Response, next: NextFunction): void {
    const rawHeader = req.headers['x-correlation-id'];
    const correlationId = sanitizeCorrelationId(rawHeader);

    req.correlationId = correlationId;
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }
}
