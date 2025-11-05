import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Effect } from 'effect';
import { SkiSpecService } from '../SkiSpecService';
import { SkiSurfaceEquationSimple } from '../SkiSurfaceEquationSimple';
import { NotFoundError, ConflictError, DatabaseError } from '@/types/error.types';
import type { SupabaseClient } from '@/db/supabase.client';
import {
  TEST_USER_ID,
  TEST_SPEC_ID,
  createSkiSpecEntity,
  createUpdateSkiSpecCommand,
  createNotFoundError,
} from './test-utils';

/**
 * Unit Tests for SkiSpecService.updateSkiSpec()
 *
 * Tests updating ski specifications including:
 * - Successful update with recalculated fields
 * - Ownership verification (IDOR prevention)
 * - Name uniqueness validation
 * - Skipping name check when name unchanged
 * - Database error handling
 */

describe('SkiSpecService - updateSkiSpec', () => {
  let service: SkiSpecService;
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const equation = new SkiSurfaceEquationSimple();
    service = new SkiSpecService(mockSupabase, equation);
  });

  it('should update a ski specification successfully', async () => {
    const command = createUpdateSkiSpecCommand();
    const existingEntity = createSkiSpecEntity();
    const updatedEntity = {
      ...existingEntity,
      name: 'Updated Ski Model',
      description: 'Updated description',
      length: 185,
    };

    // Mock verifySpecOwnership
    const mockVerifySelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingEntity,
            error: null,
          }),
        }),
      }),
    });

    // Mock checkNameUniqueness (no duplicate found)
    const mockNameCheckSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock update
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedEntity,
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock getNotesCount
    const mockNotesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        count: 2,
        error: null,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockVerifySelect })
      .mockReturnValueOnce({ select: mockNameCheckSelect })
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ select: mockNotesSelect });

    const result = await Effect.runPromise(service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command));

    expect(result.name).toBe('Updated Ski Model');
    expect(result.notes_count).toBe(2);
  });

  it('should recalculate surface area when dimensions change', async () => {
    const command = createUpdateSkiSpecCommand();
    const existingEntity = createSkiSpecEntity();

    const mockVerifySelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNameCheckSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: existingEntity,
              error: null,
            }),
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
      .mockReturnValueOnce({ select: mockVerifySelect })
      .mockReturnValueOnce({ select: mockNameCheckSelect })
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ select: mockNotesSelect });

    await Effect.runPromise(service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command));

    // Verify surface area was recalculated for new dimensions
    // (185 * ((135 + 105 + 125) / 3)) / 10 = 2250.83 (rounded to 2 decimals)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        surface_area: 2250.83,
      })
    );
  });

  it('should recalculate relative weight when weight or dimensions change', async () => {
    const command = createUpdateSkiSpecCommand();
    const existingEntity = createSkiSpecEntity();

    const mockVerifySelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNameCheckSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: existingEntity,
              error: null,
            }),
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
      .mockReturnValueOnce({ select: mockVerifySelect })
      .mockReturnValueOnce({ select: mockNameCheckSelect })
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ select: mockNotesSelect });

    await Effect.runPromise(service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command));

    // Verify relative weight was recalculated: 1600 / 2252.5 = 0.71
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        relative_weight: 0.71,
      })
    );
  });

  it('should update algorithm version to current version', async () => {
    const command = createUpdateSkiSpecCommand();
    const existingEntity = createSkiSpecEntity();

    const mockVerifySelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNameCheckSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: existingEntity,
              error: null,
            }),
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
      .mockReturnValueOnce({ select: mockVerifySelect })
      .mockReturnValueOnce({ select: mockNameCheckSelect })
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ select: mockNotesSelect });

    await Effect.runPromise(service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        algorithm_version: '1.0.0',
      })
    );
  });

  it('should fail with NotFoundError when spec does not exist', async () => {
    const command = createUpdateSkiSpecCommand();

    const mockVerifySelect = vi.fn().mockReturnValue({
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
      select: mockVerifySelect,
    });

    const effect = service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(NotFoundError);
      expect(result.left.message).toContain('Ski specification not found');
    }
  });

  it('should fail with NotFoundError when user does not own the spec', async () => {
    const command = createUpdateSkiSpecCommand();

    const mockVerifySelect = vi.fn().mockReturnValue({
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
      select: mockVerifySelect,
    });

    const effect = service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command);
    const result = await Effect.runPromise(Effect.either(effect));

    // IDOR prevention: same error as when spec doesn't exist
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(NotFoundError);
    }
  });

  it('should fail with ConflictError when name already exists for user', async () => {
    const command = createUpdateSkiSpecCommand();
    const existingEntity = createSkiSpecEntity();

    const mockVerifySelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingEntity,
            error: null,
          }),
        }),
      }),
    });

    // Mock checkNameUniqueness - returns existing spec with same name
    const mockNameCheckSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'other-spec-id' },
              error: null,
            }),
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockVerifySelect })
      .mockReturnValueOnce({ select: mockNameCheckSelect });

    const effect = service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(ConflictError);
      const error = result.left as ConflictError;
      expect(error.code).toBe('DUPLICATE_NAME');
      expect(error.conflictingField).toBe('name');
      expect(error.message).toContain('already exists');
    }
  });

  it('should skip name uniqueness check when name unchanged', async () => {
    const existingEntity = createSkiSpecEntity();
    const command = {
      ...createUpdateSkiSpecCommand(),
      name: existingEntity.name, // Same name as existing
    };

    const mockVerifySelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: existingEntity,
              error: null,
            }),
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
      .mockReturnValueOnce({ select: mockVerifySelect })
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ select: mockNotesSelect });

    const result = await Effect.runPromise(service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command));

    expect(result).toBeDefined();
    // Should have called from 3 times: verify (1), update (1), notes (1)
    // NOT 4 times (would include name check)
    expect(mockSupabase.from).toHaveBeenCalledTimes(3);
  });

  it('should trim name and description when updating', async () => {
    const command = {
      ...createUpdateSkiSpecCommand(),
      name: '  Whitespace Name  ',
      description: '  Whitespace Description  ',
    };
    const existingEntity = createSkiSpecEntity();

    const mockVerifySelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNameCheckSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: existingEntity,
              error: null,
            }),
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
      .mockReturnValueOnce({ select: mockVerifySelect })
      .mockReturnValueOnce({ select: mockNameCheckSelect })
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ select: mockNotesSelect });

    await Effect.runPromise(service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Whitespace Name',
        description: 'Whitespace Description',
      })
    );
  });

  it('should fail with DatabaseError when update fails', async () => {
    const command = createUpdateSkiSpecCommand();
    const existingEntity = createSkiSpecEntity();

    const mockVerifySelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: existingEntity,
            error: null,
          }),
        }),
      }),
    });

    const mockNameCheckSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Update failed', code: 'UPDATE_ERROR' },
            }),
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockVerifySelect })
      .mockReturnValueOnce({ select: mockNameCheckSelect })
      .mockReturnValueOnce({ update: mockUpdate });

    const effect = service.updateSkiSpec(TEST_USER_ID, TEST_SPEC_ID, command);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });
});
