import { describe, it, expect, vi, beforeAll } from 'vitest';
import { Effect, Exit } from 'effect';
import { parseMultipartFile, validateFileType, readFileContent, ALLOWED_CSV_TYPES, MAX_FILE_SIZE_MB } from './file';
import { ValidationError } from '@/types/error.types';

// Mock File.text() for jsdom environment which doesn't fully implement it
beforeAll(() => {
  if (typeof File !== 'undefined') {
    const OriginalFile = File;
    global.File = class extends OriginalFile {
      async text(): Promise<string> {
        // Read the Blob content using FileReader
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(this as unknown as Blob);
        });
      }
    } as typeof File;
  }
});

describe('File Handling Utilities', () => {
  describe('parseMultipartFile', () => {
    it('should successfully extract file from FormData', async () => {
      const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      const effect = parseMultipartFile(mockRequest, 'file');
      const result = await Effect.runPromise(effect);

      expect(result).toBe(mockFile);
      expect(mockRequest.formData).toHaveBeenCalledOnce();
    });

    it('should fail when field does not exist', async () => {
      const formData = new FormData();

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      const effect = parseMultipartFile(mockRequest, 'file');
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('File is required');
        expect(error.details[0].field).toBe('file');
        expect(error.details[0].message).toContain('No file provided');
      }
    });

    it('should fail when field contains string instead of File', async () => {
      const formData = new FormData();
      formData.append('file', 'just a string');

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      const effect = parseMultipartFile(mockRequest, 'file');
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Invalid file format');
        expect(error.details[0].message).toContain('Expected a file upload');
      }
    });

    it('should fail when formData parsing throws error', async () => {
      const mockRequest = {
        formData: vi.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as Request;

      const effect = parseMultipartFile(mockRequest, 'file');
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Failed to parse multipart form data');
      }
    });
  });

  describe('validateFileType', () => {
    it('should succeed for allowed CSV MIME types', () => {
      const allowedTypes = ['text/csv', 'application/csv'];

      const csvFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      const effect = validateFileType(csvFile, allowedTypes);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
    });

    it('should succeed for all ALLOWED_CSV_TYPES', () => {
      ALLOWED_CSV_TYPES.forEach((mimeType) => {
        const file = new File(['content'], 'test.csv', { type: mimeType });
        const effect = validateFileType(file, ALLOWED_CSV_TYPES);
        const exit = Effect.runSyncExit(effect);

        expect(Exit.isSuccess(exit)).toBe(true);
      });
    });

    it('should fail for disallowed file types', () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const effect = validateFileType(pdfFile, ALLOWED_CSV_TYPES);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Invalid file type');
        expect(error.details[0].message).toContain('application/pdf');
        expect(error.details[0].message).toContain('is not allowed');
      }
    });

    it('should fail for executable files', () => {
      const exeFile = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' });
      const effect = validateFileType(exeFile, ALLOWED_CSV_TYPES);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
    });

    it('should normalize MIME types to lowercase (per File API spec)', () => {
      // File API normalizes MIME types to lowercase
      const file = new File(['content'], 'test.csv', { type: 'TEXT/CSV' });

      // Verify that File API normalized it
      expect(file.type).toBe('text/csv');

      const effect = validateFileType(file, ['text/csv']);
      const exit = Effect.runSyncExit(effect);

      // Should succeed because File API normalized 'TEXT/CSV' to 'text/csv'
      expect(Exit.isSuccess(exit)).toBe(true);
    });
  });

  describe('readFileContent', () => {
    it('should successfully read file content', async () => {
      const content = 'name,length\nAtomic,178';
      const file = new File([content], 'test.csv', { type: 'text/csv' });

      const effect = readFileContent(file);
      const result = await Effect.runPromise(effect);

      expect(result).toBe(content);
    });

    it('should use default max size of 10MB', async () => {
      // Create a file just under 10MB
      const size = 10 * 1024 * 1024 - 1024; // 10MB - 1KB
      const content = 'x'.repeat(size);
      const file = new File([content], 'large.csv', { type: 'text/csv' });

      const effect = readFileContent(file);
      const result = await Effect.runPromise(effect);

      expect(result.length).toBe(size);
    });

    it('should fail when file exceeds default size limit', async () => {
      // Create a file just over 10MB
      const size = 10 * 1024 * 1024 + 1024; // 10MB + 1KB
      const content = 'x'.repeat(size);
      const file = new File([content], 'toolarge.csv', { type: 'text/csv' });

      const effect = readFileContent(file);
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('File size exceeds limit');
        expect(error.details[0].message).toContain('exceeds maximum allowed size');
        expect(error.details[0].message).toContain(`${MAX_FILE_SIZE_MB}MB`);
      }
    });

    it('should respect custom max size parameter', async () => {
      const size = 3 * 1024 * 1024; // 3MB
      const content = 'x'.repeat(size);
      const file = new File([content], 'medium.csv', { type: 'text/csv' });

      // Should fail with 2MB limit
      const effect1 = readFileContent(file, 2);
      const exit1 = await Effect.runPromiseExit(effect1);
      expect(Exit.isFailure(exit1)).toBe(true);

      // Should succeed with 5MB limit
      const effect2 = readFileContent(file, 5);
      const result2 = await Effect.runPromise(effect2);
      expect(result2.length).toBe(size);
    });

    it('should handle empty files', async () => {
      const file = new File([], 'empty.csv', { type: 'text/csv' });

      const effect = readFileContent(file);
      const result = await Effect.runPromise(effect);

      expect(result).toBe('');
    });

    it('should handle UTF-8 content', async () => {
      const content = 'name,description\nAtomic,Łyżwy 🎿';
      const file = new File([content], 'unicode.csv', { type: 'text/csv' });

      const effect = readFileContent(file);
      const result = await Effect.runPromise(effect);

      expect(result).toBe(content);
    });

    it('should fail when File.text() throws error', async () => {
      // Create a mock file that throws when reading
      const mockFile = {
        size: 100,
        text: vi.fn().mockRejectedValue(new Error('Read error')),
      } as unknown as File;

      const effect = readFileContent(mockFile);
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Failed to read file content');
        expect(error.details[0].message).toBe('Read error');
      }
    });
  });

  describe('Integration: File Parsing Pipeline', () => {
    it('should successfully parse, validate, and read a CSV file', async () => {
      const content = 'name,length\nAtomic,178';
      const mockFile = new File([content], 'test.csv', { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      // Step 1: Parse multipart
      const parseEffect = parseMultipartFile(mockRequest, 'file');
      const file = await Effect.runPromise(parseEffect);

      // Step 2: Validate type
      const validateEffect = validateFileType(file, ALLOWED_CSV_TYPES);
      await Effect.runPromise(validateEffect);

      // Step 3: Read content
      const readEffect = readFileContent(file);
      const result = await Effect.runPromise(readEffect);

      expect(result).toBe(content);
    });

    it('should fail at validation step for wrong file type', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      const parseEffect = parseMultipartFile(mockRequest, 'file');
      const file = await Effect.runPromise(parseEffect);

      const validateEffect = validateFileType(file, ALLOWED_CSV_TYPES);
      const exit = await Effect.runPromiseExit(validateEffect);

      expect(Exit.isFailure(exit)).toBe(true);
    });

    it('should fail at read step for oversized file', async () => {
      const size = 15 * 1024 * 1024; // 15MB
      const content = 'x'.repeat(size);
      const mockFile = new File([content], 'huge.csv', { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      const parseEffect = parseMultipartFile(mockRequest, 'file');
      const file = await Effect.runPromise(parseEffect);

      const validateEffect = validateFileType(file, ALLOWED_CSV_TYPES);
      await Effect.runPromise(validateEffect);

      const readEffect = readFileContent(file, 10);
      const exit = await Effect.runPromiseExit(readEffect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
        const error = exit.cause.error;
        expect(error.message).toBe('File size exceeds limit');
      }
    });
  });
});
