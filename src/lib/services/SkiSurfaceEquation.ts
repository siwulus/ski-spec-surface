import { Effect } from 'effect';
import { BusinessLogicError } from '@/types/error.types';

/**
 * Result of ski surface area and weight calculations.
 */
export interface SkiCalculationResult {
  surface_area: number;
  relative_weight: number;
}

/**
 * Interface for ski surface area calculation algorithms.
 *
 * This abstraction enables different calculation strategies to be implemented
 * and swapped without modifying the SkiSpecService. Each implementation
 * represents a specific algorithm version.
 */
export interface SkiSurfaceEquation {
  /**
   * Calculates all derived fields for a ski specification.
   *
   * This method computes:
   * - surface_area: Surface area in cm² based on dimensions
   * - relative_weight: Weight per unit area (g/cm²) for size-normalized comparison
   *
   * @param dimensions - Ski dimensions (length, tip, waist, tail, radius)
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
  ): Effect.Effect<SkiCalculationResult, BusinessLogicError>;

  /**
   * Returns the current version of the calculation algorithm.
   *
   * This version is stored with each ski specification to track which
   * algorithm was used for calculations, enabling future recalculations
   * if the algorithm changes.
   *
   * @returns Algorithm version string (semantic versioning)
   */
  getCurrentAlgorithmVersion(): string;
}
