/**
 * ApprovalSync — Structured Validation Pipe & Error Formatter
 * Milestone: BE-01
 *
 * Implements structured class-validator error formatting producing field-level
 * error details with stable machine-readable rule names.
 * Supports arbitrary nested DTO and array validation hierarchies.
 */

import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { FieldError } from '../../shared/contracts';

/**
 * Recursively formats class-validator ValidationError objects into flat FieldError[]
 * with dot-delimited property paths (e.g. "institution.address.pincode").
 */
export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  const result: FieldError[] = [];

  for (const error of errors) {
    const currentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const [rule, message] of Object.entries(error.constraints)) {
        result.push({
          field: currentPath,
          message,
          rule,
        });
      }
    }

    if (error.children && error.children.length > 0) {
      result.push(...formatValidationErrors(error.children, currentPath));
    }
  }

  return result;
}

/**
 * Exception factory for ValidationPipe converting ValidationError[] to structured BadRequestException.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const details = formatValidationErrors(errors);
  return new BadRequestException({
    code: 'ERR_VALIDATION_FAILED',
    message: 'One or more request parameters failed validation.',
    details,
  });
}

/**
 * Returns the standard ApprovalSync ValidationPipe configuration.
 */
export function createAppValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: false,
    },
    exceptionFactory: validationExceptionFactory,
  });
}
