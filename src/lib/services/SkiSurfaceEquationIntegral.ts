import { Effect, pipe } from 'effect';
import type { SkiSurfaceEquation, SkiCalculationResult } from './SkiSurfaceEquation';
import { BusinessLogicError } from '@/types/error.types';

/**
 * Section lengths for ski geometry calculation.
 */
interface SectionLengths {
  l_back: number; // Length of back section (tail to waist) in cm
  l_front: number; // Length of front section (waist to tip start) in cm
  l_tip: number; // Length of tip section (rounded end) in cm
}

/**
 * Width dimensions in centimeters.
 */
interface WidthsCm {
  tip: number; // Tip width in cm
  waist: number; // Waist width in cm
  tail: number; // Tail width in cm
}

/**
 * Advanced integral-based ski surface area calculation.
 *
 * Algorithm (v2.0.0):
 * This implementation models the ski in three distinct sections with different
 * geometric characteristics, using integral calculus for precise surface area calculation:
 *
 * 1. **Back Section** (tail to waist): Quadratic function modeling the widening from tail
 * 2. **Front Section** (waist to tip start): Quadratic function modeling the widening to tip
 * 3. **Tip Section** (rounded end): Logarithmic function modeling the characteristic tip rounding
 *
 * The total surface area is calculated by integrating the width functions along the length
 * of each section and multiplying by 2 to account for both sides of the ski.
 *
 * Mathematical specification: See .ai/ski-surface-equation.md
 *
 * @see {SkiSurfaceEquation}
 */
export class SkiSurfaceEquationIntegral implements SkiSurfaceEquation {
  /**
   * Creates a new integral-based ski surface equation calculator.
   *
   * @param waistPosition - Position of the waist as a ratio of total length from the tail (0-1).
   *                        Default: 0.43 (43% from tail, typical ski design)
   * @param tipRatio - Length of the tip section as a ratio of total length (0-1).
   *                   Default: 0.15 (15% of total length)
   * @throws {BusinessLogicError} If parameters are invalid
   */
  constructor(
    private readonly waistPosition = 0.43,
    private readonly tipRatio = 0.15
  ) {
    // Validate constructor parameters
    if (waistPosition <= 0 || waistPosition >= 1) {
      throw new BusinessLogicError('Waist position must be between 0 and 1 (exclusive)', {
        code: 'INVALID_CONSTRUCTOR_PARAMS',
        context: { waistPosition, tipRatio },
      });
    }

    if (tipRatio <= 0 || tipRatio >= 1) {
      throw new BusinessLogicError('Tip ratio must be between 0 and 1 (exclusive)', {
        code: 'INVALID_CONSTRUCTOR_PARAMS',
        context: { waistPosition, tipRatio },
      });
    }

    if (waistPosition + tipRatio >= 1) {
      throw new BusinessLogicError(
        'Sum of waist position and tip ratio must be less than 1 (front section must have positive length)',
        {
          code: 'INVALID_CONSTRUCTOR_PARAMS',
          context: {
            waistPosition,
            tipRatio,
            sum: waistPosition + tipRatio,
            frontRatio: 1 - waistPosition - tipRatio,
          },
        }
      );
    }
  }

  /**
   * Calculates all derived fields for a ski specification.
   *
   * Algorithm (v2.0.0):
   * - Surface area: Integral-based calculation using section-specific geometric models
   * - Relative weight: Weight per unit area (g/cm²) for size-normalized comparison
   *
   * The ski is divided into three sections based on configurable ratios:
   * - Back section: From tail to waist (default: 43% of length)
   * - Front section: From waist to tip start (default: 42% of length)
   * - Tip section: Rounded tip end (default: 15% of length)
   *
   * @param dimensions - Ski dimensions (length in cm, widths in mm, radius in m)
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
      // Step 1: Calculate section lengths from total length
      this.calculateSectionLengths(dimensions.length),
      // Step 3: Convert widths from mm to cm
      Effect.map((sections) => {
        const widths_cm: WidthsCm = {
          tip: dimensions.tip / 10,
          waist: dimensions.waist / 10,
          tail: dimensions.tail / 10,
        };
        return { sections, widths_cm };
      }),
      // Step 4: Calculate total surface area using integral formulas
      Effect.flatMap(this.calculateSurfaceArea),
      // Step 6: Calculate relative weight and round results to 2 decimal places
      Effect.map((surface_area) => {
        const roundedSurfaceArea = Math.round(surface_area * 100) / 100;
        const relativeWeight = weight / roundedSurfaceArea;
        const roundedRelativeWeight = Math.round(relativeWeight * 100) / 100;

        return {
          surface_area: roundedSurfaceArea,
          relative_weight: roundedRelativeWeight,
        };
      })
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
    return '2.0.0';
  }

  /**
   * Calculates the length of each ski section based on total length and configured ratios.
   *
   * @param totalLength - Total ski length in cm
   * @returns Section lengths in cm
   * @private
   */
  private calculateSectionLengths(totalLength: number): Effect.Effect<SectionLengths, BusinessLogicError> {
    return Effect.sync(() => {
      const l_back = this.waistPosition * totalLength;
      const l_tip = this.tipRatio * totalLength;
      const l_front = totalLength - l_back - l_tip;
      return { l_back, l_front, l_tip };
    }).pipe(Effect.flatMap(this.validateSections));
  }

  /**
   * Validates that all section lengths are positive and suitable for calculation.
   *
   * Ensures:
   * - All section lengths are positive
   * - Tip section length allows safe logarithmic calculation (l_tip + 1 > 1)
   *
   * @param sections - Section lengths to validate
   * @returns Effect that succeeds with validated sections or fails with BusinessLogicError
   * @private
   */
  private validateSections(sections: SectionLengths): Effect.Effect<SectionLengths, BusinessLogicError> {
    const { l_back, l_front, l_tip } = sections;

    // Check all sections are positive
    if (l_back <= 0 || l_front <= 0 || l_tip <= 0) {
      return Effect.fail(
        new BusinessLogicError('All section lengths must be positive', {
          code: 'INVALID_SECTION_LENGTHS',
          context: { l_back, l_front, l_tip },
        })
      );
    }

    // Check tip section is suitable for logarithmic calculation
    // We need l_tip + 1 > 1, which means l_tip > 0 (already checked above)
    // But we also need to ensure it's not too close to zero to avoid numerical issues
    if (l_tip < 0.1) {
      return Effect.fail(
        new BusinessLogicError('Tip section length too small for accurate calculation (minimum 0.1 cm)', {
          code: 'INVALID_TIP_LENGTH',
          context: { l_tip, minimum: 0.1 },
        })
      );
    }
    return Effect.succeed(sections);
  }

  /**
   * Calculates the area of the back section (tail to waist) using quadratic integral.
   *
   * Formula: A_back = l_back * (w_tail / 6 + w_waist / 3)
   *
   * Derived from integral: ∫[0 to l_back] f_back(x) dx
   * where f_back(x) = ((w_tail - w_waist) / (2 * l_back²)) * x² + w_waist / 2
   *
   * @param l_back - Length of back section in cm
   * @param w_tail_cm - Tail width in cm
   * @param w_waist_cm - Waist width in cm
   * @returns Area of back section in cm²
   * @private
   */
  private calculateBackSectionArea(l_back: number, w_tail_cm: number, w_waist_cm: number): number {
    return ((w_tail_cm - w_waist_cm) * Math.pow(l_back, 3)) / (6 * Math.pow(l_back, 2)) + (w_waist_cm * l_back) / 2;
  }

  /**
   * Calculates the area of the front section (waist to tip start) using quadratic integral.
   *
   * Formula: A_front = l_front * (w_tip / 6 + w_waist / 3)
   *
   * Derived from integral: ∫[0 to l_front] f_front(x) dx
   * where f_front(x) = ((w_tip - w_waist) / (2 * l_front²)) * x² + w_waist / 2
   *
   * @param l_front - Length of front section in cm
   * @param w_tip_cm - Tip width in cm
   * @param w_waist_cm - Waist width in cm
   * @returns Area of front section in cm²
   * @private
   */
  private calculateFrontSectionArea(l_front: number, w_tip_cm: number, w_waist_cm: number): number {
    return ((w_tip_cm - w_waist_cm) * Math.pow(l_front, 3)) / (6 * Math.pow(l_front, 2)) + (w_waist_cm * l_front) / 2;
  }

  /**
   * Calculates the area of the tip section (rounded end) using logarithmic integral.
   *
   * @param l_tip - Length of tip section in cm
   * @param w_tip_cm - Tip width in cm
   * @returns Effect that succeeds with area of tip section in cm² or fails with BusinessLogicError
   * @private
   */
  private calculateTipSectionArea(l_tip: number, w_tip_cm: number): Effect.Effect<number, BusinessLogicError> {
    return Effect.succeed(Math.log(l_tip + 1)).pipe(
      Effect.flatMap(this.validateLogarithmDenominator),
      Effect.map((lnDenominator) => {
        const coefficient = w_tip_cm / (2 * lnDenominator); //p
        const integralValue = (l_tip + 1) * lnDenominator - l_tip;
        const area = coefficient * integralValue;
        return area;
      })
    );
  }

  private validateLogarithmDenominator(lnDenominator: number): Effect.Effect<number, BusinessLogicError> {
    return Effect.if(Math.abs(lnDenominator) < 1e-10, {
      onTrue: () => Effect.succeed(lnDenominator),
      onFalse: () =>
        Effect.fail(
          new BusinessLogicError('Logarithm denominator too close to zero in tip section calculation', {
            code: 'INVALID_TIP_CALCULATION',
            context: { lnDenominator },
          })
        ),
    });
  }

  /**
   * Calculates the total surface area by summing all three section areas and multiplying by 2.
   *
   * The factor of 2 accounts for both sides of the ski (top and bottom surfaces).
   *
   * @param sections - Section lengths in cm
   * @param widths_cm - Width dimensions in cm
   * @returns Effect that succeeds with total surface area in cm² or fails with BusinessLogicError
   * @private
   */
  private calculateSurfaceArea({
    sections,
    widths_cm,
  }: {
    sections: SectionLengths;
    widths_cm: WidthsCm;
  }): Effect.Effect<number, BusinessLogicError> {
    const { l_back, l_front, l_tip } = sections;
    const { tip, waist, tail } = widths_cm;

    // Calculate areas of each section
    const backArea = this.calculateBackSectionArea(l_back, tail, waist);
    const frontArea = this.calculateFrontSectionArea(l_front, tip, waist);

    // Tip area calculation can fail, so we use Effect pipeline
    return pipe(
      this.calculateTipSectionArea(l_tip, tip),
      Effect.map((tipArea) => {
        // Sum all section areas and multiply by 2 (both sides of ski)
        const totalArea = 2 * (backArea + frontArea + tipArea);
        return totalArea;
      }),
      Effect.flatMap((surface_area) =>
        Effect.if(surface_area > 0, {
          onTrue: () => Effect.succeed(surface_area),
          onFalse: () =>
            Effect.fail(
              new BusinessLogicError('Surface area cannot be zero or negative', {
                code: 'INVALID_SURFACE_AREA',
                context: { surface_area, widths_cm, sections },
              })
            ),
        })
      )
    );
  }
}
