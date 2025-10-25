/**
 * Database Entity Type Definitions
 *
 * This file contains all database entity types derived from the Supabase
 * database schema. These types represent the raw database tables and are
 * used as the foundation for API DTOs and command models.
 */

import type { Tables, TablesInsert, TablesUpdate } from '@/db/database.types';

// ============================================================================
// Ski Specification Entity Types
// ============================================================================

/**
 * Base ski specification entity from database
 */
export type SkiSpecEntity = Tables<'ski_specs'>;
export type SkiSpecInsert = TablesInsert<'ski_specs'>;
export type SkiSpecUpdate = TablesUpdate<'ski_specs'>;

// ============================================================================
// Ski Spec Note Entity Types
// ============================================================================

/**
 * Base ski spec note entity from database
 */
export type SkiSpecNoteEntity = Tables<'ski_spec_notes'>;
export type SkiSpecNoteInsert = TablesInsert<'ski_spec_notes'>;
export type SkiSpecNoteUpdate = TablesUpdate<'ski_spec_notes'>;
