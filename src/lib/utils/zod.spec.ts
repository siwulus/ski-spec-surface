import { describe, it, expect } from 'vitest';
import { Effect, Exit, Cause } from 'effect';
import { z } from 'zod';
import { parseWithSchema, parseJsonBody, parseJsonResponse, parseJsonPromise, parseQueryParams } from './zod';
import { InvalidJsonError, ValidationError } from '@/types/error.types';

describe('parseWithSchema', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    address: z.object({
      street: z.string(),
    }),
  });

  it('should succeed with valid data', async () => {
    const data = { name: 'John', age: 30, address: { street: 'Main St' } };
    const effect = parseWithSchema(schema, data);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toEqual(data);
    }
  });

  it('should fail with a single validation error', async () => {
    const data = { name: 'John', age: '30', address: { street: 'Main St' } };
    const effect = parseWithSchema(schema, data);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.squash(exit.cause) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input: expected number, received string');
      expect(error.details).toEqual([{ field: 'age', message: 'Invalid input: expected number, received string' }]);
    }
  });

  it('should fail with multiple validation errors', async () => {
    const data = { name: 123, age: '30' };
    const effect = parseWithSchema(schema, data);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.squash(exit.cause) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toHaveLength(3);
      expect(error.details).toContainEqual({
        field: 'name',
        message: 'Invalid input: expected string, received number',
      });
      expect(error.details).toContainEqual({
        field: 'age',
        message: 'Invalid input: expected number, received string',
      });
      expect(error.details).toContainEqual({
        field: 'address',
        message: 'Invalid input: expected object, received undefined',
      });
    }
  });

  it('should handle nested field errors with dot notation', async () => {
    const data = { name: 'John', age: 30, address: { street: 123 } };
    const effect = parseWithSchema(schema, data);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.squash(exit.cause) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input: expected string, received number');
      expect(error.details).toEqual([
        { field: 'address.street', message: 'Invalid input: expected string, received number' },
      ]);
    }
  });

  it('should handle root-level errors', async () => {
    const schemaWithRefine = z.object({}).refine(() => false, { message: 'Root level error' });
    const data = {};
    const effect = parseWithSchema(schemaWithRefine, data);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.squash(exit.cause) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Root level error');
      expect(error.details).toEqual([{ field: 'root', message: 'Root level error' }]);
    }
  });
});

describe('parseJsonPromise', () => {
  it('should succeed with a promise that resolves to valid JSON', async () => {
    const data = { a: 1 };
    const promise = () => Promise.resolve(data);
    const effect = parseJsonPromise(promise);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toEqual(data);
    }
  });

  it('should fail with InvalidJsonError for a promise that rejects', async () => {
    const promise = () => Promise.reject(new Error('Malformed JSON'));
    const effect = parseJsonPromise(promise);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.squash(exit.cause) as InvalidJsonError;
      expect(error).toBeInstanceOf(InvalidJsonError);
      expect(error.message).toBe('Invalid request body');
      expect(error.cause).toBeInstanceOf(Error);
      expect((error.cause as Error).message).toBe('Malformed JSON');
    }
  });
});

describe('parseJsonBody', () => {
  const schema = z.object({ name: z.string() });

  it('should succeed with a valid request body', async () => {
    const body = { name: 'test' };
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const effect = parseJsonBody(request, schema);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toEqual(body);
    }
  });

  it('should fail with InvalidJsonError for malformed JSON', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: '{ "name": "test" ', // malformed
    });

    const effect = parseJsonBody(request, schema);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.squash(exit.cause)).toBeInstanceOf(InvalidJsonError);
    }
  });

  it('should fail with ValidationError for invalid data', async () => {
    const body = { name: 123 }; // invalid data type
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const effect = parseJsonBody(request, schema);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.squash(exit.cause)).toBeInstanceOf(ValidationError);
    }
  });
});

describe('parseJsonResponse', () => {
  const schema = z.object({ name: z.string() });

  it('should succeed with a valid response body', async () => {
    const body = { name: 'test' };
    const response = new Response(JSON.stringify(body));
    const effect = parseJsonResponse(response, schema);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toEqual(body);
    }
  });

  it('should fail with InvalidJsonError for malformed JSON', async () => {
    const response = new Response('{ "name": "test" '); // malformed
    const effect = parseJsonResponse(response, schema);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.squash(exit.cause)).toBeInstanceOf(InvalidJsonError);
    }
  });

  it('should fail with ValidationError for invalid data', async () => {
    const body = { name: 123 }; // invalid data type
    const response = new Response(JSON.stringify(body));

    const effect = parseJsonResponse(response, schema);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.squash(exit.cause)).toBeInstanceOf(ValidationError);
    }
  });
});

describe('parseQueryParams', () => {
  const schema = z.object({
    search: z.string().optional(),
    page: z.number().optional(),
  });

  it('should succeed with valid query params without coercion', async () => {
    const params = new URLSearchParams({ search: 'skis' });
    const effect = parseQueryParams(params, schema);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toEqual({ search: 'skis' });
    }
  });

  it('should succeed with valid query params with coercion', async () => {
    const params = new URLSearchParams({ page: '2' });
    const coerce = (p: URLSearchParams) => {
      const page = p.get('page');
      return {
        page: page ? parseInt(page, 10) : undefined,
      };
    };

    const effect = parseQueryParams(params, schema, coerce);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toEqual({ page: 2 });
    }
  });

  it('should fail with ValidationError for invalid query params', async () => {
    const schemaWithRequired = z.object({ page: z.number() });
    const params = new URLSearchParams(); // page is missing
    const coerce = (p: URLSearchParams) => {
      const page = p.get('page');
      return {
        page: page ? parseInt(page, 10) : undefined,
      };
    };
    const effect = parseQueryParams(params, schemaWithRequired, coerce);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.squash(exit.cause) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details).toEqual([{ field: 'page', message: 'Invalid input: expected number, received undefined' }]);
    }
  });

  it('should fail with ValidationError if coercion results in invalid type', async () => {
    const params = new URLSearchParams({ page: 'abc' });
    const coerce = (p: URLSearchParams) => {
      const page = p.get('page');
      return {
        page: page ? parseInt(page, 10) : undefined, // parseInt('abc') -> NaN
      };
    };

    const effect = parseQueryParams(params, schema, coerce);
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.squash(exit.cause) as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details).toEqual([{ field: 'page', message: 'Invalid input: expected number, received NaN' }]);
    }
  });
});
