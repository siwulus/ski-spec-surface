import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Effect } from 'effect';
import { SkiSpecService } from '../SkiSpecService';
import { SkiSurfaceEquationSimple } from '../SkiSurfaceEquationSimple';
import { NotFoundError, DatabaseError } from '@/types/error.types';
import type { SupabaseClient } from '@/db/supabase.client';
import { TEST_USER_ID, TEST_SPEC_ID, createSkiSpecEntity, createNotFoundError, createTimeoutError } from './test-utils';

/**
 * Unit Tests for SkiSpecService.getSkiSpec()
 *
 * Tests retrieving a ski specification including:
 * - Successful retrieval with notes count
 * - Not found scenarios (spec doesn't exist or user doesn't own it)
 * - Database error handling
 * - Security: IDOR prevention (same error for not found vs unauthorized)
 */

describe('SkiSpecService - getSkiSpec', () => {
  let service: SkiSpecService;
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const equation = new SkiSurfaceEquationSimple();
    service = new SkiSpecService(mockSupabase, equation);
  });

  it('should retrieve a ski specification successfully', async () => {
    const mockEntity = createSkiSpecEntity();

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNotesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: 3,
        error: null,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ select: mockNotesSelect });

    const result = await Effect.runPromise(service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID));

    expect(result).toEqual({
      ...mockEntity,
      notes_count: 3,
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('ski_specs');
    expect(mockSupabase.from).toHaveBeenCalledWith('ski_spec_notes');
  });

  it('should include notes count of 0 when no notes exist', async () => {
    const mockEntity = createSkiSpecEntity();

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNotesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: 0,
        error: null,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ select: mockNotesSelect });

    const result = await Effect.runPromise(service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID));

    expect(result.notes_count).toBe(0);
  });

  it('should include notes count with large number of notes', async () => {
    const mockEntity = createSkiSpecEntity();

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNotesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: 42,
        error: null,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ select: mockNotesSelect });

    const result = await Effect.runPromise(service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID));

    expect(result.notes_count).toBe(42);
  });

  it('should query with correct user_id and spec_id filters', async () => {
    const mockEntity = createSkiSpecEntity();
    const eqSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: eqSpy,
    });

    const mockNotesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: 0,
        error: null,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ select: mockNotesSelect });

    await Effect.runPromise(service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID));

    // Verify filters were applied
    expect(eqSpy).toHaveBeenCalledWith('id', TEST_SPEC_ID);
    const nestedEq = eqSpy.mock.results[0].value.eq;
    expect(nestedEq).toHaveBeenCalledWith('user_id', TEST_USER_ID);
  });

  it('should fail with NotFoundError when spec does not exist (PGRST116)', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: createNotFoundError(),
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const effect = service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
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
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: createNotFoundError(),
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const effect = service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    // IDOR prevention: returns same NotFoundError as when spec doesn't exist
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(NotFoundError);
      expect(result.left.message).not.toContain('unauthorized');
      expect(result.left.message).not.toContain('permission');
    }
  });

  it('should fail with DatabaseError on database connection errors', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: createTimeoutError(),
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const effect = service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });

  it('should fail when getNotesCount encounters database error', async () => {
    const mockEntity = createSkiSpecEntity();

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNotesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: null,
        error: { message: 'Failed to count notes' },
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ select: mockNotesSelect });

    const effect = service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });

  it('should handle null count gracefully', async () => {
    const mockEntity = createSkiSpecEntity();

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNotesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: null,
        error: null,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ select: mockNotesSelect });

    const result = await Effect.runPromise(service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID));

    // null count should be treated as 0
    expect(result.notes_count).toBe(0);
  });

  it('should fail when query throws exception', async () => {
    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      }),
    });

    const effect = service.getSkiSpec(TEST_USER_ID, TEST_SPEC_ID);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });
});
