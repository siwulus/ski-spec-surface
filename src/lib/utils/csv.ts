/**
 * CSV Parsing and Generation Utilities
 *
 * This module provides EffectJS-based utilities for parsing and generating CSV files.
 * Uses csv-parse/sync for parsing and csv-stringify/sync for generation.
 *
 * Key Features:
 * - Supports comma (,) and semicolon (;) as field separators
 * - UTF-8 encoding with BOM for Excel compatibility
 * - Proper escaping of special characters (quotes, commas, newlines)
 * - Type-safe parsing with validation
 */

import { Effect } from 'effect';
import { parse, stringify } from 'csv/sync';
import { ValidationError } from '@/types/error.types';

/**
 * UTF-8 BOM (Byte Order Mark) for Excel compatibility.
 * Ensures proper encoding recognition in Microsoft Excel.
 */
const UTF8_BOM = '\uFEFF';

/**
 * Parses CSV content into array of objects.
 *
 * This function uses csv-parse/sync to convert CSV text into structured data.
 * It supports both comma and semicolon as field separators and handles
 * quoted fields containing special characters.
 *
 * @param content - CSV file content as string
 * @returns Effect that succeeds with array of row objects or fails with ValidationError
 *
 * @example
 * ```typescript
 * const csvContent = 'name,age\nJohn,30\nJane,25';
 * const result = await Effect.runPromise(parseCsvContent(csvContent));
 * // Result: [{ name: 'John', age: '30' }, { name: 'Jane', age: '25' }]
 * ```
 */
export function parseCsvContent(content: string): Effect.Effect<Record<string, string>[], ValidationError> {
  return Effect.try({
    try: () => {
      const records = parse(content, {
        columns: true, // Parse first row as headers, return objects
        skip_empty_lines: true, // Ignore empty lines
        delimiter: [',', ';'], // Support both comma and semicolon
        bom: true, // Handle UTF-8 BOM
        trim: true, // Trim whitespace from values
        relaxColumnCount: false, // Enforce consistent column count
      }) as Record<string, string>[];

      return records;
    },
    catch: (error) =>
      new ValidationError(
        'Failed to parse CSV file',
        [
          {
            field: 'file',
            message: error instanceof Error ? error.message : 'Invalid CSV format',
          },
        ],
        {
          context: { code: 'CSV_PARSE_ERROR' },
        }
      ),
  });
}

/**
 * Generates CSV content from array of objects.
 *
 * This function uses csv-stringify/sync to convert structured data into CSV format.
 * It includes headers, properly escapes special characters, and adds UTF-8 BOM
 * for Excel compatibility.
 *
 * @param data - Array of objects to convert to CSV
 * @param columns - Ordered list of column names to include
 * @returns Effect that succeeds with CSV string (with UTF-8 BOM) or fails with UnexpectedError
 *
 * @example
 * ```typescript
 * const data = [
 *   { name: 'John', age: '30' },
 *   { name: 'Jane', age: '25' }
 * ];
 * const csv = await Effect.runPromise(
 *   generateCsvContent(data, ['name', 'age'])
 * );
 * ```
 */
export function generateCsvContent<T>(data: T[], columns: readonly string[]): Effect.Effect<string, ValidationError> {
  return Effect.try({
    try: () => {
      const csvContent = stringify(data, {
        header: true, // Include header row
        columns: columns as string[], // Explicit column order
        delimiter: ',', // Always use comma for export
        quoted: true, // Quote all fields (RFC 4180 compliance)
        quoted_empty: true, // Quote empty strings
        quoted_string: true, // Quote all string values
      });

      // Add UTF-8 BOM for Excel compatibility
      return UTF8_BOM + csvContent;
    },
    catch: (error) =>
      new ValidationError(
        'Failed to generate CSV content',
        [
          {
            field: 'data',
            message: error instanceof Error ? error.message : 'Failed to stringify data',
          },
        ],
        {
          context: { code: 'CSV_GENERATION_ERROR' },
        }
      ),
  });
}

/**
 * Validates that CSV headers contain all required columns.
 *
 * This function checks if the parsed CSV file includes all mandatory columns
 * needed for importing data. It returns specific error messages listing
 * any missing columns.
 *
 * @param headers - Column headers from parsed CSV
 * @param requiredHeaders - List of required column names
 * @returns Effect that succeeds if all required headers present, fails with ValidationError otherwise
 *
 * @example
 * ```typescript
 * const headers = ['name', 'length_cm', 'tip_mm'];
 * const required = ['name', 'length_cm', 'tip_mm', 'waist_mm'];
 * const result = await Effect.runPromise(
 *   validateCsvHeaders(headers, required)
 * );
 * // Fails with error: "Missing required columns: waist_mm"
 * ```
 */
export function validateCsvHeaders(
  headers: string[],
  requiredHeaders: readonly string[]
): Effect.Effect<void, ValidationError> {
  const missingHeaders = requiredHeaders.filter((required) => !headers.includes(required));

  if (missingHeaders.length > 0) {
    return Effect.fail(
      new ValidationError(
        'CSV file is missing required columns',
        [
          {
            field: 'headers',
            message: `Missing required columns: ${missingHeaders.join(', ')}`,
          },
        ],
        {
          context: { code: 'MISSING_CSV_COLUMNS' },
        }
      )
    );
  }

  return Effect.void;
}
