/**
 * ApprovalSync — Validation Pipe Unit Tests
 * Milestone: BE-01
 */

import { ValidationError } from '@nestjs/common';
import {
  formatValidationErrors,
  validationExceptionFactory,
} from './validation.pipe';

describe('ValidationPipe error formatting', () => {
  it('should format simple property validation errors with rule and field', () => {
    const error: ValidationError = {
      property: 'landAreaAcres',
      constraints: {
        isPositive: 'landAreaAcres must be a positive number',
        isNumber:
          'landAreaAcres must be a number conforming to the specified constraints',
      },
      children: [],
    };

    const details = formatValidationErrors([error]);
    expect(details).toHaveLength(2);
    expect(details[0]).toEqual({
      field: 'landAreaAcres',
      message: 'landAreaAcres must be a positive number',
      rule: 'isPositive',
    });
    expect(details[1]).toEqual({
      field: 'landAreaAcres',
      message:
        'landAreaAcres must be a number conforming to the specified constraints',
      rule: 'isNumber',
    });
  });

  it('should format nested DTO property errors with dotted paths', () => {
    const nestedError: ValidationError = {
      property: 'address',
      children: [
        {
          property: 'pincode',
          constraints: {
            matches: 'pincode must match the 6-digit Indian PIN code format',
            isNotEmpty: 'pincode should not be empty',
          },
          children: [],
        },
      ],
    };

    const details = formatValidationErrors([nestedError]);
    expect(details).toHaveLength(2);
    expect(details[0]).toEqual({
      field: 'address.pincode',
      message: 'pincode must match the 6-digit Indian PIN code format',
      rule: 'matches',
    });
    expect(details[1]).toEqual({
      field: 'address.pincode',
      message: 'pincode should not be empty',
      rule: 'isNotEmpty',
    });
  });

  it('should format deeply nested DTO hierarchies', () => {
    const deepError: ValidationError = {
      property: 'institution',
      children: [
        {
          property: 'trustDetails',
          children: [
            {
              property: 'registrationDate',
              constraints: {
                isIso8601:
                  'registrationDate must be a valid ISO 8601 date string',
              },
              children: [],
            },
          ],
        },
      ],
    };

    const details = formatValidationErrors([deepError]);
    expect(details).toHaveLength(1);
    expect(details[0]).toEqual({
      field: 'institution.trustDetails.registrationDate',
      message: 'registrationDate must be a valid ISO 8601 date string',
      rule: 'isIso8601',
    });
  });

  it('should produce structured BadRequestException with ERR_VALIDATION_FAILED code', () => {
    const errors: ValidationError[] = [
      {
        property: 'email',
        constraints: {
          isEmail: 'email must be an email',
        },
        children: [],
      },
    ];

    const exception = validationExceptionFactory(errors);
    expect(exception.getStatus()).toBe(400);

    const res = exception.getResponse() as Record<string, unknown>;
    expect(res.code).toBe('ERR_VALIDATION_FAILED');
    expect(res.message).toBe(
      'One or more request parameters failed validation.',
    );
    expect(res.details).toEqual([
      {
        field: 'email',
        message: 'email must be an email',
        rule: 'isEmail',
      },
    ]);
  });
});
