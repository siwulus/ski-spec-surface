import type { SupabaseClient } from '@/db/supabase.client';
import { SkiSpecService } from '@/lib/services/SkiSpecService';
import { BusinessLogicError } from '@/types/error.types';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';

describe('SkiSpecService - Calculations', () => {
  let service: SkiSpecService;
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    // Create a mock Supabase client (not needed for these tests but required by constructor)
    mockSupabase = {} as SupabaseClient;
    service = new SkiSpecService(mockSupabase);
  });

  describe('calculateSurfaceArea', () => {
    it('calculates surface area correctly for typical ski dimensions', () => {
      const dimensions = {
        length: 186,
        tip: 140,
        waist: 106,
        tail: 128,
        radius: 19,
      };

      const result = service.calculateSurfaceArea(dimensions);

      // Expected: (186 * ((140 + 106 + 128) / 3)) / 10
      // = (186 * 124.67) / 10
      // = 23188 / 10
      // = 2318.8 cm²
      expect(result).toBe(2318.8);
    });

    it('calculates surface area for narrow ski', () => {
      const dimensions = {
        length: 170,
        tip: 110,
        waist: 85,
        tail: 100,
        radius: 14,
      };

      const result = service.calculateSurfaceArea(dimensions);

      // Expected: (170 * ((110 + 85 + 100) / 3)) / 10
      // = (170 * 98.33) / 10
      // = 1671.61 cm²
      expect(result).toBe(1671.67);
    });

    it('calculates surface area for wide powder ski', () => {
      const dimensions = {
        length: 190,
        tip: 150,
        waist: 120,
        tail: 140,
        radius: 22,
      };

      const result = service.calculateSurfaceArea(dimensions);

      // Expected: (190 * ((150 + 120 + 140) / 3)) / 10
      // = (190 * 136.67) / 10
      // = 2596.73 cm²
      expect(result).toBe(2596.67);
    });

    it('rounds result to 2 decimal places', () => {
      const dimensions = {
        length: 175,
        tip: 115,
        waist: 89,
        tail: 105,
        radius: 15,
      };

      const result = service.calculateSurfaceArea(dimensions);

      // Result should have at most 2 decimal places
      expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('handles symmetric ski (tip = tail)', () => {
      const dimensions = {
        length: 180,
        tip: 130,
        waist: 100,
        tail: 130,
        radius: 18,
      };

      const result = service.calculateSurfaceArea(dimensions);

      // Expected: (180 * ((130 + 100 + 130) / 3)) / 10
      // = (180 * 120) / 10
      // = 2160 cm²
      expect(result).toBe(2160);
    });
  });

  describe('calculateRelativeWeight', () => {
    it('calculates relative weight correctly', async () => {
      const weight = 1800; // grams
      const surfaceArea = 2400; // cm²

      const result = await Effect.runPromise(service.calculateRelativeWeight(weight, surfaceArea));

      // Expected: 1800 / 2400 = 0.75 g/cm²
      expect(result).toBe(0.75);
    });

    it('rounds result to 2 decimal places', async () => {
      const weight = 1750;
      const surfaceArea = 2318.82;

      const result = await Effect.runPromise(service.calculateRelativeWeight(weight, surfaceArea));

      // Result should have at most 2 decimal places
      expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('fails with BusinessLogicError when surface area is zero', async () => {
      const weight = 1800;
      const surfaceArea = 0;

      const effect = service.calculateRelativeWeight(weight, surfaceArea);

      // Use Effect.either to capture the error
      const result = await Effect.runPromise(Effect.either(effect));

      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(BusinessLogicError);
        expect(result.left.message).toBe('Surface area cannot be zero');
        expect(result.left.code).toBe('INVALID_SURFACE_AREA');
        expect(result.left.context).toEqual({ weight, surfaceArea });
      } else {
        throw new Error('Expected Left but got Right');
      }
    });

    it('handles lightweight ski', async () => {
      const weight = 1200;
      const surfaceArea = 2000;

      const result = await Effect.runPromise(service.calculateRelativeWeight(weight, surfaceArea));

      // Expected: 1200 / 2000 = 0.6 g/cm²
      expect(result).toBe(0.6);
    });

    it('handles heavy ski', async () => {
      const weight = 2500;
      const surfaceArea = 2500;

      const result = await Effect.runPromise(service.calculateRelativeWeight(weight, surfaceArea));

      // Expected: 2500 / 2500 = 1 g/cm²
      expect(result).toBe(1);
    });
  });

  describe('getCurrentAlgorithmVersion', () => {
    it('returns semantic version string', () => {
      const version = service.getCurrentAlgorithmVersion();

      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(version).toBe('1.0.0');
    });
  });
});
