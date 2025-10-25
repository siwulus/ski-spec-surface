import { describe, it, expect } from 'vitest';
import { CreateSkiSpecCommandSchema, CreateNoteCommandSchema } from './api.types';

describe('CreateSkiSpecCommandSchema', () => {
  const validSpec = {
    name: 'Test Ski',
    description: 'A great ski for all conditions.',
    length: 180,
    tip: 130,
    waist: 100,
    tail: 120,
    radius: 20.5,
    weight: 1500,
  };

  it('should pass with valid data', () => {
    expect(() => CreateSkiSpecCommandSchema.parse(validSpec)).not.toThrow();
  });

  it('should allow nullable description', () => {
    const specWithNullDescription = { ...validSpec, description: null };
    expect(() => CreateSkiSpecCommandSchema.parse(specWithNullDescription)).not.toThrow();
  });

  // Name validation
  it('should fail if name is empty', () => {
    const specWithEmptyName = { ...validSpec, name: '' };
    const result = CreateSkiSpecCommandSchema.safeParse(specWithEmptyName);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name']);
      expect(result.error.issues[0].message).toBe('Name is required');
    }
  });

  it('should fail if name is too long', () => {
    const specWithLongName = { ...validSpec, name: 'a'.repeat(256) };
    const result = CreateSkiSpecCommandSchema.safeParse(specWithLongName);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name']);
    }
  });

  // Description validation
  it('should fail if description is too long', () => {
    const specWithLongDescription = { ...validSpec, description: 'a'.repeat(2001) };
    const result = CreateSkiSpecCommandSchema.safeParse(specWithLongDescription);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['description']);
    }
  });

  // Length validation
  it('should fail if length is out of range [100, 250]', () => {
    const specTooShort = { ...validSpec, length: 99 };
    const specTooLong = { ...validSpec, length: 251 };
    expect(() => CreateSkiSpecCommandSchema.parse(specTooShort)).toThrow('Length must be between 100 and 250 cm');
    expect(() => CreateSkiSpecCommandSchema.parse(specTooLong)).toThrow('Length must be between 100 and 250 cm');
  });

  // Widths validation
  it('should fail if tip width is out of range [50, 250]', () => {
    const specWithSmallTip = { ...validSpec, tip: 49 };
    const specWithLargeTip = { ...validSpec, tip: 251 };
    expect(() => CreateSkiSpecCommandSchema.parse(specWithSmallTip)).toThrow('Tip width must be between 50 and 250 mm');
    expect(() => CreateSkiSpecCommandSchema.parse(specWithLargeTip)).toThrow('Tip width must be between 50 and 250 mm');
  });

  it('should fail if waist width is out of range [50, 250]', () => {
    const specWithSmallWaist = { ...validSpec, waist: 49 };
    const specWithLargeWaist = { ...validSpec, waist: 251 };
    expect(() => CreateSkiSpecCommandSchema.parse(specWithSmallWaist)).toThrow(
      'Waist width must be between 50 and 250 mm'
    );
    expect(() => CreateSkiSpecCommandSchema.parse(specWithLargeWaist)).toThrow(
      'Waist width must be between 50 and 250 mm'
    );
  });

  it('should fail if tail width is out of range [50, 250]', () => {
    const specWithSmallTail = { ...validSpec, tail: 49 };
    const specWithLargeTail = { ...validSpec, tail: 251 };
    expect(() => CreateSkiSpecCommandSchema.parse(specWithSmallTail)).toThrow(
      'Tail width must be between 50 and 250 mm'
    );
    expect(() => CreateSkiSpecCommandSchema.parse(specWithLargeTail)).toThrow(
      'Tail width must be between 50 and 250 mm'
    );
  });

  it('should fail if waist is wider than tip or tail', () => {
    const specWithWideWaist1 = { ...validSpec, waist: 131 }; // waist > tip
    const specWithWideWaist2 = { ...validSpec, waist: 121 }; // waist > tail
    const result1 = CreateSkiSpecCommandSchema.safeParse(specWithWideWaist1);
    const result2 = CreateSkiSpecCommandSchema.safeParse(specWithWideWaist2);

    expect(result1.success).toBe(false);
    if (!result1.success) {
      expect(result1.error.issues[0].message).toBe('Waist must be less than or equal to both tip and tail widths');
      expect(result1.error.issues[0].path).toEqual(['waist']);
    }

    expect(result2.success).toBe(false);
    if (!result2.success) {
      expect(result2.error.issues[0].message).toBe('Waist must be less than or equal to both tip and tail widths');
      expect(result2.error.issues[0].path).toEqual(['waist']);
    }
  });

  // Radius validation
  it('should fail if radius is out of range [1, 30]', () => {
    const specWithSmallRadius = { ...validSpec, radius: 0.9 };
    const specWithLargeRadius = { ...validSpec, radius: 30.1 };
    expect(() => CreateSkiSpecCommandSchema.parse(specWithSmallRadius)).toThrow('Radius must be between 1 and 30 m');
    expect(() => CreateSkiSpecCommandSchema.parse(specWithLargeRadius)).toThrow('Radius must be between 1 and 30 m');
  });

  it('should fail if radius has more than 2 decimal places', () => {
    const specWithInvalidRadius = { ...validSpec, radius: 15.123 };
    expect(() => CreateSkiSpecCommandSchema.parse(specWithInvalidRadius)).toThrow(
      'Radius must have at most 2 decimal places'
    );
  });

  // Weight validation
  it('should fail if weight is out of range [500, 3000]', () => {
    const specWithSmallWeight = { ...validSpec, weight: 499 };
    const specWithLargeWeight = { ...validSpec, weight: 3001 };
    expect(() => CreateSkiSpecCommandSchema.parse(specWithSmallWeight)).toThrow(
      'Weight must be between 500 and 3000 g'
    );
    expect(() => CreateSkiSpecCommandSchema.parse(specWithLargeWeight)).toThrow(
      'Weight must be between 500 and 3000 g'
    );
  });

  // Type validation
  it('should fail for non-integer values where required', () => {
    const nonIntFields = ['length', 'tip', 'waist', 'tail', 'weight'];
    nonIntFields.forEach((field) => {
      const specWithFloat = { ...validSpec, [field]: 150.5 };
      const result = CreateSkiSpecCommandSchema.safeParse(specWithFloat);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual([field]);
        expect(result.error.issues[0].message).toContain('must be an integer');
      }
    });
  });
});

describe('CreateNoteCommandSchema', () => {
  it('should pass with valid content', () => {
    const validNote = { content: 'This is a valid note.' };
    expect(() => CreateNoteCommandSchema.parse(validNote)).not.toThrow();
  });

  it('should fail if content is empty', () => {
    const noteWithEmptyContent = { content: '' };
    const result = CreateNoteCommandSchema.safeParse(noteWithEmptyContent);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['content']);
      expect(result.error.issues[0].message).toBe('Content is required');
    }
  });

  it('should fail if content is too long', () => {
    const noteWithLongContent = { content: 'a'.repeat(2001) };
    const result = CreateNoteCommandSchema.safeParse(noteWithLongContent);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['content']);
      expect(result.error.issues[0].message).toBe('Content must be between 1 and 2000 characters');
    }
  });
});
