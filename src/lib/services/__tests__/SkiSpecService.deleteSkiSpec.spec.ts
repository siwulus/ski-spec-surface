import type { SupabaseClient } from '@/db/supabase.client';
import { DatabaseError, NotFoundError } from '@/types/error.types';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkiSpecService } from '../SkiSpecService';
import { SkiSurfaceEquationSimple } from '../SkiSurfaceEquationSimple';
import { TEST_SPEC_ID, TEST_USER_ID } from './test-utils';

/**
 * Unit Tests for SkiSpecService.deleteSkiSpec()
 *
 * Tests deletion of ski specifications including:
 * - Successful deletion
 * - Cascade deletion of associated notes
 * - Ownership verification (IDOR prevention)
 * - Not found scenarios
 * - Database error handling
 */

describe('SkiSpecService - deleteSkiSpec', () => {
  let service: SkiSpecService;
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const equation = new SkiSurfaceEquationSimple();
    service = new SkiSpecService(mockSupabase, equation);
  });

  it('should delete a ski specification successfully', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      error: null,
      count: 1,
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      }),
    });

    const result = await Effect.runPromise(service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID));

    expect(result).toBeUndefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('ski_specs');
  });

  it('should request exact count when deleting', async () => {
    const mockDeleteCount = vi.fn().mockResolvedValue({
      error: null,
      count: 1,
    });

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: mockDeleteCount,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: mockDelete,
    });

    await Effect.runPromise(service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID));

    // Verify delete was called with { count: 'exact' }
    expect(mockDelete).toHaveBeenCalledWith({ count: 'exact' });
  });

  it('should apply user_id and spec_id filters when deleting', async () => {
    const eqSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
        count: 1,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: eqSpy,
      }),
    });

    await Effect.runPromise(service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID));

    // Verify filters were applied
    expect(eqSpy).toHaveBeenCalledWith('id', TEST_SPEC_ID);
    const nestedEq = eqSpy.mock.results[0].value.eq;
    expect(nestedEq).toHaveBeenCalledWith('user_id', TEST_USER_ID);
  });

  it('should cascade delete associated notes automatically', async () => {
    // This test documents that notes are deleted via database cascade constraint
    // The service doesn't explicitly delete notes - it's handled by the database

    const mockDelete = vi.fn().mockResolvedValue({
      error: null,
      count: 1,
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      }),
    });

    await Effect.runPromise(service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID));

    // Service only deletes from ski_specs table
    expect(mockSupabase.from).toHaveBeenCalledWith('ski_specs');
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    // Notes are deleted via database CASCADE constraint
  });

  it('should fail with NotFoundError when spec does not exist', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      error: null,
      count: 0,
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      }),
    });

    const effect = service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(NotFoundError);
      const error = result.left as NotFoundError;
      expect(error.message).toContain('Ski specification not found');
      expect(error.resourceType).toBe('ski_spec');
      expect(error.resourceId).toBe(TEST_SPEC_ID);
    }
  });

  it('should fail with NotFoundError when user does not own the spec', async () => {
    // When user doesn't own the spec, the delete count will be 0
    const mockDelete = vi.fn().mockResolvedValue({
      error: null,
      count: 0,
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      }),
    });

    const effect = service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    // IDOR prevention: same error as when spec doesn't exist
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(NotFoundError);
      expect(result.left.message).not.toContain('unauthorized');
      expect(result.left.message).not.toContain('permission');
    }
  });

  it('should fail with DatabaseError when delete operation fails', async () => {
    const dbError = { message: 'Foreign key constraint', code: '23503' };

    const mockDelete = vi.fn().mockResolvedValue({
      error: dbError,
      count: 0,
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      }),
    });

    const effect = service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });

  it('should fail with DatabaseError when delete throws exception', async () => {
    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        }),
      }),
    });

    const effect = service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });

  it('should treat null count as not found', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      error: null,
      count: null,
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      }),
    });

    const effect = service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(NotFoundError);
    }
  });

  it('should prioritize database error over count check', async () => {
    // When both error and count=0, error should be returned
    const dbError = { message: 'Database error', code: 'DB_ERROR' };

    const mockDelete = vi.fn().mockResolvedValue({
      error: dbError,
      count: 0,
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      }),
    });

    const effect = service.deleteSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      // Should return DatabaseError, not NotFoundError
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });
});
