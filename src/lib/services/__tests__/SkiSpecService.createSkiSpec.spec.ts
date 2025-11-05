import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Effect } from 'effect';
import { SkiSpecService } from '../SkiSpecService';
import { SkiSurfaceEquationSimple } from '../SkiSurfaceEquationSimple';
import { DatabaseError } from '@/types/error.types';
import type { SupabaseClient } from '@/db/supabase.client';
import { TEST_USER_ID, createValidSkiSpecCommand, createSkiSpecEntity } from './test-utils';

/**
 * Unit Tests for SkiSpecService.createSkiSpec()
 *
 * Tests the creation of new ski specifications including:
 * - Successful creation with valid data
 * - Calculation of derived fields (surface_area, relative_weight)
 * - Handling of whitespace in inputs
 * - Handling of null description
 * - Database error scenarios
 */

describe('SkiSpecService - createSkiSpec', () => {
  let service: SkiSpecService;
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const equation = new SkiSurfaceEquationSimple();
    service = new SkiSpecService(mockSupabase, equation);
  });

  it('should create a ski specification successfully', async () => {
    const command = createValidSkiSpecCommand();
    const mockEntity = createSkiSpecEntity();

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    const result = await Effect.runPromise(service.createSkiSpec(TEST_USER_ID, command));

    expect(result).toEqual({
      ...mockEntity,
      notes_count: 0,
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('ski_specs');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: TEST_USER_ID,
        name: 'Test Ski Model',
        description: 'A test ski specification',
        length: 180,
        tip: 130,
        waist: 100,
        tail: 120,
        radius: 18.5,
        weight: 1500,
        surface_area: 2100,
        relative_weight: 0.71,
        algorithm_version: '1.0.0',
      })
    );
  });

  it('should calculate surface area correctly', async () => {
    const command = createValidSkiSpecCommand();
    const mockEntity = createSkiSpecEntity();

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    await Effect.runPromise(service.createSkiSpec(TEST_USER_ID, command));

    // Verify surface area was calculated: (180 * ((130 + 100 + 120) / 3)) / 10 = 2100
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        surface_area: 2100,
      })
    );
  });

  it('should calculate relative weight correctly', async () => {
    const command = createValidSkiSpecCommand();
    const mockEntity = createSkiSpecEntity();

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    await Effect.runPromise(service.createSkiSpec(TEST_USER_ID, command));

    // Verify relative weight was calculated: 1500 / 2100 = 0.71
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        relative_weight: 0.71,
      })
    );
  });

  it('should trim name and description when creating', async () => {
    const command = {
      ...createValidSkiSpecCommand(),
      name: '  Whitespace Name  ',
      description: '  Whitespace Description  ',
    };
    const mockEntity = createSkiSpecEntity();

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    await Effect.runPromise(service.createSkiSpec(TEST_USER_ID, command));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Whitespace Name',
        description: 'Whitespace Description',
      })
    );
  });

  it('should handle null description', async () => {
    const command = {
      ...createValidSkiSpecCommand(),
      description: null,
    };
    const mockEntity = { ...createSkiSpecEntity(), description: null };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    const result = await Effect.runPromise(service.createSkiSpec(TEST_USER_ID, command));

    expect(result.description).toBeNull();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
      })
    );
  });

  it('should handle empty string description as null', async () => {
    const command = {
      ...createValidSkiSpecCommand(),
      description: '',
    };
    const mockEntity = { ...createSkiSpecEntity(), description: null };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    await Effect.runPromise(service.createSkiSpec(TEST_USER_ID, command));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
      })
    );
  });

  it('should set current algorithm version', async () => {
    const command = createValidSkiSpecCommand();
    const mockEntity = createSkiSpecEntity();

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    await Effect.runPromise(service.createSkiSpec(TEST_USER_ID, command));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        algorithm_version: '1.0.0',
      })
    );
  });

  it('should return spec with notes_count set to 0 for new specs', async () => {
    const command = createValidSkiSpecCommand();
    const mockEntity = createSkiSpecEntity();

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    const result = await Effect.runPromise(service.createSkiSpec(TEST_USER_ID, command));

    expect(result.notes_count).toBe(0);
  });

  it('should fail when database insert returns error', async () => {
    const command = createValidSkiSpecCommand();
    const dbError = { message: 'Database connection error', code: 'ECONNREFUSED' };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    const effect = service.createSkiSpec(TEST_USER_ID, command);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });

  it('should fail when database returns no data', async () => {
    const command = createValidSkiSpecCommand();

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
    });

    const effect = service.createSkiSpec(TEST_USER_ID, command);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
      expect(result.left.message).toContain('Failed to create ski specification');
    }
  });

  it('should fail when insert throws exception', async () => {
    const command = createValidSkiSpecCommand();

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        }),
      }),
    });

    const effect = service.createSkiSpec(TEST_USER_ID, command);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });
});
