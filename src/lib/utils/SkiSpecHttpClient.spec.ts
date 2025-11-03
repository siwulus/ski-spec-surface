import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NetworkError,
  NotFoundError,
  UnexpectedError,
  ValidationError,
} from '@/types/error.types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Effect } from 'effect';

const TestSuccessSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type TestSuccess = z.infer<typeof TestSuccessSchema>;

const mockFetch = (status: number, body: unknown) => {
  return vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
};

describe('SkiSpecHttpClient Unit Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get()', () => {
    it('should return validated data on successful GET request', async () => {
      const mockData: TestSuccess = { id: '1', name: 'Test' };
      mockFetch(200, mockData);

      const effect = skiSpecHttpClient.get('/api/test', TestSuccessSchema);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toEqual(mockData);
      }
      expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({ method: 'GET' }));
    });

    it('should return ValidationError when response data is invalid', async () => {
      const invalidData = { id: 123, name: 'Invalid' }; // id should be string
      mockFetch(200, invalidData);

      const effect = skiSpecHttpClient.get('/api/test', TestSuccessSchema);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(ValidationError);
        expect(result.left.message).toContain('Invalid input');
      }
    });

    it('should return NetworkError when fetch fails', async () => {
      const fetchError = new Error('Failed to fetch');
      vi.spyOn(global, 'fetch').mockRejectedValue(fetchError);

      const effect = skiSpecHttpClient.get('/api/test', TestSuccessSchema);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NetworkError);
        expect(result.left.message).toBe('Network request failed');
        expect(result.left.cause).toBe(fetchError);
      }
    });

    it.each([
      [400, 'Bad Request', ValidationError],
      [422, 'Unprocessable Entity', ValidationError],
      [401, 'Unauthorized', AuthenticationError],
      [403, 'Forbidden', AuthorizationError],
      [404, 'Not Found', NotFoundError],
      [409, 'Conflict', ConflictError],
      [500, 'Internal Server Error', UnexpectedError],
    ])('should return %s error for status %i', async (status, message, ErrorClass) => {
      const errorResponse = { error: message };
      mockFetch(status, errorResponse);

      const effect = skiSpecHttpClient.get('/api/test', TestSuccessSchema);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(ErrorClass);
        expect(result.left.message).toBe(message);
      }
    });
  });

  describe('post()', () => {
    const requestBody = { data: 'new-item' };

    it('should return validated data on successful POST request', async () => {
      const responseData: TestSuccess = { id: '2', name: 'Created' };
      mockFetch(201, responseData);

      const effect = skiSpecHttpClient.post('/api/test', TestSuccessSchema, requestBody);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toEqual(responseData);
      }
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should return UnexpectedError on failed POST request', async () => {
      const errorResponse = { error: 'Server Error' };
      mockFetch(500, errorResponse);

      const effect = skiSpecHttpClient.post('/api/test', TestSuccessSchema, requestBody);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(UnexpectedError);
      }
    });
  });

  describe('put()', () => {
    const requestBody = { data: 'updated-item' };

    it('should return validated data on successful PUT request', async () => {
      const responseData: TestSuccess = { id: '1', name: 'Updated' };
      mockFetch(200, responseData);

      const effect = skiSpecHttpClient.put('/api/test/1', TestSuccessSchema, requestBody);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toEqual(responseData);
      }
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should return NotFoundError on failed PUT request', async () => {
      const errorResponse = { error: 'Not Found' };
      mockFetch(404, errorResponse);

      const effect = skiSpecHttpClient.put('/api/test/1', TestSuccessSchema, requestBody);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NotFoundError);
      }
    });
  });

  describe('delete()', () => {
    it('should return validated data on successful DELETE request', async () => {
      const responseData: TestSuccess = { id: '1', name: 'Deleted Item' };
      mockFetch(200, responseData);

      const effect = skiSpecHttpClient.delete('/api/test/1', TestSuccessSchema);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toEqual(responseData);
      }
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should return NotFoundError on failed DELETE request', async () => {
      const errorResponse = { error: 'Not Found' };
      mockFetch(404, errorResponse);

      const effect = skiSpecHttpClient.delete('/api/test/1', TestSuccessSchema);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NotFoundError);
      }
    });
  });

  describe('deleteNoContent()', () => {
    it('should return void on successful 204 DELETE request', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(null, {
          status: 204,
        })
      );

      const effect = skiSpecHttpClient.deleteNoContent('/api/test/1');
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toBeUndefined();
      }
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should return AuthorizationError on failed DELETE request', async () => {
      const errorResponse = { error: 'Forbidden' };
      mockFetch(403, errorResponse);

      const effect = skiSpecHttpClient.deleteNoContent('/api/test/1');
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(AuthorizationError);
      }
    });
  });

  describe('postMultipart()', () => {
    it('should return validated data on successful multipart POST request', async () => {
      const mockData: TestSuccess = { id: '1', name: 'Test' };
      mockFetch(200, mockData);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.csv'));

      const effect = skiSpecHttpClient.postMultipart('/api/upload', TestSuccessSchema, formData);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Right');
      if (result._tag === 'Right') {
        expect(result.right).toEqual(mockData);
      }

      // Verify fetch was called with correct config
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: expect.any(FormData),
        })
      );

      // Verify Content-Type header was NOT set (browser sets it)
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = (fetchCall[1] as RequestInit)?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('should return ValidationError on 400 Bad Request', async () => {
      const errorResponse = {
        error: 'Validation failed',
        details: [{ field: 'file', message: 'File is required' }],
      };
      mockFetch(400, errorResponse);

      const formData = new FormData();
      const effect = skiSpecHttpClient.postMultipart('/api/upload', TestSuccessSchema, formData);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(ValidationError);
        if (result.left instanceof ValidationError) {
          expect(result.left.details).toHaveLength(1);
          expect(result.left.details[0].field).toBe('file');
        }
      }
    });

    it('should return AuthenticationError on 401 Unauthorized', async () => {
      const errorResponse = { error: 'Unauthorized' };
      mockFetch(401, errorResponse);

      const formData = new FormData();
      const effect = skiSpecHttpClient.postMultipart('/api/upload', TestSuccessSchema, formData);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(AuthenticationError);
      }
    });

    it('should return UnexpectedError on 413 Payload Too Large', async () => {
      const errorResponse = { error: 'File too large' };
      mockFetch(413, errorResponse);

      const formData = new FormData();
      formData.append('file', new File(['x'.repeat(1000000)], 'large.csv'));

      const effect = skiSpecHttpClient.postMultipart('/api/upload', TestSuccessSchema, formData);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(UnexpectedError);
        // context.status may vary by mapping; class statusCode remains 500 for UnexpectedError
      }
    });

    it('should return UnexpectedError on 415 Unsupported Media Type', async () => {
      const errorResponse = { error: 'Invalid file type' };
      mockFetch(415, errorResponse);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.txt'));

      const effect = skiSpecHttpClient.postMultipart('/api/upload', TestSuccessSchema, formData);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(UnexpectedError);
        // context.status may vary by mapping; class statusCode remains 500 for UnexpectedError
      }
    });

    it('should return NetworkError on network failure', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));

      const formData = new FormData();
      const effect = skiSpecHttpClient.postMultipart('/api/upload', TestSuccessSchema, formData);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NetworkError);
      }
    });

    it('should allow custom headers while not setting Content-Type', async () => {
      const mockData: TestSuccess = { id: '1', name: 'Test' };
      mockFetch(200, mockData);

      const formData = new FormData();
      const customHeaders = { 'X-Custom-Header': 'value' };

      const effect = skiSpecHttpClient.postMultipart('/api/upload', TestSuccessSchema, formData, customHeaders);
      await Effect.runPromise(Effect.either(effect));

      // Verify custom headers were included but Content-Type was not
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = (fetchCall[1] as RequestInit)?.headers as Record<string, string>;
      expect(headers['X-Custom-Header']).toBe('value');
      expect(headers['Content-Type']).toBeUndefined();
    });
  });
});
