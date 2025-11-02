/**
 * File Handling Utilities for Multipart Form Data
 *
 * This module provides EffectJS-based utilities for handling file uploads
 * in Astro API routes. It includes functions for extracting files from
 * multipart/form-data, validating file types and sizes, and reading file content.
 *
 * Key Features:
 * - Extract files from multipart/form-data requests
 * - Validate file MIME types against whitelist
 * - Enforce file size limits
 * - Read file content as text with proper error handling
 */

import { Effect } from 'effect';
import { ValidationError } from '@/types/error.types';

/**
 * Maximum allowed file size in megabytes.
 * Set to 10MB to prevent memory issues with large file uploads.
 */
export const MAX_FILE_SIZE_MB = 10;

/**
 * Allowed MIME types for CSV files.
 * Includes common variants across different browsers and systems.
 */
export const ALLOWED_CSV_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain', // Some browsers report CSV as plain text
];

/**
 * Extracts a file from multipart/form-data request.
 *
 * This function parses the request body as FormData and extracts the file
 * from the specified field. It validates that the field exists and contains
 * a File object (not a string value).
 *
 * @param request - Astro API request object
 * @param fieldName - Name of the form field containing the file (e.g., 'file')
 * @returns Effect that succeeds with File object or fails with ValidationError
 *
 * @example
 * ```typescript
 * export const POST: APIRoute = async ({ request }) => {
 *   const fileEffect = parseMultipartFile(request, 'file');
 *   const file = await Effect.runPromise(fileEffect);
 * };
 * ```
 */
export function parseMultipartFile(request: Request, fieldName: string): Effect.Effect<File, ValidationError> {
  return Effect.tryPromise({
    try: async () => {
      const formData = await request.formData();
      const file = formData.get(fieldName);

      // Validate field exists
      if (!file) {
        throw new ValidationError(
          'File is required',
          [
            {
              field: fieldName,
              message: `No file provided in field '${fieldName}'`,
            },
          ],
          {
            context: { code: 'MISSING_FILE' },
          }
        );
      }

      // Validate it's a File object (not a string)
      if (!(file instanceof File)) {
        throw new ValidationError(
          'Invalid file format',
          [
            {
              field: fieldName,
              message: 'Expected a file upload, received text value',
            },
          ],
          {
            context: { code: 'INVALID_FILE_TYPE' },
          }
        );
      }

      return file;
    },
    catch: (error) => {
      // If error is already ValidationError, return it
      if (error instanceof ValidationError) {
        return error;
      }

      // Otherwise wrap in ValidationError
      return new ValidationError(
        'Failed to parse multipart form data',
        [
          {
            field: fieldName,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        {
          context: { code: 'FORM_DATA_PARSE_ERROR' },
        }
      );
    },
  });
}

/**
 * Validates file MIME type against allowed types.
 *
 * This function checks if the file's MIME type is in the whitelist of allowed types.
 * This prevents users from uploading non-CSV files to the import endpoint.
 *
 * @param file - File object to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns Effect that succeeds if valid, fails with ValidationError otherwise
 *
 * @example
 * ```typescript
 * const file = await Effect.runPromise(parseMultipartFile(request, 'file'));
 * await Effect.runPromise(
 *   validateFileType(file, ALLOWED_CSV_TYPES)
 * );
 * ```
 */
export function validateFileType(file: File, allowedTypes: string[]): Effect.Effect<void, ValidationError> {
  if (!allowedTypes.includes(file.type)) {
    return Effect.fail(
      new ValidationError(
        'Invalid file type',
        [
          {
            field: 'file',
            message: `File type '${file.type}' is not allowed. Expected: ${allowedTypes.join(', ')}`,
          },
        ],
        {
          context: { code: 'INVALID_FILE_TYPE' },
        }
      )
    );
  }

  return Effect.void;
}

/**
 * Reads file content as text with size validation.
 *
 * This function reads the entire file into memory as a text string.
 * It validates the file size before reading to prevent memory issues
 * with excessively large files.
 *
 * **Important**: This function loads the entire file into memory.
 * For very large files (>10MB), consider using a streaming approach.
 *
 * @param file - File object to read
 * @param maxSizeMB - Maximum allowed file size in MB (default: 10)
 * @returns Effect that succeeds with file content as string or fails with ValidationError
 *
 * @example
 * ```typescript
 * const file = await Effect.runPromise(parseMultipartFile(request, 'file'));
 * const content = await Effect.runPromise(readFileContent(file, 5)); // Max 5MB
 * ```
 */
export function readFileContent(
  file: File,
  maxSizeMB: number = MAX_FILE_SIZE_MB
): Effect.Effect<string, ValidationError> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Validate file size before reading
  if (file.size > maxSizeBytes) {
    return Effect.fail(
      new ValidationError(
        'File size exceeds limit',
        [
          {
            field: 'file',
            message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${maxSizeMB}MB`,
          },
        ],
        {
          context: { code: 'FILE_TOO_LARGE' },
        }
      )
    );
  }

  // Read file content
  return Effect.tryPromise({
    try: async () => {
      const text = await file.text();
      return text;
    },
    catch: (error) =>
      new ValidationError(
        'Failed to read file content',
        [
          {
            field: 'file',
            message: error instanceof Error ? error.message : 'Cannot read file',
          },
        ],
        {
          context: { code: 'FILE_READ_ERROR' },
        }
      ),
  });
}
