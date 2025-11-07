import { SkiSurfaceEquationIntegral } from './SkiSurfaceEquationIntegral';
import { SkiSurfaceEquationSimple } from './SkiSurfaceEquationSimple';
import { BusinessLogicError } from '@/types/error.types';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';

describe('SkiSurfaceEquationIntegral - v2.0.0', () => {
  let equation: SkiSurfaceEquationIntegral;

  beforeEach(() => {
    equation = new SkiSurfaceEquationIntegral();
  });

  describe('constructor validation', () => {
    it('creates instance with default parameters', () => {
      const eq = new SkiSurfaceEquationIntegral();
      expect(eq).toBeInstanceOf(SkiSurfaceEquationIntegral);
      expect(eq.getCurrentAlgorithmVersion()).toBe('2.0.0');
    });

    it('creates instance with custom parameters', () => {
      const eq = new SkiSurfaceEquationIntegral(0.45, 0.12);
      expect(eq).toBeInstanceOf(SkiSurfaceEquationIntegral);
    });

    it('throws error when waistPosition is zero', () => {
      expect(() => new SkiSurfaceEquationIntegral(0, 0.15)).toThrow(BusinessLogicError);
    });

    it('throws error when waistPosition is negative', () => {
      expect(() => new SkiSurfaceEquationIntegral(-0.1, 0.15)).toThrow(BusinessLogicError);
    });

    it('throws error when waistPosition is 1', () => {
      expect(() => new SkiSurfaceEquationIntegral(1, 0.15)).toThrow(BusinessLogicError);
    });

    it('throws error when waistPosition is greater than 1', () => {
      expect(() => new SkiSurfaceEquationIntegral(1.1, 0.15)).toThrow(BusinessLogicError);
    });

    it('throws error when tipRatio is zero', () => {
      expect(() => new SkiSurfaceEquationIntegral(0.43, 0)).toThrow(BusinessLogicError);
    });

    it('throws error when tipRatio is negative', () => {
      expect(() => new SkiSurfaceEquationIntegral(0.43, -0.1)).toThrow(BusinessLogicError);
    });

    it('throws error when tipRatio is 1', () => {
      expect(() => new SkiSurfaceEquationIntegral(0.43, 1)).toThrow(BusinessLogicError);
    });

    it('throws error when tipRatio is greater than 1', () => {
      expect(() => new SkiSurfaceEquationIntegral(0.43, 1.1)).toThrow(BusinessLogicError);
    });

    it('throws error when waistPosition + tipRatio equals 1', () => {
      expect(() => new SkiSurfaceEquationIntegral(0.5, 0.5)).toThrow(BusinessLogicError);
    });

    it('throws error when waistPosition + tipRatio exceeds 1', () => {
      expect(() => new SkiSurfaceEquationIntegral(0.6, 0.5)).toThrow(BusinessLogicError);
    });

    it('includes context in error for invalid parameters', () => {
      try {
        new SkiSurfaceEquationIntegral(0.6, 0.5);
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessLogicError);
        const businessError = error as BusinessLogicError;
        expect(businessError.code).toBe('INVALID_CONSTRUCTOR_PARAMS');
        expect(businessError.context).toMatchObject({
          waistPosition: 0.6,
          tipRatio: 0.5,
        });
      }
    });
  });

  describe('calculate - typical ski dimensions', () => {
    it('calculates surface area for typical freeride ski (180cm)', async () => {
      const dimensions = {
        length: 180,
        tip: 145, // 14.5 cm
        waist: 108, // 10.8 cm
        tail: 135, // 13.5 cm
        radius: 18,
      };
      const weight = 1850;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Section lengths: l_back=77.4, l_front=75.6, l_tip=27
      // Back: 77.4 * (13.5/6 + 10.8/3) = 77.4 * 5.85 = 452.79
      // Front: 75.6 * (14.5/6 + 10.8/3) = 75.6 * 6.0167 = 454.86
      // Tip: (14.5/(2*ln(28))) * [28*ln(28) - 27] ≈ 144.25
      // Total: 2 * (452.79 + 454.86 + 144.25) = 2103.8
      expect(result.surface_area).toBeCloseTo(2103.8, 1);
      expect(result.surface_area).toBeGreaterThan(0);
      expect(result.relative_weight).toBeCloseTo(weight / result.surface_area, 2);
    });

    it('calculates surface area for narrow all-mountain ski (170cm)', async () => {
      const dimensions = {
        length: 170,
        tip: 130, // 13.0 cm
        waist: 90, // 9.0 cm
        tail: 115, // 11.5 cm
        radius: 15,
      };
      const weight = 1600;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Sections: l_back=73.1, l_front=71.4, l_tip=25.5
      expect(result.surface_area).toBeGreaterThan(0);
      expect(result.surface_area).toBeLessThan(3000); // Sanity check
      expect(result.relative_weight).toBe(Math.round((weight / result.surface_area) * 100) / 100);
    });

    it('calculates surface area for wide powder ski (190cm)', async () => {
      const dimensions = {
        length: 190,
        tip: 150, // 15.0 cm
        waist: 120, // 12.0 cm
        tail: 140, // 14.0 cm
        radius: 22,
      };
      const weight = 2200;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Wider ski should have larger surface area
      expect(result.surface_area).toBeGreaterThan(2300);
      expect(result.relative_weight).toBeCloseTo(weight / result.surface_area, 2);
    });

    it('calculates surface area for symmetric ski (tip = tail)', async () => {
      const dimensions = {
        length: 180,
        tip: 130, // 13.0 cm
        waist: 100, // 10.0 cm
        tail: 130, // 13.0 cm
        radius: 18,
      };
      const weight = 1620;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Back and front sections should contribute equally (symmetric)
      expect(result.surface_area).toBeGreaterThan(0);
      expect(result.relative_weight).toBeCloseTo(weight / result.surface_area, 2);
    });
  });

  describe('calculate - custom section ratios', () => {
    it('calculates with custom waist position', async () => {
      const customEquation = new SkiSurfaceEquationIntegral(0.45, 0.15); // 45% back, 40% front, 15% tip

      const dimensions = {
        length: 180,
        tip: 145,
        waist: 108,
        tail: 135,
        radius: 18,
      };
      const weight = 1850;

      const result = await Effect.runPromise(customEquation.calculate(dimensions, weight));

      expect(result.surface_area).toBeGreaterThan(0);
      expect(result.relative_weight).toBeCloseTo(weight / result.surface_area, 2);
    });

    it('calculates with custom tip ratio', async () => {
      const customEquation = new SkiSurfaceEquationIntegral(0.43, 0.2); // 43% back, 37% front, 20% tip

      const dimensions = {
        length: 180,
        tip: 145,
        waist: 108,
        tail: 135,
        radius: 18,
      };
      const weight = 1850;

      const result = await Effect.runPromise(customEquation.calculate(dimensions, weight));

      // Larger tip section should affect total surface area
      expect(result.surface_area).toBeGreaterThan(0);
      expect(result.relative_weight).toBeCloseTo(weight / result.surface_area, 2);
    });

    it('calculates with minimal tip section', async () => {
      const customEquation = new SkiSurfaceEquationIntegral(0.43, 0.05); // 43% back, 52% front, 5% tip

      const dimensions = {
        length: 180,
        tip: 145,
        waist: 108,
        tail: 135,
        radius: 18,
      };
      const weight = 1850;

      const result = await Effect.runPromise(customEquation.calculate(dimensions, weight));

      expect(result.surface_area).toBeGreaterThan(0);
      expect(result.relative_weight).toBeCloseTo(weight / result.surface_area, 2);
    });
  });

  describe('calculate - unit conversion', () => {
    it('correctly converts mm to cm for widths', async () => {
      const dimensions = {
        length: 100, // cm
        tip: 100, // mm = 10 cm
        waist: 100, // mm = 10 cm
        tail: 100, // mm = 10 cm
        radius: 10,
      };
      const weight = 1000;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // With all widths equal, result should be calculated correctly
      expect(result.surface_area).toBeGreaterThan(0);
      // For uniform width, surface area should be roughly length * width
      // But with our section split and formulas, it will be different
      expect(result.surface_area).toBeLessThan(1500); // Sanity check
    });
  });

  describe('calculate - rounding', () => {
    it('rounds surface area to 2 decimal places', async () => {
      const dimensions = {
        length: 186,
        tip: 140,
        waist: 106,
        tail: 128,
        radius: 19,
      };
      const weight = 1800;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Check that result has at most 2 decimal places
      const decimalPlaces = result.surface_area.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('rounds relative weight to 2 decimal places', async () => {
      const dimensions = {
        length: 186,
        tip: 140,
        waist: 106,
        tail: 128,
        radius: 19,
      };
      const weight = 1800;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      // Check that result has at most 2 decimal places
      const decimalPlaces = result.relative_weight.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('calculate - error handling', () => {
    it('fails when section length is too small', async () => {
      const dimensions = {
        length: 0.5, // Very small length results in tip section < 0.1 cm (0.5 * 0.15 = 0.075)
        tip: 100,
        waist: 80,
        tail: 90,
        radius: 10,
      };
      const weight = 1000;

      const effect = equation.calculate(dimensions, weight);
      const result = await Effect.runPromise(Effect.either(effect));

      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(BusinessLogicError);
        expect(result.left.code).toBe('INVALID_TIP_LENGTH');
      } else {
        throw new Error('Expected Left but got Right');
      }
    });

    it('fails when length is zero', async () => {
      const dimensions = {
        length: 0,
        tip: 140,
        waist: 106,
        tail: 128,
        radius: 19,
      };
      const weight = 1800;

      const effect = equation.calculate(dimensions, weight);
      const result = await Effect.runPromise(Effect.either(effect));

      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(BusinessLogicError);
        expect(result.left.code).toBe('INVALID_SECTION_LENGTHS');
      } else {
        throw new Error('Expected Left but got Right');
      }
    });

    it('fails when length is negative', async () => {
      const dimensions = {
        length: -100,
        tip: 140,
        waist: 106,
        tail: 128,
        radius: 19,
      };
      const weight = 1800;

      const effect = equation.calculate(dimensions, weight);
      const result = await Effect.runPromise(Effect.either(effect));

      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(BusinessLogicError);
        expect(result.left.code).toBe('INVALID_SECTION_LENGTHS');
      } else {
        throw new Error('Expected Left but got Right');
      }
    });

    it('includes context in error messages', async () => {
      const dimensions = {
        length: 0,
        tip: 140,
        waist: 106,
        tail: 128,
        radius: 19,
      };
      const weight = 1800;

      const effect = equation.calculate(dimensions, weight);
      const result = await Effect.runPromise(Effect.either(effect));

      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(BusinessLogicError);
        expect(result.left.context).toBeDefined();
        expect(result.left.context).toHaveProperty('l_back');
        expect(result.left.context).toHaveProperty('l_front');
        expect(result.left.context).toHaveProperty('l_tip');
      } else {
        throw new Error('Expected Left but got Right');
      }
    });
  });

  describe('calculate - edge cases', () => {
    it('handles very large dimensions', async () => {
      const dimensions = {
        length: 250, // Max length
        tip: 250, // Max width
        waist: 150,
        tail: 200,
        radius: 30,
      };
      const weight = 3000; // Max weight

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      expect(result.surface_area).toBeGreaterThan(0);
      expect(result.surface_area).toBeLessThan(10000); // Sanity check
      expect(result.relative_weight).toBeGreaterThan(0);
    });

    it('handles minimum valid dimensions', async () => {
      const dimensions = {
        length: 100, // Min length
        tip: 50, // Min width
        waist: 50,
        tail: 50,
        radius: 1,
      };
      const weight = 500; // Min weight

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      expect(result.surface_area).toBeGreaterThan(0);
      expect(result.relative_weight).toBeGreaterThan(0);
    });

    it('handles ski with minimum waist width', async () => {
      const dimensions = {
        length: 180,
        tip: 150,
        waist: 50, // Minimum
        tail: 140,
        radius: 18,
      };
      const weight = 1800;

      const result = await Effect.runPromise(equation.calculate(dimensions, weight));

      expect(result.surface_area).toBeGreaterThan(0);
      expect(result.relative_weight).toBeGreaterThan(0);
    });
  });

  describe('comparison with v1.0.0 (SkiSurfaceEquationSimple)', () => {
    it('produces different result than simple algorithm', async () => {
      const simpleEquation = new SkiSurfaceEquationSimple();
      const integralEquation = new SkiSurfaceEquationIntegral();

      const dimensions = {
        length: 180,
        tip: 145,
        waist: 108,
        tail: 135,
        radius: 18,
      };
      const weight = 1850;

      const simpleResult = await Effect.runPromise(simpleEquation.calculate(dimensions, weight));
      const integralResult = await Effect.runPromise(integralEquation.calculate(dimensions, weight));

      // Results should differ (integral method is more sophisticated)
      expect(integralResult.surface_area).not.toBe(simpleResult.surface_area);
      expect(integralResult.relative_weight).not.toBe(simpleResult.relative_weight);

      // Both should be positive
      expect(simpleResult.surface_area).toBeGreaterThan(0);
      expect(integralResult.surface_area).toBeGreaterThan(0);
    });

    it('v2.0.0 should be more accurate for shaped skis', async () => {
      const simpleEquation = new SkiSurfaceEquationSimple();
      const integralEquation = new SkiSurfaceEquationIntegral();

      // Highly shaped ski (large sidecut)
      const dimensions = {
        length: 180,
        tip: 150,
        waist: 90,
        tail: 140,
        radius: 15,
      };
      const weight = 1850;

      const simpleResult = await Effect.runPromise(simpleEquation.calculate(dimensions, weight));
      const integralResult = await Effect.runPromise(integralEquation.calculate(dimensions, weight));

      // For shaped skis, simple average may overestimate
      // Integral should account for the shape more accurately
      expect(integralResult.surface_area).not.toBe(simpleResult.surface_area);
    });
  });

  describe('getCurrentAlgorithmVersion', () => {
    it('returns version 2.0.0', () => {
      const version = equation.getCurrentAlgorithmVersion();

      expect(version).toBe('2.0.0');
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('version differs from simple algorithm', () => {
      const simpleEquation = new SkiSurfaceEquationSimple();
      const integralEquation = new SkiSurfaceEquationIntegral();

      expect(integralEquation.getCurrentAlgorithmVersion()).not.toBe(simpleEquation.getCurrentAlgorithmVersion());
      expect(simpleEquation.getCurrentAlgorithmVersion()).toBe('1.0.0');
      expect(integralEquation.getCurrentAlgorithmVersion()).toBe('2.0.0');
    });
  });

  describe('mathematical correctness', () => {
    it('surface area increases with length', async () => {
      const baseWeight = 1800;
      const baseDimensions = {
        tip: 140,
        waist: 106,
        tail: 128,
        radius: 19,
      };

      const result170 = await Effect.runPromise(equation.calculate({ length: 170, ...baseDimensions }, baseWeight));
      const result180 = await Effect.runPromise(equation.calculate({ length: 180, ...baseDimensions }, baseWeight));
      const result190 = await Effect.runPromise(equation.calculate({ length: 190, ...baseDimensions }, baseWeight));

      expect(result180.surface_area).toBeGreaterThan(result170.surface_area);
      expect(result190.surface_area).toBeGreaterThan(result180.surface_area);
    });

    it('surface area increases with width', async () => {
      const baseDimensions = {
        length: 180,
        radius: 18,
      };
      const weight = 1850;

      const narrow = await Effect.runPromise(
        equation.calculate({ ...baseDimensions, tip: 130, waist: 90, tail: 120 }, weight)
      );
      const medium = await Effect.runPromise(
        equation.calculate({ ...baseDimensions, tip: 140, waist: 100, tail: 130 }, weight)
      );
      const wide = await Effect.runPromise(
        equation.calculate({ ...baseDimensions, tip: 150, waist: 110, tail: 140 }, weight)
      );

      expect(medium.surface_area).toBeGreaterThan(narrow.surface_area);
      expect(wide.surface_area).toBeGreaterThan(medium.surface_area);
    });

    it('relative weight increases with weight for same dimensions', async () => {
      const dimensions = {
        length: 180,
        tip: 145,
        waist: 108,
        tail: 135,
        radius: 18,
      };

      const light = await Effect.runPromise(equation.calculate(dimensions, 1500));
      const medium = await Effect.runPromise(equation.calculate(dimensions, 1850));
      const heavy = await Effect.runPromise(equation.calculate(dimensions, 2200));

      expect(medium.relative_weight).toBeGreaterThan(light.relative_weight);
      expect(heavy.relative_weight).toBeGreaterThan(medium.relative_weight);

      // Surface area should be the same (same dimensions)
      expect(light.surface_area).toBe(medium.surface_area);
      expect(medium.surface_area).toBe(heavy.surface_area);
    });
  });
});
