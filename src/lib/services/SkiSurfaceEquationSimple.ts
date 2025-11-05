import { Effect, pipe } from 'effect';
import type { SkiSurfaceEquation, SkiCalculationResult } from './SkiSurfaceEquation';
import { BusinessLogicError } from '@/types/error.types';

/**
 * Simple trapezoidal approximation for ski surface area calculation.
 *
 * Algorithm (v1.0.0):
 * Uses a simplified trapezoidal approximation where the ski is treated as
 * a trapezoid with average width calculated from tip, waist, and tail dimensions.
 *
 * This is the baseline implementation that can be replaced with more sophisticated
 * algorithms in the future without modifying the SkiSpecService.
 */
export class SkiSurfaceEquationSimple implements SkiSurfaceEquation {
  /**
   * Calculates all derived fields for a ski specification.
   *
   * Algorithm (v1.0.0):
   * - Surface area: Trapezoidal approximation using average width
   * - Relative weight: Weight per unit area (g/cm²)
   *
   * @param dimensions - Ski dimensions
   * @param weight - Ski weight in grams
   * @returns Effect that succeeds with calculation results or fails with BusinessLogicError
   */
  calculate(
    dimensions: {
      length: number;
      tip: number;
      waist: number;
      tail: number;
      radius: number;
    },
    weight: number
  ): Effect.Effect<SkiCalculationResult, BusinessLogicError> {
    return pipe(
      Effect.sync(() => {
        const avgWidth = (dimensions.tip + dimensions.waist + dimensions.tail) / 3;
        // Convert mm to cm and calculate surface area
        const surfaceArea = (dimensions.length * avgWidth) / 10; // length in cm * width in mm / 10 = cm²
        // Round to 2 decimal places
        const roundedSurfaceArea = Math.round(surfaceArea * 100) / 100;
        return { surface_area: roundedSurfaceArea };
      }),
      Effect.flatMap(({ surface_area }) =>
        Effect.if(surface_area > 0, {
          onTrue: () => {
            const relativeWeight = weight / surface_area;
            // Round to 2 decimal places
            const roundedRelativeWeight = Math.round(relativeWeight * 100) / 100;
            return Effect.succeed({
              surface_area,
              relative_weight: roundedRelativeWeight,
            });
          },
          onFalse: () =>
            Effect.fail(
              new BusinessLogicError('Surface area cannot be zero', {
                code: 'INVALID_SURFACE_AREA',
                context: { weight, surface_area, dimensions },
              })
            ),
        })
      )
    );
  }

  /**
   * Returns the current version of the calculation algorithm.
   *
   * This version is stored with each ski specification to track which
   * algorithm was used for calculations, enabling future recalculations
   * if the algorithm changes.
   *
   * @returns Algorithm version string (semantic versioning)
   */
  getCurrentAlgorithmVersion(): string {
    return '1.0.0';
  }
}
