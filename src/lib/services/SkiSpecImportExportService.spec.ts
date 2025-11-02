import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Effect } from 'effect';
import { SkiSpecImportExportService } from './SkiSpecImportExportService';
import type { SkiSpecService } from './SkiSpecService';
import type { SkiSpecDTO } from '@/types/api.types';
import { ValidationError } from '@/types/error.types';
import * as fs from 'fs';
import * as path from 'path';

// Helper to read test fixture files
const readFixture = (filename: string): string => {
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'csv', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
};

// Mock ski spec DTOs
const createMockSkiSpecDTO = (overrides?: Partial<SkiSpecDTO>): SkiSpecDTO => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Atomic Backland 100',
  description: 'Lightweight touring ski',
  length: 178,
  tip: 134,
  waist: 100,
  tail: 120,
  radius: 18.5,
  weight: 1450,
  surface_area: 2097.33,
  relative_weight: 0.69,
  algorithm_version: '1.0.0',
  notes_count: 0,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

describe('SkiSpecImportExportService', () => {
  let service: SkiSpecImportExportService;
  let mockSkiSpecService: SkiSpecService;
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockSkiSpecService = {
      listSkiSpecs: vi.fn(),
      createSkiSpec: vi.fn(),
    } as unknown as SkiSpecService;

    service = new SkiSpecImportExportService(mockSkiSpecService);
  });

  describe('exportToCsv', () => {
    it('should export ski specifications to CSV format', async () => {
      const mockSpecs = [
        createMockSkiSpecDTO(),
        createMockSkiSpecDTO({
          id: '223e4567-e89b-12d3-a456-426614174001',
          name: 'Dynafit Beast 108',
          description: 'Freeride touring ski',
          length: 184,
          tip: 138,
          waist: 108,
          tail: 126,
          radius: 22.0,
          weight: 1680,
          surface_area: 2282.67,
          relative_weight: 0.74,
        }),
      ];

      const mockResponse = {
        data: mockSpecs,
        total: 2,
      };

      (mockSkiSpecService.listSkiSpecs as ReturnType<typeof vi.fn>).mockReturnValue(Effect.succeed(mockResponse));

      const result = await Effect.runPromise(
        service.exportToCsv(TEST_USER_ID, { sort_by: 'created_at', sort_order: 'desc', search: 'Atomic' })
      );

      expect(result.content).toBeDefined();
      expect(result.filename).toMatch(/ski-specs-\d{4}-\d{2}-\d{2}\.csv/);

      // Verify CSV structure
      expect(result.content).toContain('name');
      expect(result.content).toContain('length_cm');
      expect(result.content).toContain('Atomic Backland 100');
      expect(result.content).toContain('Dynafit Beast 108');

      // Verify UTF-8 BOM
      expect(result.content.charCodeAt(0)).toBe(0xfeff);

      // Verify service was called with correct parameters (pageSize is 1000 now)
      expect(mockSkiSpecService.listSkiSpecs).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          search: 'Atomic',
          page: 1,
          limit: 1000,
        })
      );
    });

    it('should format numbers with correct decimal places', async () => {
      const mockSpecs = [createMockSkiSpecDTO()];

      const mockResponse = {
        data: mockSpecs,
        total: 1,
      };

      (mockSkiSpecService.listSkiSpecs as ReturnType<typeof vi.fn>).mockReturnValue(Effect.succeed(mockResponse));

      const result = await Effect.runPromise(
        service.exportToCsv(TEST_USER_ID, { sort_by: 'created_at', sort_order: 'desc' })
      );

      // Integers should have no decimals
      expect(result.content).toContain('178');
      expect(result.content).toContain('134');
      expect(result.content).toContain('1450');

      // Radius, surface_area, relative_weight should have 2 decimals
      expect(result.content).toContain('18.50');
      expect(result.content).toContain('2097.33');
      expect(result.content).toContain('0.69');
    });

    it('should handle empty description as empty string', async () => {
      const mockSpecs = [
        createMockSkiSpecDTO({
          description: null,
        }),
      ];

      const mockResponse = {
        data: mockSpecs,
        total: 1,
      };

      (mockSkiSpecService.listSkiSpecs as ReturnType<typeof vi.fn>).mockReturnValue(Effect.succeed(mockResponse));

      const result = await Effect.runPromise(
        service.exportToCsv(TEST_USER_ID, { sort_by: 'created_at', sort_order: 'desc' })
      );

      // Should contain empty quoted field for description
      expect(result.content).toContain('""');
    });

    it('should handle empty specs list', async () => {
      const mockResponse = {
        data: [],
        total: 0,
      };

      (mockSkiSpecService.listSkiSpecs as ReturnType<typeof vi.fn>).mockReturnValue(Effect.succeed(mockResponse));

      const result = await Effect.runPromise(
        service.exportToCsv(TEST_USER_ID, { sort_by: 'name', sort_order: 'asc', search: 'Atomic' })
      );

      // Should still have headers
      expect(result.content).toContain('name');
      expect(result.content).toContain('length_cm');
    });

    it('should propagate errors from listSkiSpecs', async () => {
      const error = new ValidationError('Test error', []);

      (mockSkiSpecService.listSkiSpecs as ReturnType<typeof vi.fn>).mockReturnValue(Effect.fail(error));

      const exit = await Effect.runPromiseExit(
        service.exportToCsv(TEST_USER_ID, { sort_by: 'created_at', sort_order: 'desc' })
      );

      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
        expect(exit.cause.error).toBe(error);
      }
    });

    it('should fetch all data across multiple pages when total exceeds page size', async () => {
      const pageSize = 1000;
      const totalRecords = 2500; // More than one page
      const totalPages = Math.ceil(totalRecords / pageSize); // 3 pages

      // Create mock specs for each page
      const page1Specs = Array.from({ length: pageSize }, (_, i) =>
        createMockSkiSpecDTO({ id: `id-${i}`, name: `Ski ${i}` })
      );
      const page2Specs = Array.from({ length: pageSize }, (_, i) =>
        createMockSkiSpecDTO({ id: `id-${pageSize + i}`, name: `Ski ${pageSize + i}` })
      );
      const page3Specs = Array.from({ length: totalRecords - 2 * pageSize }, (_, i) =>
        createMockSkiSpecDTO({ id: `id-${2 * pageSize + i}`, name: `Ski ${2 * pageSize + i}` })
      );

      // Mock listSkiSpecs to return different results for each page
      (mockSkiSpecService.listSkiSpecs as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(
          Effect.succeed({
            data: page1Specs,
            total: totalRecords,
          })
        )
        .mockReturnValueOnce(
          Effect.succeed({
            data: page2Specs,
            total: totalRecords,
          })
        )
        .mockReturnValueOnce(
          Effect.succeed({
            data: page3Specs,
            total: totalRecords,
          })
        );

      const result = await Effect.runPromise(
        service.exportToCsv(TEST_USER_ID, { sort_by: 'created_at', sort_order: 'desc' })
      );

      // Verify all records are in CSV
      expect(result.content).toContain('Ski 0');
      expect(result.content).toContain('Ski 999');
      expect(result.content).toContain('Ski 1999');
      expect(result.content).toContain('Ski 2499');

      // Verify listSkiSpecs was called for each page
      expect(mockSkiSpecService.listSkiSpecs).toHaveBeenCalledTimes(totalPages);
      expect(mockSkiSpecService.listSkiSpecs).toHaveBeenNthCalledWith(
        1,
        TEST_USER_ID,
        expect.objectContaining({ page: 1, limit: pageSize })
      );
      expect(mockSkiSpecService.listSkiSpecs).toHaveBeenNthCalledWith(
        2,
        TEST_USER_ID,
        expect.objectContaining({ page: 2, limit: pageSize })
      );
      expect(mockSkiSpecService.listSkiSpecs).toHaveBeenNthCalledWith(
        3,
        TEST_USER_ID,
        expect.objectContaining({ page: 3, limit: pageSize })
      );
    });

    it('should only fetch first page when total is within page size', async () => {
      const pageSize = 1000;
      const totalRecords = 500; // Less than page size

      const mockSpecs = Array.from({ length: totalRecords }, (_, i) =>
        createMockSkiSpecDTO({ id: `id-${i}`, name: `Ski ${i}` })
      );

      (mockSkiSpecService.listSkiSpecs as ReturnType<typeof vi.fn>).mockReturnValue(
        Effect.succeed({
          data: mockSpecs,
          total: totalRecords,
        })
      );

      const result = await Effect.runPromise(
        service.exportToCsv(TEST_USER_ID, { sort_by: 'created_at', sort_order: 'desc' })
      );

      // Verify listSkiSpecs was called only once
      expect(mockSkiSpecService.listSkiSpecs).toHaveBeenCalledTimes(1);
      expect(mockSkiSpecService.listSkiSpecs).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({ page: 1, limit: pageSize })
      );

      // Verify all records are in CSV
      expect(result.content).toContain('Ski 0');
      expect(result.content).toContain('Ski 499');
    });
  });

  describe('importFromCsv', () => {
    it('should import valid CSV with all specs succeeding', async () => {
      const csvContent = readFixture('valid-ski-specs.csv');

      (mockSkiSpecService.createSkiSpec as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(Effect.succeed(createMockSkiSpecDTO({ id: 'id-1', name: 'Atomic Backland 100' })))
        .mockReturnValueOnce(Effect.succeed(createMockSkiSpecDTO({ id: 'id-2', name: 'Dynafit Beast 108' })))
        .mockReturnValueOnce(Effect.succeed(createMockSkiSpecDTO({ id: 'id-3', name: 'Black Diamond Helio 105' })));

      const result = await Effect.runPromise(service.importFromCsv(TEST_USER_ID, csvContent));

      expect(result.summary).toEqual({
        total_rows: 3,
        successful: 3,
        failed: 0,
        skipped: 0,
      });

      expect(result.imported).toHaveLength(3);
      expect(result.imported[0]).toMatchObject({
        row: 2,
        name: 'Atomic Backland 100',
        id: 'id-1',
      });

      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial success with some invalid rows', async () => {
      const csvContent = readFixture('invalid-data-types.csv');

      (mockSkiSpecService.createSkiSpec as ReturnType<typeof vi.fn>).mockReturnValue(
        Effect.succeed(createMockSkiSpecDTO())
      );

      const result = await Effect.runPromise(service.importFromCsv(TEST_USER_ID, csvContent));

      // All rows have invalid data types, so all should fail validation
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(3);
      expect(result.errors).toHaveLength(3);

      // Check that errors contain field-level details
      expect(result.errors[0].errors.length).toBeGreaterThan(0);
    });

    it('should fail when required columns are missing', async () => {
      const csvContent = readFixture('invalid-missing-columns.csv');

      const exit = await Effect.runPromiseExit(service.importFromCsv(TEST_USER_ID, csvContent));

      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('CSV file is missing required columns');
      }
    });

    it('should fail when CSV is empty', async () => {
      const csvContent = readFixture('empty-with-headers.csv');

      const exit = await Effect.runPromiseExit(service.importFromCsv(TEST_USER_ID, csvContent));

      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('CSV file is empty');
      }
    });

    it('should normalize EU decimal separators', async () => {
      const csvContent = readFixture('valid-ski-specs-eu-decimals.csv');

      const mockCreate = vi.fn().mockReturnValue(Effect.succeed(createMockSkiSpecDTO()));
      (mockSkiSpecService.createSkiSpec as ReturnType<typeof vi.fn>) = mockCreate;

      await Effect.runPromise(service.importFromCsv(TEST_USER_ID, csvContent));

      // Verify that createSkiSpec was called with normalized decimal values
      expect(mockCreate).toHaveBeenCalled();
      const firstCall = mockCreate.mock.calls[0];
      const command = firstCall[1];

      // EU format "18,5" should be normalized to 18.5 (number)
      expect(typeof command.radius).toBe('number');
      expect(command.radius).toBe(18.5);
      expect(Number.isNaN(command.radius)).toBe(false);
    });

    it('should handle database errors during import', async () => {
      const csvContent = readFixture('valid-ski-specs.csv');

      (mockSkiSpecService.createSkiSpec as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(Effect.succeed(createMockSkiSpecDTO({ id: 'id-1' })))
        .mockReturnValueOnce(Effect.fail(new ValidationError('Database error', [])))
        .mockReturnValueOnce(Effect.succeed(createMockSkiSpecDTO({ id: 'id-3' })));

      const result = await Effect.runPromise(service.importFromCsv(TEST_USER_ID, csvContent));

      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errors[0].field).toBe('database');
    });

    it('should sort errors by row number', async () => {
      const csvContent = readFixture('invalid-data-types.csv');

      const result = await Effect.runPromise(service.importFromCsv(TEST_USER_ID, csvContent));

      // Errors should be sorted by row number (2, 3, 4)
      expect(result.errors[0].row).toBeLessThan(result.errors[1].row);
      expect(result.errors[1].row).toBeLessThan(result.errors[2].row);
    });

    it('should process imports sequentially', async () => {
      const csvContent = readFixture('valid-ski-specs.csv');

      const createOrder: number[] = [];
      (mockSkiSpecService.createSkiSpec as ReturnType<typeof vi.fn>).mockImplementation(() => {
        createOrder.push(createOrder.length + 1);
        return Effect.succeed(createMockSkiSpecDTO());
      });

      await Effect.runPromise(service.importFromCsv(TEST_USER_ID, csvContent));

      // Verify sequential processing (order should be 1, 2, 3)
      expect(createOrder).toEqual([1, 2, 3]);
    });
  });

  describe('Filename Generation', () => {
    it('should generate filename with current date', async () => {
      const mockSpecs: SkiSpecDTO[] = [];
      const mockResponse = {
        data: mockSpecs,
        total: 0,
      };

      (mockSkiSpecService.listSkiSpecs as ReturnType<typeof vi.fn>).mockReturnValue(Effect.succeed(mockResponse));

      const result = await Effect.runPromise(
        service.exportToCsv(TEST_USER_ID, { sort_by: 'created_at', sort_order: 'desc' })
      );

      // Filename should match pattern: ski-specs-YYYY-MM-DD.csv
      expect(result.filename).toMatch(/^ski-specs-\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });
});
