import { SkiSurfaceEquationSimple } from '@/lib/services/SkiSurfaceEquationSimple';
import { BusinessLogicError } from '@/types/error.types';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';

describe('SkiSurfaceEquationSimple - Calculations', () => {
  let equation: SkiSurfaceEquationSimple;

  beforeEach(() => {
    equation = new SkiSurfaceEquationSimple();
  });

  describe('calculate', () => {
    it('calculates surface area and relative weight correctly for typical ski', async () => {
      const dimensions = {
        length: 186,
        tip: 140,
        waist: 106,
        tail: 128,
        radius: 19,
      };
      const weight = 1800;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Expected surface area: (186 * ((140 + 106 + 128) / 3)) / 10
      // = (186 * 124.67) / 10 = 2318.8 cm²
      expect(result.surface_area).toBe(2318.8);

      // Expected relative weight: 1800 / 2318.8 = 0.78 g/cm²
      expect(result.relative_weight).toBe(0.78);
    });

    it('calculates for narrow ski', async () => {
      const dimensions = {
        length: 170,
        tip: 110,
        waist: 85,
        tail: 100,
        radius: 14,
      };
      const weight = 1500;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Expected surface area: (170 * ((110 + 85 + 100) / 3)) / 10 = 1671.67 cm²
      expect(result.surface_area).toBe(1671.67);

      // Expected relative weight: 1500 / 1671.67 = 0.90 g/cm²
      expect(result.relative_weight).toBe(0.9);
    });

    it('calculates for wide powder ski', async () => {
      const dimensions = {
        length: 190,
        tip: 150,
        waist: 120,
        tail: 140,
        radius: 22,
      };
      const weight = 2200;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Expected surface area: (190 * ((150 + 120 + 140) / 3)) / 10 = 2596.67 cm²
      expect(result.surface_area).toBe(2596.67);

      // Expected relative weight: 2200 / 2596.67 = 0.85 g/cm²
      expect(result.relative_weight).toBe(0.85);
    });

    it('rounds both values to 2 decimal places', async () => {
      const dimensions = {
        length: 175,
        tip: 115,
        waist: 89,
        tail: 105,
        radius: 15,
      };
      const weight = 1750;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Both values should have at most 2 decimal places
      expect(result.surface_area.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(result.relative_weight.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('handles symmetric ski (tip = tail)', async () => {
      const dimensions = {
        length: 180,
        tip: 130,
        waist: 100,
        tail: 130,
        radius: 18,
      };
      const weight = 1620;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Expected surface area: (180 * ((130 + 100 + 130) / 3)) / 10 = 2160 cm²
      expect(result.surface_area).toBe(2160);

      // Expected relative weight: 1620 / 2160 = 0.75 g/cm²
      expect(result.relative_weight).toBe(0.75);
    });

    it('handles lightweight ski', async () => {
      const dimensions = {
        length: 180,
        tip: 130,
        waist: 100,
        tail: 120,
        radius: 18,
      };
      const weight = 1200;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Expected surface area: (180 * ((130 + 100 + 120) / 3)) / 10 = 2100 cm²
      expect(result.surface_area).toBe(2100);

      // Expected relative weight: 1200 / 2100 = 0.57 g/cm²
      expect(result.relative_weight).toBe(0.57);
    });

    it('handles heavy ski', async () => {
      const dimensions = {
        length: 180,
        tip: 130,
        waist: 100,
        tail: 120,
        radius: 18,
      };
      const weight = 2500;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Expected surface area: 2100 cm²
      expect(result.surface_area).toBe(2100);

      // Expected relative weight: 2500 / 2100 = 1.19 g/cm²
      expect(result.relative_weight).toBe(1.19);
    });

    it('fails with BusinessLogicError when surface area is zero', async () => {
      const dimensions = {
        length: 0, // This will result in surface area = 0
        tip: 140,
        waist: 106,
        tail: 128,
        radius: 19,
      };
      const weight = 1800;

      const effect = equation.calculate(dimensions, weight);

      // Use Effect.either to capture the error
      const result = await Effect.runPromise(Effect.either(effect));

      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(BusinessLogicError);
        expect(result.left.message).toBe('Surface area cannot be zero');
        expect(result.left.code).toBe('INVALID_SURFACE_AREA');
        expect(result.left.context).toMatchObject({ weight, surface_area: 0 });
      } else {
        throw new Error('Expected Left but got Right');
      }
    });
  });

  describe('getCurrentAlgorithmVersion', () => {
    it('returns semantic version string', () => {
      const version = equation.getCurrentAlgorithmVersion();

      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(version).toBe('1.0.0');
    });
  });
});
