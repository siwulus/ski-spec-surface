import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Effect } from 'effect';
import { SkiSpecService } from '../SkiSpecService';
import { DatabaseError } from '@/types/error.types';
import type { SupabaseClient } from '@/db/supabase.client';
import type { ListSkiSpecsQuery } from '@/types/api.types';
import { TEST_USER_ID, createSkiSpecEntity, TEST_SPEC_ID, TEST_SPEC_ID_2 } from './test-utils';

/**
 * Unit Tests for SkiSpecService.listSkiSpecs()
 *
 * Tests listing ski specifications with:
 * - Pagination (page, limit, range calculation)
 * - Sorting (by different fields, asc/desc)
 * - Search filtering (name and description)
 * - Notes count aggregation
 * - Empty results handling
 * - Database error handling
 */

describe('SkiSpecService - listSkiSpecs', () => {
  let service: SkiSpecService;
  let mockSupabase: SupabaseClient;

  const defaultQuery: ListSkiSpecsQuery = {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  };

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    service = new SkiSpecService(mockSupabase);
  });

  it('should list ski specifications with pagination', async () => {
    const mockSpecs = [createSkiSpecEntity()];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: mockSpecs,
            error: null,
            count: 1,
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
      .mockReturnValue({ select: mockNotesSelect });

    const result = await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, defaultQuery));

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      ...mockSpecs[0],
      notes_count: 3,
    });
    expect(result.total).toBe(1);
  });

  it('should request exact count in query', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, defaultQuery));

    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact' });
  });

  it('should filter by user_id', async () => {
    const eqSpy = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: eqSpy,
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, defaultQuery));

    expect(eqSpy).toHaveBeenCalledWith('user_id', TEST_USER_ID);
  });

  it('should calculate correct range for pagination', async () => {
    const rangeSpy = vi.fn().mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: rangeSpy,
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    // Page 1, limit 20: range(0, 19)
    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, { ...defaultQuery, page: 1, limit: 20 }));
    expect(rangeSpy).toHaveBeenCalledWith(0, 19);

    // Page 2, limit 20: range(20, 39)
    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, { ...defaultQuery, page: 2, limit: 20 }));
    expect(rangeSpy).toHaveBeenCalledWith(20, 39);

    // Page 3, limit 10: range(20, 29)
    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, { ...defaultQuery, page: 3, limit: 10 }));
    expect(rangeSpy).toHaveBeenCalledWith(20, 29);
  });

  it('should apply sorting by specified field and order', async () => {
    const orderSpy = vi.fn().mockReturnValue({
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: orderSpy,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    await Effect.runPromise(
      service.listSkiSpecs(TEST_USER_ID, {
        ...defaultQuery,
        sort_by: 'name',
        sort_order: 'asc',
      })
    );

    expect(orderSpy).toHaveBeenCalledWith('name', { ascending: true });
  });

  it('should support sorting by all allowed fields', async () => {
    const sortFields: ListSkiSpecsQuery['sort_by'][] = [
      'name',
      'length',
      'surface_area',
      'relative_weight',
      'created_at',
    ];

    for (const sortField of sortFields) {
      const orderSpy = vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: orderSpy,
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      await Effect.runPromise(
        service.listSkiSpecs(TEST_USER_ID, {
          ...defaultQuery,
          sort_by: sortField,
          sort_order: 'asc',
        })
      );

      expect(orderSpy).toHaveBeenCalledWith(sortField, { ascending: true });
    }
  });

  it('should support both ascending and descending sort orders', async () => {
    const orderSpy = vi.fn().mockReturnValue({
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: orderSpy,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    // Test ascending
    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, { ...defaultQuery, sort_order: 'asc' }));
    expect(orderSpy).toHaveBeenCalledWith(expect.any(String), { ascending: true });

    // Test descending
    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, { ...defaultQuery, sort_order: 'desc' }));
    expect(orderSpy).toHaveBeenCalledWith(expect.any(String), { ascending: false });
  });

  it('should apply search filter when provided', async () => {
    const orSpy = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: orSpy,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, { ...defaultQuery, search: 'Test Ski' }));

    expect(orSpy).toHaveBeenCalledWith('name.ilike.%Test Ski%,description.ilike.%Test Ski%');
  });

  it('should trim search term before applying filter', async () => {
    const orSpy = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: orSpy,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, { ...defaultQuery, search: '  Whitespace  ' }));

    expect(orSpy).toHaveBeenCalledWith('name.ilike.%Whitespace%,description.ilike.%Whitespace%');
  });

  it('should skip search filter when search is empty string after trim', async () => {
    const orderSpy = vi.fn().mockReturnValue({
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: orderSpy,
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, { ...defaultQuery, search: '   ' }));

    // or() should not be called when search is empty after trim
    // The query goes directly from eq() to order()
    expect(orderSpy).toHaveBeenCalled();
  });

  it('should aggregate notes count for each spec', async () => {
    const mockSpecs = [
      { ...createSkiSpecEntity(), id: TEST_SPEC_ID },
      { ...createSkiSpecEntity(), id: TEST_SPEC_ID_2 },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: mockSpecs,
            error: null,
            count: 2,
          }),
        }),
      }),
    });

    let callCount = 0;
    const mockNotesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation(async () => ({
        count: ++callCount * 2, // Return different counts for each spec
        error: null,
      })),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValue({ select: mockNotesSelect });

    const result = await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, defaultQuery));

    expect(result.data).toHaveLength(2);
    expect(result.data[0].notes_count).toBe(2);
    expect(result.data[1].notes_count).toBe(4);
  });

  it('should return empty array when no specs found', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const result = await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, defaultQuery));

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should treat null data as empty array', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: null,
            error: null,
            count: 0,
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const result = await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, defaultQuery));

    expect(result.data).toEqual([]);
  });

  it('should treat null count as 0', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: null,
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const result = await Effect.runPromise(service.listSkiSpecs(TEST_USER_ID, defaultQuery));

    expect(result.total).toBe(0);
  });

  it('should fail with DatabaseError when query fails', async () => {
    const dbError = { message: 'Query timeout', code: 'TIMEOUT' };

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: dbError,
              count: null,
            }),
          }),
        }),
      }),
    });

    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: mockSelect,
    });

    const effect = service.listSkiSpecs(TEST_USER_ID, defaultQuery);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });

  it('should fail when notes count aggregation fails', async () => {
    const mockSpecs = [createSkiSpecEntity()];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockSpecs,
              error: null,
              count: 1,
            }),
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
      .mockReturnValue({ select: mockNotesSelect });

    const effect = service.listSkiSpecs(TEST_USER_ID, defaultQuery);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });

  it('should fail when query throws exception', async () => {
    (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockRejectedValue(new Error('Network error')),
            }),
          }),
        }),
      }),
    });

    const effect = service.listSkiSpecs(TEST_USER_ID, defaultQuery);
    const result = await Effect.runPromise(Effect.either(effect));

    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(DatabaseError);
    }
  });
});
