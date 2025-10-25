/**
 * Shared test utilities and fixtures for SkiSpecService tests
 */

import type {
  CreateSkiSpecCommand,
  UpdateSkiSpecCommand,
  CreateNoteCommand,
  UpdateNoteCommand,
} from '@/types/api.types';

// ============================================================================
// Test IDs
// ============================================================================

export const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
export const TEST_SPEC_ID = '660e8400-e29b-41d4-a716-446655440001';
export const TEST_NOTE_ID = '770e8400-e29b-41d4-a716-446655440002';
export const TEST_SPEC_ID_2 = '880e8400-e29b-41d4-a716-446655440003';

// ============================================================================
// Ski Spec Fixtures
// ============================================================================

export const createValidSkiSpecCommand = (): CreateSkiSpecCommand => ({
  name: 'Test Ski Model',
  description: 'A test ski specification',
  length: 180,
  tip: 130,
  waist: 100,
  tail: 120,
  radius: 18.5,
  weight: 1500,
});

export const createSkiSpecEntity = () => ({
  id: TEST_SPEC_ID,
  user_id: TEST_USER_ID,
  name: 'Test Ski Model',
  description: 'A test ski specification',
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

export const createUpdateSkiSpecCommand = (): UpdateSkiSpecCommand => ({
  name: 'Updated Ski Model',
  description: 'Updated description',
  length: 185,
  tip: 135,
  waist: 105,
  tail: 125,
  radius: 19.0,
  weight: 1600,
});

// ============================================================================
// Note Fixtures
// ============================================================================

export const createValidNoteCommand = (): CreateNoteCommand => ({
  content: 'Test note content',
});

export const createNoteEntity = () => ({
  id: TEST_NOTE_ID,
  ski_spec_id: TEST_SPEC_ID,
  content: 'Test note content',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
});

export const createUpdateNoteCommand = (): UpdateNoteCommand => ({
  content: 'Updated note content',
});

// ============================================================================
// Database Error Fixtures
// ============================================================================

export const createNotFoundError = () => ({
  code: 'PGRST116',
  message: 'Not found',
});

export const createDuplicateError = () => ({
  code: '23505',
  message: 'Unique constraint violation',
});

export const createConnectionError = () => ({
  code: 'ECONNREFUSED',
  message: 'Database connection error',
});

export const createTimeoutError = () => ({
  code: 'TIMEOUT',
  message: 'Query timeout',
});
