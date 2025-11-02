/**
 * Ski Specification Import/Export Service
 *
 * This service encapsulates all business logic for CSV import/export operations
 * for ski specifications. It follows the EffectJS pattern used throughout the codebase
 * and integrates with the existing SkiSpecService for CRUD operations.
 *
 * Key Features:
 * - Export specifications to CSV with filtering and sorting
 * - Import specifications from CSV with partial success support
 * - Automatic calculation of surface area and relative weight
 * - Detailed validation and error reporting
 * - Decimal separator normalization (comma to dot)
 *
 * CSV Format (Per PRD Section 3.5):
 * - Field separator: comma (,) for export; comma or semicolon for import
 * - Decimal separator: dot (.) for export; dot or comma for import
 * - Encoding: UTF-8 with BOM
 * - Headers: Include units (e.g., length_cm, radius_m)
 */

import { Effect, pipe } from 'effect';
import type { SkiSpecService } from './SkiSpecService';
import type {
  SkiSpecDTO,
  ExportSkiSpecsQuery,
  ImportResponse,
  ImportSummary,
  ImportedItem,
  ImportError,
  CreateSkiSpecCommand,
} from '@/types/api.types';
import { CreateSkiSpecCommandSchema } from '@/types/api.types';
import type { SkiSpecError } from '@/types/error.types';
import { ValidationError } from '@/types/error.types';
import { parseCsvContent, generateCsvContent, validateCsvHeaders } from '@/lib/utils/csv';

/**
 * CSV column names in export order (per PRD section 3.5).
 * Includes all required and optional fields, plus calculated fields.
 */
const CSV_COLUMNS = [
  'name',
  'description',
  'length_cm',
  'tip_mm',
  'waist_mm',
  'tail_mm',
  'radius_m',
  'weight_g',
  'surface_area_cm2',
  'relative_weight_g_cm2',
] as const;

/**
 * Required columns for CSV import (per PRD section 3.5).
 * Description is optional; calculated fields are ignored if present.
 */
const REQUIRED_IMPORT_COLUMNS = ['name', 'length_cm', 'tip_mm', 'waist_mm', 'tail_mm', 'radius_m', 'weight_g'] as const;

/**
 * CSV row format for export.
 * All numeric fields are converted to strings with appropriate formatting.
 */
interface CsvExportRow {
  name: string;
  description: string;
  length_cm: number;
  tip_mm: number;
  waist_mm: number;
  tail_mm: number;
  radius_m: string; // Formatted with .toFixed(2)
  weight_g: number;
  surface_area_cm2: string; // Formatted with .toFixed(2)
  relative_weight_g_cm2: string; // Formatted with .toFixed(2)
}

/**
 * Result of CSV row validation.
 * Either valid (with parsed command) or invalid (with error details).
 */
type ValidatedRow =
  | {
      _tag: 'Valid';
      data: CreateSkiSpecCommand;
      row: number;
      name: string;
    }
  | {
      _tag: 'Invalid';
      errors: { field: string; message: string }[];
      row: number;
      name: string;
    };

/**
 * Result of import operation per row.
 * Either success (with created spec) or failure (with error).
 */
type ImportResult =
  | {
      success: true;
      row: number;
      name: string;
      id: string;
    }
  | {
      success: false;
      row: number;
      name: string;
      errors: { field: string; message: string }[];
    };

/**
 * Service class for importing and exporting ski specifications as CSV.
 *
 * This service depends on SkiSpecService for core CRUD operations and adds
 * CSV-specific functionality on top.
 *
 * @example
 * ```typescript
 * const service = new SkiSpecImportExportService(skiSpecService);
 *
 * // Export
 * const { content, filename } = await Effect.runPromise(
 *   service.exportToCsv(userId, { search: 'Atomic' })
 * );
 *
 * // Import
 * const result = await Effect.runPromise(
 *   service.importFromCsv(userId, csvContent)
 * );
 * ```
 */
export class SkiSpecImportExportService {
  constructor(private readonly skiSpecService: SkiSpecService) {}

  /**
   * Exports user's ski specifications to CSV format.
   *
   * This method:
   * 1. Fetches specifications using existing listSkiSpecs (with filtering/sorting)
   * 2. Formats each spec for CSV export (proper number formatting)
   * 3. Generates CSV content with headers
   * 4. Returns CSV content and filename
   *
   * Format details (per PRD 3.7):
   * - Integers: length, tip, waist, tail, weight (no decimals)
   * - 2 decimals: radius, surface_area, relative_weight
   * - Decimal separator: dot (.)
   * - Field separator: comma (,)
   *
   * @param userId - Authenticated user ID
   * @param query - Export filters (search, sort_by, sort_order)
   * @returns Effect with CSV content and filename
   */
  exportToCsv(
    userId: string,
    query: ExportSkiSpecsQuery
  ): Effect.Effect<{ content: string; filename: string }, SkiSpecError> {
    return pipe(
      // Step 1: Fetch all specifications with filters (handles pagination internally)
      this.fetchAllSkiSpecs(userId, query),

      // Step 2: Format each spec for CSV
      Effect.map((specs) => specs.map((spec) => this.formatSpecForCsv(spec))),

      // Step 3: Generate CSV content
      Effect.flatMap((rows) => generateCsvContent<CsvExportRow>(rows, CSV_COLUMNS)),

      // Step 4: Add filename
      Effect.map((content) => ({
        content,
        filename: this.generateFilename(),
      }))
    );
  }

  /**
   * Imports ski specifications from CSV content.
   *
   * This method implements partial success pattern:
   * - Valid rows are imported even if some rows fail
   * - Each row is validated independently
   * - Detailed error reporting for failed rows
   *
   * Process:
   * 1. Parse CSV content
   * 2. Validate structure (required headers)
   * 3. Validate each row (business rules)
   * 4. Import valid rows sequentially
   * 5. Collect successes and failures
   * 6. Return summary with details
   *
   * @param userId - Authenticated user ID
   * @param csvContent - CSV file content as string
   * @returns Effect with import summary and detailed results
   */
  importFromCsv(userId: string, csvContent: string): Effect.Effect<ImportResponse, SkiSpecError> {
    return pipe(
      // Step 1: Parse CSV content
      parseCsvContent(csvContent),

      // Step 2: Validate non-empty and structure
      Effect.flatMap((rows) => this.validateCsvNotEmpty(rows)),

      // Step 3: Validate each row
      Effect.map((rows) => this.validateAndParseCsvRows(rows)),

      // Step 4: Import valid rows sequentially
      Effect.flatMap(({ validRows, invalidRows }) =>
        pipe(
          this.importValidRows(userId, validRows),
          Effect.map(({ importedResults, failedResults }) => ({
            importedResults,
            failedResults,
            validationErrors: invalidRows,
          }))
        )
      ),

      // Step 5: Build ImportResponse
      Effect.map(({ importedResults, failedResults, validationErrors }) =>
        this.buildImportResponse(importedResults, failedResults, validationErrors)
      )
    );
  }

  /**
   * Fetches all ski specifications matching the query by paginating through all pages.
   *
   * This method:
   * 1. Fetches the first page to get the total count
   * 2. If total <= pageSize, returns the first page data
   * 3. If total > pageSize, loops through all remaining pages sequentially
   * 4. Combines all results into a single array
   *
   * Pages are fetched sequentially (not in parallel) to respect sorting and avoid
   * race conditions when the dataset changes during export.
   *
   * @param userId - Authenticated user ID
   * @param query - Export filters (search, sort_by, sort_order)
   * @returns Effect with all matching ski specifications
   */
  private fetchAllSkiSpecs(userId: string, query: ExportSkiSpecsQuery): Effect.Effect<SkiSpecDTO[], SkiSpecError> {
    const pageSize = 1000; // Reasonable page size for efficient fetching

    return pipe(
      // Step 1: Fetch first page to get total count
      this.skiSpecService.listSkiSpecs(userId, {
        ...query,
        page: 1,
        limit: pageSize,
      }),

      // Step 2: Check if we need to fetch more pages
      Effect.flatMap((firstPage) => {
        const { data, total } = firstPage;

        // If total is within first page, return immediately
        if (total <= pageSize) {
          return Effect.succeed(data);
        }

        // Calculate total pages
        const totalPages = Math.ceil(total / pageSize);

        // Fetch remaining pages sequentially
        return pipe(
          Effect.succeed(data), // Start with first page data
          Effect.flatMap((allData) => this.fetchRemainingPages(userId, query, pageSize, totalPages, allData))
        );
      })
    );
  }

  /**
   * Fetches remaining pages after the first page.
   *
   * This helper method loops through pages 2 to totalPages sequentially,
   * accumulating results into the allData array.
   *
   * @param userId - Authenticated user ID
   * @param query - Export filters (search, sort_by, sort_order)
   * @param pageSize - Number of records per page
   * @param totalPages - Total number of pages to fetch
   * @param allData - Accumulated data from previous pages
   * @returns Effect with all accumulated ski specifications
   */
  private fetchRemainingPages(
    userId: string,
    query: ExportSkiSpecsQuery,
    pageSize: number,
    totalPages: number,
    allData: SkiSpecDTO[]
  ): Effect.Effect<SkiSpecDTO[], SkiSpecError> {
    // Generate page numbers for remaining pages (2 to totalPages)
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

    return pipe(
      // Fetch all remaining pages sequentially
      Effect.all(
        remainingPages.map((page) =>
          pipe(
            this.skiSpecService.listSkiSpecs(userId, {
              ...query,
              page,
              limit: pageSize,
            }),
            Effect.map((response) => response.data)
          )
        ),
        { concurrency: 1 } // Sequential to respect sorting
      ),
      // Combine all pages into single array
      Effect.map((pages) => {
        const allPages = [allData, ...pages];
        return allPages.flat();
      })
    );
  }

  /**
   * Validates that CSV content is not empty and has required headers.
   *
   * This method performs structural validation:
   * 1. Checks that CSV has at least one data row
   * 2. Validates that all required columns are present
   *
   * @param rows - Parsed CSV rows
   * @returns Effect with validated rows or ValidationError
   */
  private validateCsvNotEmpty(rows: Record<string, string>[]): Effect.Effect<Record<string, string>[], SkiSpecError> {
    if (rows.length === 0) {
      return Effect.fail(
        new ValidationError(
          'CSV file is empty',
          [
            {
              field: 'file',
              message: 'CSV file contains no data rows',
            },
          ],
          {
            context: { code: 'EMPTY_CSV' },
          }
        )
      );
    }

    const headers = Object.keys(rows[0]);
    return pipe(
      validateCsvHeaders(headers, REQUIRED_IMPORT_COLUMNS),
      Effect.map(() => rows)
    );
  }

  /**
   * Validates and parses all CSV rows.
   *
   * Each row is validated independently using Zod schema.
   * Rows are separated into valid and invalid categories.
   *
   * @param rows - Parsed CSV rows
   * @returns Object with valid and invalid rows
   */
  private validateAndParseCsvRows(rows: Record<string, string>[]): {
    validRows: Extract<ValidatedRow, { _tag: 'Valid' }>[];
    invalidRows: Extract<ValidatedRow, { _tag: 'Invalid' }>[];
  } {
    const validatedRows: ValidatedRow[] = rows.map((row, index) => {
      const rowNumber = index + 2; // +2 for header row + 1-indexed
      return this.parseCsvRow(row, rowNumber);
    });

    return {
      validRows: validatedRows.filter((r): r is Extract<ValidatedRow, { _tag: 'Valid' }> => r._tag === 'Valid'),
      invalidRows: validatedRows.filter((r): r is Extract<ValidatedRow, { _tag: 'Invalid' }> => r._tag === 'Invalid'),
    };
  }

  /**
   * Imports valid CSV rows sequentially.
   *
   * Process:
   * 1. Creates specifications one by one (concurrency: 1)
   * 2. Captures successful imports with ID
   * 3. Catches errors and converts to failed results
   *
   * @param userId - Authenticated user ID
   * @param validRows - Pre-validated rows ready for import
   * @returns Effect with arrays of imported and failed results
   */
  private importValidRows(
    userId: string,
    validRows: Extract<ValidatedRow, { _tag: 'Valid' }>[]
  ): Effect.Effect<
    {
      importedResults: Extract<ImportResult, { success: true }>[];
      failedResults: Extract<ImportResult, { success: false }>[];
    },
    never
  > {
    return pipe(
      Effect.all(
        validRows.map((row) =>
          pipe(
            this.skiSpecService.createSkiSpec(userId, row.data),
            Effect.map(
              (created): ImportResult => ({
                success: true,
                row: row.row,
                name: row.name,
                id: created.id,
              })
            ),
            Effect.catchAll(
              (error): Effect.Effect<ImportResult> =>
                Effect.succeed({
                  success: false,
                  row: row.row,
                  name: row.name,
                  errors: [
                    {
                      field: 'database',
                      message: error.message || 'Failed to create specification',
                    },
                  ],
                })
            )
          )
        ),
        { concurrency: 1 } // Sequential to avoid race conditions
      ),
      Effect.map((results) => ({
        importedResults: results.filter((r): r is Extract<ImportResult, { success: true }> => r.success),
        failedResults: results.filter((r): r is Extract<ImportResult, { success: false }> => !r.success),
      }))
    );
  }

  /**
   * Builds the final ImportResponse from import results and validation errors.
   *
   * Process:
   * 1. Maps imported results to ImportedItem format
   * 2. Combines validation errors and database errors
   * 3. Sorts all errors by row number
   * 4. Builds summary with counts
   *
   * @param importedResults - Successfully imported rows
   * @param failedResults - Rows that failed during database insert
   * @param validationErrors - Rows that failed validation
   * @returns Complete import response
   */
  private buildImportResponse(
    importedResults: Extract<ImportResult, { success: true }>[],
    failedResults: Extract<ImportResult, { success: false }>[],
    validationErrors: Extract<ValidatedRow, { _tag: 'Invalid' }>[]
  ): ImportResponse {
    const imported: ImportedItem[] = importedResults.map((r) => ({
      row: r.row,
      name: r.name,
      id: r.id,
    }));

    const errors: ImportError[] = [
      ...validationErrors.map((r) => ({
        row: r.row,
        name: r.name,
        errors: r.errors,
      })),
      ...failedResults.map((r) => ({
        row: r.row,
        name: r.name,
        errors: r.errors,
      })),
    ].sort((a, b) => a.row - b.row); // Sort by row number

    const summary: ImportSummary = {
      total_rows: imported.length + errors.length,
      successful: imported.length,
      failed: errors.length,
      skipped: 0,
    };

    return {
      summary,
      imported,
      errors,
    };
  }

  /**
   * Formats a ski spec DTO for CSV export.
   *
   * Applies number formatting rules from PRD section 3.7:
   * - Integers: length, tip, waist, tail, weight
   * - 2 decimals: radius, surface_area, relative_weight
   *
   * @param spec - Ski specification DTO
   * @returns CSV row with formatted values
   */
  private formatSpecForCsv(spec: SkiSpecDTO): CsvExportRow {
    return {
      name: spec.name,
      description: spec.description || '', // Empty string for null
      length_cm: spec.length,
      tip_mm: spec.tip,
      waist_mm: spec.waist,
      tail_mm: spec.tail,
      radius_m: spec.radius.toFixed(2), // 2 decimals
      weight_g: spec.weight,
      surface_area_cm2: spec.surface_area.toFixed(2), // 2 decimals
      relative_weight_g_cm2: spec.relative_weight.toFixed(2), // 2 decimals
    };
  }

  /**
   * Parses and validates a single CSV row.
   *
   * Process:
   * 1. Normalize decimal separators (comma to dot)
   * 2. Validate against CreateSkiSpecCommandSchema
   * 3. Return either valid command or validation errors
   *
   * @param row - CSV row as key-value pairs
   * @param rowNumber - Row number in file (for error reporting)
   * @returns Validated row (either valid command or errors)
   */
  private parseCsvRow(row: Record<string, string>, rowNumber: number): ValidatedRow {
    // Map CSV column names (with units) to schema field names (without units)
    // and convert string values to numbers
    const mapped = {
      name: row.name,
      description: row.description || null,
      length: Number(this.normalizeDecimalSeparator(row.length_cm || '')),
      tip: Number(this.normalizeDecimalSeparator(row.tip_mm || '')),
      waist: Number(this.normalizeDecimalSeparator(row.waist_mm || '')),
      tail: Number(this.normalizeDecimalSeparator(row.tail_mm || '')),
      radius: Number(this.normalizeDecimalSeparator(row.radius_m || '')),
      weight: Number(this.normalizeDecimalSeparator(row.weight_g || '')),
    };

    // Validate with Zod schema
    const validation = CreateSkiSpecCommandSchema.safeParse(mapped);

    if (validation.success) {
      return {
        _tag: 'Valid',
        data: validation.data,
        row: rowNumber,
        name: validation.data.name,
      };
    } else {
      return {
        _tag: 'Invalid',
        errors: validation.error.issues.map((e) => ({
          field: e.path.join('.') || 'unknown',
          message: e.message,
        })),
        row: rowNumber,
        name: row.name || 'Unknown',
      };
    }
  }

  /**
   * Normalizes decimal separator from comma to dot.
   *
   * Handles EU CSV format where decimals use comma (e.g., "18,5" → "18.5").
   * If value doesn't contain comma, returns unchanged.
   *
   * @param value - Numeric value as string
   * @returns Value with dot as decimal separator
   */
  private normalizeDecimalSeparator(value: string): string {
    if (typeof value !== 'string') return value;
    return value.replace(',', '.');
  }

  /**
   * Generates filename for CSV export.
   *
   * Format: ski-specs-YYYY-MM-DD.csv (per PRD section 3.5)
   * Uses current date in ISO format.
   *
   * @returns Filename string
   */
  private generateFilename(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `ski-specs-${date}.csv`;
  }
}
