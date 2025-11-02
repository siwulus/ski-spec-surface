import { describe, it, expect } from 'vitest';
import { Effect, Exit } from 'effect';
import { parseCsvContent, generateCsvContent, validateCsvHeaders } from './csv';
import { ValidationError } from '@/types/error.types';
import * as fs from 'fs';
import * as path from 'path';

// Helper to read test fixture files
const readFixture = (filename: string): string => {
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'csv', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
};

describe('CSV Utilities', () => {
  describe('parseCsvContent', () => {
    it('should parse valid CSV with comma delimiter', () => {
      const csvContent = readFixture('valid-ski-specs.csv');
      const effect = parseCsvContent(csvContent);
      const result = Effect.runSync(effect);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: 'Atomic Backland 100',
        description: 'Lightweight touring ski',
        length_cm: '178',
        tip_mm: '134',
        waist_mm: '100',
        tail_mm: '120',
        radius_m: '18.5',
        weight_g: '1450',
      });
    });

    it('should parse valid CSV with semicolon delimiter', () => {
      const csvContent = readFixture('valid-semicolon-delimiter.csv');
      const effect = parseCsvContent(csvContent);
      const result = Effect.runSync(effect);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'Atomic Backland 100',
        description: 'Lightweight touring ski',
        length_cm: '178',
      });
    });

    it('should return empty array for CSV with only headers', () => {
      const csvContent = readFixture('empty-with-headers.csv');
      const effect = parseCsvContent(csvContent);
      const result = Effect.runSync(effect);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for completely empty CSV', () => {
      const csvContent = readFixture('completely-empty.csv');
      const effect = parseCsvContent(csvContent);
      const result = Effect.runSync(effect);

      expect(result).toHaveLength(0);
    });

    it('should parse CSV and trim whitespace from values', () => {
      const csvContent = 'name,length_cm\n  Atomic Backland  ,  178  ';
      const effect = parseCsvContent(csvContent);
      const result = Effect.runSync(effect);

      expect(result[0].name).toBe('Atomic Backland');
      expect(result[0].length_cm).toBe('178');
    });

    it('should fail with ValidationError for malformed CSV', () => {
      const csvContent = 'name,length\n"unclosed quote,123';
      const effect = parseCsvContent(csvContent);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Failed to parse CSV file');
      }
    });
  });

  describe('generateCsvContent', () => {
    it('should generate CSV content with headers', () => {
      const data = [
        { name: 'Atomic Backland 100', length_cm: 178, tip_mm: 134 },
        { name: 'Dynafit Beast 108', length_cm: 184, tip_mm: 138 },
      ];
      const columns = ['name', 'length_cm', 'tip_mm'];
      const effect = generateCsvContent(data, columns);
      const result = Effect.runSync(effect);

      // Should include UTF-8 BOM
      expect(result.charCodeAt(0)).toBe(0xfeff);

      // Should contain headers
      expect(result).toContain('name');
      expect(result).toContain('length_cm');
      expect(result).toContain('tip_mm');

      // Should contain data
      expect(result).toContain('Atomic Backland 100');
      expect(result).toContain('178');
      expect(result).toContain('Dynafit Beast 108');
      expect(result).toContain('184');
    });

    it('should use comma as delimiter', () => {
      const data = [{ name: 'Test', value: 123 }];
      const columns = ['name', 'value'];
      const effect = generateCsvContent(data, columns);
      const result = Effect.runSync(effect);

      // Remove BOM and split into lines
      const lines = result.substring(1).split('\n');
      expect(lines[0]).toContain(',');
    });

    it('should properly quote fields containing special characters', () => {
      const data = [{ name: 'Test, with comma', description: 'Line 1\nLine 2' }];
      const columns = ['name', 'description'];
      const effect = generateCsvContent(data, columns);
      const result = Effect.runSync(effect);

      // Fields with commas and newlines should be quoted
      expect(result).toContain('"');
    });

    it('should handle empty array', () => {
      const data: Record<string, unknown>[] = [];
      const columns = ['name', 'value'];
      const effect = generateCsvContent(data, columns);
      const result = Effect.runSync(effect);

      // Should still have BOM and header
      expect(result.charCodeAt(0)).toBe(0xfeff);
      expect(result).toContain('name');
      expect(result).toContain('value');
    });

    it('should respect column order', () => {
      const data = [{ z: 'last', a: 'first', m: 'middle' }];
      const columns = ['a', 'm', 'z'];
      const effect = generateCsvContent(data, columns);
      const result = Effect.runSync(effect);

      // Remove BOM, split into lines, get header
      const lines = result.substring(1).split('\n');
      const headers = lines[0].split(',');

      // Headers should be in specified order (with quotes)
      expect(headers[0]).toContain('a');
      expect(headers[1]).toContain('m');
      expect(headers[2]).toContain('z');
    });
  });

  describe('validateCsvHeaders', () => {
    it('should succeed when all required headers are present', () => {
      const headers = ['name', 'length_cm', 'tip_mm', 'waist_mm', 'tail_mm', 'radius_m', 'weight_g'];
      const requiredHeaders = ['name', 'length_cm', 'tip_mm', 'waist_mm', 'tail_mm', 'radius_m', 'weight_g'];
      const effect = validateCsvHeaders(headers, requiredHeaders);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
    });

    it('should succeed when extra non-required headers are present', () => {
      const headers = [
        'name',
        'description',
        'length_cm',
        'tip_mm',
        'waist_mm',
        'tail_mm',
        'radius_m',
        'weight_g',
        'extra_field',
      ];
      const requiredHeaders = ['name', 'length_cm', 'tip_mm', 'waist_mm', 'tail_mm', 'radius_m', 'weight_g'];
      const effect = validateCsvHeaders(headers, requiredHeaders);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
    });

    it('should fail when required headers are missing', () => {
      const headers = ['name', 'length_cm', 'tip_mm'];
      const requiredHeaders = ['name', 'length_cm', 'tip_mm', 'waist_mm', 'tail_mm', 'radius_m', 'weight_g'];
      const effect = validateCsvHeaders(headers, requiredHeaders);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('CSV file is missing required columns');
        expect(error.details[0].message).toContain('waist_mm');
        expect(error.details[0].message).toContain('tail_mm');
        expect(error.details[0].message).toContain('radius_m');
        expect(error.details[0].message).toContain('weight_g');
      }
    });

    it('should fail when all headers are missing', () => {
      const headers: string[] = [];
      const requiredHeaders = ['name', 'length_cm'];
      const effect = validateCsvHeaders(headers, requiredHeaders);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.details[0].message).toContain('name');
        expect(error.details[0].message).toContain('length_cm');
      }
    });

    it('should be case-sensitive when checking headers', () => {
      const headers = ['NAME', 'LENGTH_CM'];
      const requiredHeaders = ['name', 'length_cm'];
      const effect = validateCsvHeaders(headers, requiredHeaders);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
    });

    it('should succeed with empty required headers array', () => {
      const headers = ['name', 'value'];
      const requiredHeaders: string[] = [];
      const effect = validateCsvHeaders(headers, requiredHeaders);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
    });
  });

  describe('Integration: Parse and Generate', () => {
    it('should be able to parse generated CSV content', () => {
      const originalData = [
        { name: 'Atomic Backland 100', length_cm: 178, radius_m: '18.5' },
        { name: 'Dynafit Beast 108', length_cm: 184, radius_m: '22.0' },
      ];
      const columns = ['name', 'length_cm', 'radius_m'];

      // Generate CSV
      const generateEffect = generateCsvContent(originalData, columns);
      const csvContent = Effect.runSync(generateEffect);

      // Parse it back
      const parseEffect = parseCsvContent(csvContent);
      const parsedData = Effect.runSync(parseEffect);

      // Should have same number of rows
      expect(parsedData).toHaveLength(originalData.length);

      // Values should match (as strings)
      expect(parsedData[0].name).toBe('Atomic Backland 100');
      expect(parsedData[0].length_cm).toBe('178');
      expect(parsedData[0].radius_m).toBe('18.5');
    });
  });
});
