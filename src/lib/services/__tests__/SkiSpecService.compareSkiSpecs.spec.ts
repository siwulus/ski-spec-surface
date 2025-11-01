import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Effect } from 'effect';
import { SkiSpecService } from '../SkiSpecService';
import { NotFoundError, DatabaseError } from '@/types/error.types';
import type { SupabaseClient } from '@/db/supabase.client';
import { TEST_USER_ID, TEST_SPEC_ID, TEST_SPEC_ID_2, createNotFoundError, createTimeoutError } from './test-utils';

/**
 * Unit Tests for SkiSpecService.compareSkiSpecs()
 *
 * Tests comparing multiple ski specifications including:
 * - Successful comparison with 2-4 specifications
 * - Parallel ownership verification
 * - DTO transformation (metadata exclusion)
 * - Not found scenarios (spec doesn't exist or user doesn't own it)
 * - Database error handling
 * - Security: IDOR prevention (same error for not found vs unauthorized)
 */

describe('SkiSpecService - compareSkiSpecs', () => {
  let service: SkiSpecService;
  let mockSupabase: SupabaseClient;

  const TEST_SPEC_ID_3 = '990e8400-e29b-41d4-a716-446655440004';
  const TEST_SPEC_ID_4 = 'aa0e8400-e29b-41d4-a716-446655440005';

  const createMockSpec = (id: string, name: string) => ({
    id,
    user_id: TEST_USER_ID,
    name,
    description: `Description for ${name}`,
    length: 180,
    tip: 130,
    waist: 100,
    tail: 120,
    radius: 18.5,
    weight: 1500,
    surface_area: 2100.0,
    relative_weight: 0.71,
    algorithm_version: '1.0.0',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  });

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    service = new SkiSpecService(mockSupabase);
  });

  it('should compare 2 specifications successfully', async () => {
    const mockSpec1 = createMockSpec(TEST_SPEC_ID, 'Ski Model 1');
    const mockSpec2 = createMockSpec(TEST_SPEC_ID_2, 'Ski Model 2');

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValueOnce({ data: mockSpec1, error: null })
            .mockResolvedValueOnce({ data: mockSpec2, error: null }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const result = await Effect.runPromise(service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2]));

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: TEST_SPEC_ID,
      name: 'Ski Model 1',
      description: 'Description for Ski Model 1',
      length: 180,
      tip: 130,
      waist: 100,
      tail: 120,
      radius: 18.5,
      weight: 1500,
      surface_area: 2100.0,
      relative_weight: 0.71,
    });
    expect(result[1]).toEqual({
      id: TEST_SPEC_ID_2,
      name: 'Ski Model 2',
      description: 'Description for Ski Model 2',
      length: 180,
      tip: 130,
      waist: 100,
      tail: 120,
      radius: 18.5,
      weight: 1500,
      surface_area: 2100.0,
      relative_weight: 0.71,
    });
  });

  it('should compare 4 specifications successfully', async () => {
    const mockSpec1 = createMockSpec(TEST_SPEC_ID, 'Ski Model 1');
    const mockSpec2 = createMockSpec(TEST_SPEC_ID_2, 'Ski Model 2');
    const mockSpec3 = createMockSpec(TEST_SPEC_ID_3, 'Ski Model 3');
    const mockSpec4 = createMockSpec(TEST_SPEC_ID_4, 'Ski Model 4');

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValueOnce({ data: mockSpec1, error: null })
            .mockResolvedValueOnce({ data: mockSpec2, error: null })
            .mockResolvedValueOnce({ data: mockSpec3, error: null })
            .mockResolvedValueOnce({ data: mockSpec4, error: null }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const result = await Effect.runPromise(
      service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2, TEST_SPEC_ID_3, TEST_SPEC_ID_4])
    );

    expect(result).toHaveLength(4);
    expect(result[0].name).toBe('Ski Model 1');
    expect(result[1].name).toBe('Ski Model 2');
    expect(result[2].name).toBe('Ski Model 3');
    expect(result[3].name).toBe('Ski Model 4');
  });

  it('should exclude metadata fields (user_id, created_at, updated_at, algorithm_version)', async () => {
    const mockSpec1 = createMockSpec(TEST_SPEC_ID, 'Ski Model 1');
    const mockSpec2 = createMockSpec(TEST_SPEC_ID_2, 'Ski Model 2');

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValueOnce({ data: mockSpec1, error: null })
            .mockResolvedValueOnce({ data: mockSpec2, error: null }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const result = await Effect.runPromise(service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2]));

    // Verify metadata fields are not included
    result.forEach((spec) => {
      expect(spec).not.toHaveProperty('user_id');
      expect(spec).not.toHaveProperty('created_at');
      expect(spec).not.toHaveProperty('updated_at');
      expect(spec).not.toHaveProperty('algorithm_version');
    });

    // Verify expected fields are included
    result.forEach((spec) => {
      expect(spec).toHaveProperty('id');
      expect(spec).toHaveProperty('name');
      expect(spec).toHaveProperty('description');
      expect(spec).toHaveProperty('length');
      expect(spec).toHaveProperty('tip');
      expect(spec).toHaveProperty('waist');
      expect(spec).toHaveProperty('tail');
      expect(spec).toHaveProperty('radius');
      expect(spec).toHaveProperty('weight');
      expect(spec).toHaveProperty('surface_area');
      expect(spec).toHaveProperty('relative_weight');
    });
  });

  it('should preserve the order of input IDs', async () => {
    const mockSpec1 = createMockSpec(TEST_SPEC_ID, 'Ski Model 1');
    const mockSpec2 = createMockSpec(TEST_SPEC_ID_2, 'Ski Model 2');
    const mockSpec3 = createMockSpec(TEST_SPEC_ID_3, 'Ski Model 3');

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValueOnce({ data: mockSpec3, error: null })
            .mockResolvedValueOnce({ data: mockSpec1, error: null })
            .mockResolvedValueOnce({ data: mockSpec2, error: null }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    // Request in different order: 3, 1, 2
    const result = await Effect.runPromise(
      service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID_3, TEST_SPEC_ID, TEST_SPEC_ID_2])
    );

    // Should return in same order as input
    expect(result[0].id).toBe(TEST_SPEC_ID_3);
    expect(result[1].id).toBe(TEST_SPEC_ID);
    expect(result[2].id).toBe(TEST_SPEC_ID_2);
  });

  it('should verify ownership for all specs with correct user_id', async () => {
    const mockSpec1 = createMockSpec(TEST_SPEC_ID, 'Ski Model 1');
    const mockSpec2 = createMockSpec(TEST_SPEC_ID_2, 'Ski Model 2');

    const eqSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValueOnce({ data: mockSpec1, error: null })
          .mockResolvedValueOnce({ data: mockSpec2, error: null }),
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: eqSpy,
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    await Effect.runPromise(service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2]));

    // Verify ownership was checked for both specs
    expect(eqSpy).toHaveBeenCalledWith('id', TEST_SPEC_ID);
    expect(eqSpy).toHaveBeenCalledWith('id', TEST_SPEC_ID_2);
  });

  it('should fail with NotFoundError when any spec does not exist', async () => {
    const mockSpec1 = createMockSpec(TEST_SPEC_ID, 'Ski Model 1');

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValueOnce({ data: mockSpec1, error: null })
            .mockResolvedValueOnce({ data: null, error: createNotFoundError() }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const effect = service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2]);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(NotFoundError);
      const error = result.left as NotFoundError;
      expect(error.message).toContain('Ski specification not found');
      expect(error.resourceType).toBe('ski_spec');
    }
  });

  it('should fail with NotFoundError when user does not own any spec', async () => {
    const mockSpec1 = createMockSpec(TEST_SPEC_ID, 'Ski Model 1');

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValueOnce({ data: mockSpec1, error: null })
            .mockResolvedValueOnce({ data: null, error: createNotFoundError() }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const effect = service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2]);
    const result = await Effect.runPromise(Effect.either(effect));

    // IDOR prevention: returns same NotFoundError as when spec doesn't exist
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(NotFoundError);
      expect(result.left.message).not.toContain('unauthorized');
      expect(result.left.message).not.toContain('permission');
    }
  });

  it('should fail on database connection errors', async () => {
    // Mock database timeout error (non-PGRST116 error)
    // Note: verifySpecOwnership checks `error?.code === 'PGRST116' || !data`
    // Since data is null, it returns NotFoundError for IDOR prevention
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

    const effect = service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2]);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      // Returns NotFoundError for IDOR prevention even with database errors
      expect(result.left).toBeInstanceOf(NotFoundError);
    }
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

    const effect = service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2]);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });

  it('should handle specs with null description', async () => {
    const mockSpec1 = { ...createMockSpec(TEST_SPEC_ID, 'Ski Model 1'), description: null };
    const mockSpec2 = { ...createMockSpec(TEST_SPEC_ID_2, 'Ski Model 2'), description: null };

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValueOnce({ data: mockSpec1, error: null })
            .mockResolvedValueOnce({ data: mockSpec2, error: null }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const result = await Effect.runPromise(service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2]));

    expect(result[0].description).toBeNull();
    expect(result[1].description).toBeNull();
  });

  it('should handle specs with different dimensions', async () => {
    const mockSpec1 = createMockSpec(TEST_SPEC_ID, 'Short Wide Ski');
    mockSpec1.length = 160;
    mockSpec1.waist = 120;
    mockSpec1.surface_area = 2240.0;

    const mockSpec2 = createMockSpec(TEST_SPEC_ID_2, 'Long Narrow Ski');
    mockSpec2.length = 190;
    mockSpec2.waist = 85;
    mockSpec2.surface_area = 1963.33;

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValueOnce({ data: mockSpec1, error: null })
            .mockResolvedValueOnce({ data: mockSpec2, error: null }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const result = await Effect.runPromise(service.compareSkiSpecs(TEST_USER_ID, [TEST_SPEC_ID, TEST_SPEC_ID_2]));

    expect(result[0].length).toBe(160);
    expect(result[0].waist).toBe(120);
    expect(result[0].surface_area).toBe(2240.0);

    expect(result[1].length).toBe(190);
    expect(result[1].waist).toBe(85);
    expect(result[1].surface_area).toBe(1963.33);
  });
});
