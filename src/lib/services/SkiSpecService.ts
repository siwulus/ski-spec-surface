import { Effect, pipe } from 'effect';
import type { SupabaseClient } from '@/db/supabase.client';
import type { Database } from '@/db/database.types';
import type {
  CreateSkiSpecCommand,
  SkiSpecDTO,
  ListSkiSpecsQuery,
  UpdateSkiSpecCommand,
  CreateNoteCommand,
  UpdateNoteCommand,
  NoteDTO,
  ListNotesQuery,
  SkiSpecComparisonDTO,
} from '@/types/api.types';
import {
  NotFoundError,
  ConflictError,
  DatabaseError,
  BusinessLogicError,
  type SkiSpecError,
} from '@/types/error.types';

/**
 * Service class for managing ski specifications and notes.
 *
 * This service encapsulates all business logic related to ski specifications,
 * including CRUD operations, calculations, and note management.
 */
export class SkiSpecService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Calculates the surface area of a ski based on its dimensions.
   *
   * Algorithm (v1.0.0):
   * Uses a simplified trapezoidal approximation where the ski is treated as
   * a trapezoid with average width calculated from tip, waist, and tail dimensions.
   *
   * @param dimensions - Ski dimensions
   * @returns Surface area in cm²
   */
  calculateSurfaceArea(dimensions: {
    length: number;
    tip: number;
    waist: number;
    tail: number;
    radius: number;
  }): number {
    // Calculate average width across tip, waist, and tail
    const avgWidth = (dimensions.tip + dimensions.waist + dimensions.tail) / 3;

    // Convert mm to cm and calculate surface area
    const surfaceArea = (dimensions.length * avgWidth) / 10; // length in cm * width in mm / 10 = cm²

    // Round to 2 decimal places
    return Math.round(surfaceArea * 100) / 100;
  }

  /**
   * Calculates the relative weight (weight per unit area).
   *
   * This metric helps compare skis of different sizes by normalizing
   * weight against surface area.
   *
   * @param weight - Ski weight in grams
   * @param surfaceArea - Ski surface area in cm²
   * @returns Effect that succeeds with relative weight in g/cm² or fails with BusinessLogicError
   */
  calculateRelativeWeight(weight: number, surfaceArea: number): Effect.Effect<number, BusinessLogicError> {
    if (surfaceArea === 0) {
      return Effect.fail(
        new BusinessLogicError('Surface area cannot be zero', {
          code: 'INVALID_SURFACE_AREA',
          context: { weight, surfaceArea },
        })
      );
    }

    const relativeWeight = weight / surfaceArea;

    // Round to 2 decimal places
    const rounded = Math.round(relativeWeight * 100) / 100;

    return Effect.succeed(rounded);
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

  /**
   * Creates a new ski specification in the database.
   *
   * This function:
   * 1. Calculates derived fields (surface_area, relative_weight)
   * 2. Inserts the specification into the database
   * 3. Returns the created specification as a DTO with notes_count
   *
   * @param userId - ID of the authenticated user
   * @param command - Validated ski specification data
   * @returns Effect that succeeds with created ski specification or fails with SkiSpecError
   */
  createSkiSpec(userId: string, command: CreateSkiSpecCommand): Effect.Effect<SkiSpecDTO, SkiSpecError> {
    return pipe(
      // Step 1: Calculate surface area (pure, always succeeds)
      Effect.succeed(
        this.calculateSurfaceArea({
          length: command.length,
          tip: command.tip,
          waist: command.waist,
          tail: command.tail,
          radius: command.radius,
        })
      ),

      // Step 2: Calculate relative weight (can fail)
      Effect.flatMap((surfaceArea) =>
        pipe(
          this.calculateRelativeWeight(command.weight, surfaceArea),
          Effect.map((relativeWeight) => ({ surfaceArea, relativeWeight }))
        )
      ),

      // Step 3: Prepare insert data
      Effect.map(({ surfaceArea, relativeWeight }) => ({
        user_id: userId,
        name: command.name.trim(),
        description: command.description?.trim() || null,
        length: command.length,
        tip: command.tip,
        waist: command.waist,
        tail: command.tail,
        radius: command.radius,
        weight: command.weight,
        surface_area: surfaceArea,
        relative_weight: relativeWeight,
        algorithm_version: this.getCurrentAlgorithmVersion(),
      })),

      // Step 4: Insert into database
      Effect.flatMap((insertData) =>
        Effect.tryPromise({
          try: () => this.supabase.from('ski_specs').insert(insertData).select().single(),
          catch: (error) =>
            this.handleDatabaseError(error, {
              operation: 'createSkiSpec',
              table: 'ski_specs',
              userId,
            }),
        })
      ),

      // Step 5: Validate response data
      Effect.flatMap(({ data, error }) => {
        if (error) {
          return Effect.fail(
            this.handleDatabaseError(error, {
              operation: 'createSkiSpec',
              table: 'ski_specs',
              userId,
            })
          );
        }

        if (!data) {
          return Effect.fail(
            new DatabaseError('Failed to create ski specification', {
              operation: 'createSkiSpec',
              table: 'ski_specs',
            })
          );
        }

        return Effect.succeed(data);
      }),

      // Step 6: Add notes_count (always 0 for new specs)
      Effect.map((data) => ({ ...data, notes_count: 0 }))
    );
  }

  /**
   * Retrieves a ski specification by ID for a specific user.
   *
   * This function:
   * 1. Queries the ski_specs table with filters for id and user_id
   * 2. Counts associated notes from ski_spec_notes table
   * 3. Returns the specification as a DTO with notes_count
   * 4. Returns NotFoundError if not found or user doesn't own the specification
   *
   * @param userId - ID of the authenticated user
   * @param specId - UUID of the ski specification to retrieve
   * @returns Effect that succeeds with ski specification or fails with SkiSpecError
   */
  getSkiSpec(userId: string, specId: string): Effect.Effect<SkiSpecDTO, SkiSpecError> {
    return pipe(
      // Step 1: Query ski spec with ownership validation
      Effect.tryPromise({
        try: () => this.supabase.from('ski_specs').select('*').eq('id', specId).eq('user_id', userId).single(),
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'getSkiSpec',
            table: 'ski_specs',
            userId,
            resourceId: specId,
          }),
      }),

      // Step 2: Handle PGRST116 (not found) error
      Effect.flatMap(({ data, error }) => {
        if (error?.code === 'PGRST116') {
          return Effect.fail(
            new NotFoundError('Ski specification not found', {
              resourceType: 'ski_spec',
              resourceId: specId,
            })
          );
        }

        if (error) {
          return Effect.fail(
            this.handleDatabaseError(error, {
              operation: 'getSkiSpec',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            })
          );
        }

        return Effect.succeed(data);
      }),

      // Step 3: Get notes count
      Effect.flatMap((spec) =>
        pipe(
          this.getNotesCount(specId),
          Effect.map((notesCount) => ({
            ...spec,
            notes_count: notesCount,
          }))
        )
      )
    );
  }

  /**
   * Deletes a ski specification and all associated notes (cascade).
   *
   * This function:
   * 1. Verifies the specification exists and belongs to the user
   * 2. Deletes the specification from the database
   * 3. Notes are automatically deleted via cascade constraint
   *
   * Security: Returns same error for "not found" and "unauthorized" to prevent
   * information disclosure (IDOR prevention).
   *
   * @param userId - ID of the authenticated user
   * @param specId - ID of the ski specification to delete
   * @returns Effect that succeeds with void or fails with SkiSpecError
   */
  deleteSkiSpec(userId: string, specId: string): Effect.Effect<void, SkiSpecError> {
    return pipe(
      Effect.tryPromise({
        try: () => this.supabase.from('ski_specs').delete({ count: 'exact' }).eq('id', specId).eq('user_id', userId),
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'deleteSkiSpec',
            table: 'ski_specs',
            userId,
            resourceId: specId,
          }),
      }),

      Effect.flatMap(({ error, count }) => {
        if (error) {
          return Effect.fail(
            this.handleDatabaseError(error, {
              operation: 'deleteSkiSpec',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            })
          );
        }

        if (count === 0 || count === null) {
          return Effect.fail(
            new NotFoundError('Ski specification not found', {
              resourceType: 'ski_spec',
              resourceId: specId,
            })
          );
        }

        return Effect.succeed(undefined);
      })
    );
  }

  /**
   * Retrieves a paginated, sorted, and searchable list of ski specifications for a user.
   *
   * This function:
   * 1. Filters specifications by user_id
   * 2. Applies optional search filter on name and description
   * 3. Applies sorting based on query parameters
   * 4. Applies pagination with offset and limit
   * 5. Counts total matching records for pagination metadata
   * 6. Aggregates notes count for each specification
   *
   * @param userId - ID of the authenticated user
   * @param query - Validated query parameters (page, limit, sort_by, sort_order, search)
   * @returns Effect that succeeds with data and total count or fails with SkiSpecError
   */
  listSkiSpecs(
    userId: string,
    query: ListSkiSpecsQuery
  ): Effect.Effect<{ data: SkiSpecDTO[]; total: number }, SkiSpecError> {
    return pipe(
      // Step 1: Build and execute query
      Effect.tryPromise({
        try: async () => {
          let dbQuery = this.supabase.from('ski_specs').select('*', { count: 'exact' }).eq('user_id', userId);

          // Apply search filter
          if (query.search) {
            const searchTerm = query.search.trim();
            if (searchTerm) {
              dbQuery = dbQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
            }
          }

          // Apply sorting
          dbQuery = dbQuery.order(query.sort_by, {
            ascending: query.sort_order === 'asc',
          });

          // Apply pagination
          const offset = (query.page - 1) * query.limit;
          dbQuery = dbQuery.range(offset, offset + query.limit - 1);

          return dbQuery;
        },
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'listSkiSpecs',
            table: 'ski_specs',
            userId,
          }),
      }),

      // Step 2: Validate response
      Effect.flatMap(({ data, error, count }) => {
        if (error) {
          return Effect.fail(
            this.handleDatabaseError(error, {
              operation: 'listSkiSpecs',
              table: 'ski_specs',
              userId,
            })
          );
        }

        return Effect.succeed({ data: data || [], count: count ?? 0 });
      }),

      // Step 3: Attach notes count to each spec (parallel)
      Effect.flatMap(({ data, count }) =>
        pipe(
          Effect.all(
            data.map((spec) =>
              pipe(
                this.getNotesCount(spec.id),
                Effect.map((notesCount) => ({
                  ...spec,
                  notes_count: notesCount,
                }))
              )
            )
          ),
          Effect.map((specsWithNotes) => ({
            data: specsWithNotes,
            total: count,
          }))
        )
      )
    );
  }

  /**
   * Updates an existing ski specification.
   *
   * This function:
   * 1. Verifies the specification exists and user owns it
   * 2. Checks name uniqueness (excluding current record if name changed)
   * 3. Recalculates derived fields (surface_area, relative_weight)
   * 4. Updates the specification in the database
   * 5. Returns updated specification with notes count
   *
   * @param userId - ID of the authenticated user
   * @param specId - UUID of the ski specification to update
   * @param command - Validated ski specification update data
   * @returns Effect that succeeds with updated ski specification or fails with SkiSpecError
   */
  updateSkiSpec(
    userId: string,
    specId: string,
    command: UpdateSkiSpecCommand
  ): Effect.Effect<SkiSpecDTO, SkiSpecError> {
    return pipe(
      // Step 1: Verify spec exists and user owns it
      this.verifySpecOwnership(userId, specId),

      // Step 2: Check name uniqueness if name changed
      Effect.flatMap((existing) =>
        pipe(
          this.checkNameUniqueness(userId, specId, command.name, existing.name),
          Effect.map(() => existing)
        )
      ),

      // Step 3: Calculate derived fields
      Effect.flatMap(() =>
        pipe(
          Effect.succeed(
            this.calculateSurfaceArea({
              length: command.length,
              tip: command.tip,
              waist: command.waist,
              tail: command.tail,
              radius: command.radius,
            })
          ),
          Effect.flatMap((surfaceArea) =>
            pipe(
              this.calculateRelativeWeight(command.weight, surfaceArea),
              Effect.map((relativeWeight) => ({ surfaceArea, relativeWeight }))
            )
          )
        )
      ),

      // Step 4: Prepare update data
      Effect.map(({ surfaceArea, relativeWeight }) => ({
        name: command.name.trim(),
        description: command.description?.trim() || null,
        length: command.length,
        tip: command.tip,
        waist: command.waist,
        tail: command.tail,
        radius: command.radius,
        weight: command.weight,
        surface_area: surfaceArea,
        relative_weight: relativeWeight,
        algorithm_version: this.getCurrentAlgorithmVersion(),
      })),

      // Step 5: Update in database
      Effect.flatMap((updateData) =>
        Effect.tryPromise({
          try: () =>
            this.supabase.from('ski_specs').update(updateData).eq('id', specId).eq('user_id', userId).select().single(),
          catch: (error) =>
            this.handleDatabaseError(error, {
              operation: 'updateSkiSpec',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            }),
        })
      ),

      // Step 6: Validate response
      Effect.flatMap(({ data, error }) => {
        if (error) {
          return Effect.fail(
            this.handleDatabaseError(error, {
              operation: 'updateSkiSpec',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            })
          );
        }

        if (!data) {
          return Effect.fail(
            new DatabaseError('Update failed', {
              operation: 'updateSkiSpec',
              table: 'ski_specs',
            })
          );
        }

        return Effect.succeed(data);
      }),

      // Step 7: Get notes count
      Effect.flatMap((data) =>
        pipe(
          this.getNotesCount(specId),
          Effect.map((notesCount) => ({
            ...data,
            notes_count: notesCount,
          }))
        )
      )
    );
  }

  /**
   * Compares multiple ski specifications for the authenticated user.
   *
   * This function:
   * 1. Verifies all specifications exist and user owns them (parallel verification)
   * 2. Transforms entities to comparison DTOs (excluding metadata)
   * 3. Returns specifications in the same order as the input IDs
   *
   * Security: Verifies ownership of each specification to prevent IDOR attacks.
   * Returns generic "not found" error if any spec doesn't exist or user doesn't own it.
   *
   * @param userId - ID of the authenticated user
   * @param specIds - Array of UUIDs (2-4) of ski specifications to compare
   * @returns Effect that succeeds with array of comparison DTOs or fails with SkiSpecError
   */
  compareSkiSpecs(userId: string, specIds: string[]): Effect.Effect<SkiSpecComparisonDTO[], SkiSpecError> {
    return pipe(
      // Step 1: Verify all specs exist and user owns them (parallel)
      Effect.all(specIds.map((specId) => this.verifySpecOwnership(userId, specId))),

      // Step 2: Transform entities to comparison DTOs
      Effect.map((specs) =>
        specs.map((spec) => ({
          id: spec.id,
          name: spec.name,
          description: spec.description,
          length: spec.length,
          tip: spec.tip,
          waist: spec.waist,
          tail: spec.tail,
          radius: spec.radius,
          weight: spec.weight,
          surface_area: spec.surface_area,
          relative_weight: spec.relative_weight,
        }))
      )
    );
  }

  /**
   * Creates a new note for a ski specification.
   *
   * This function:
   * 1. Verifies the ski specification exists and user owns it
   * 2. Inserts the note into the database
   * 3. Returns the created note as a DTO
   *
   * Security: Verifies specification ownership before creation to prevent IDOR attacks.
   * Returns "Specification not found" for both non-existent specs and unauthorized access
   * to prevent information disclosure.
   *
   * @param userId - ID of the authenticated user
   * @param specId - UUID of the ski specification
   * @param command - Validated note creation data
   * @returns Effect that succeeds with created note or fails with SkiSpecError
   */
  createNote(userId: string, specId: string, command: CreateNoteCommand): Effect.Effect<NoteDTO, SkiSpecError> {
    return pipe(
      // Step 1: Verify specification exists and user owns it
      Effect.tryPromise({
        try: () => this.supabase.from('ski_specs').select('id').eq('id', specId).eq('user_id', userId).single(),
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'createNote',
            table: 'ski_specs',
            userId,
            resourceId: specId,
          }),
      }),

      // Step 2: Validate spec exists
      Effect.flatMap(({ data: spec, error: specError }) => {
        if (specError?.code === 'PGRST116' || !spec) {
          return Effect.fail(
            new NotFoundError('Ski specification not found', {
              resourceType: 'ski_spec',
              resourceId: specId,
            })
          );
        }

        if (specError) {
          return Effect.fail(
            this.handleDatabaseError(specError, {
              operation: 'createNote',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            })
          );
        }

        return Effect.succeed(spec);
      }),

      // Step 3: Prepare and insert note data
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            this.supabase
              .from('ski_spec_notes')
              .insert({
                ski_spec_id: specId,
                content: command.content.trim(),
              })
              .select()
              .single(),
          catch: (error) =>
            this.handleDatabaseError(error, {
              operation: 'createNote',
              table: 'ski_spec_notes',
              userId,
              resourceId: specId,
            }),
        })
      ),

      // Step 4: Validate response
      Effect.flatMap(({ data, error }) => {
        if (error) {
          return Effect.fail(
            this.handleDatabaseError(error, {
              operation: 'createNote',
              table: 'ski_spec_notes',
              userId,
              resourceId: specId,
            })
          );
        }

        if (!data) {
          return Effect.fail(
            new DatabaseError('Failed to create note', {
              operation: 'createNote',
              table: 'ski_spec_notes',
            })
          );
        }

        return Effect.succeed(data as NoteDTO);
      })
    );
  }

  /**
   * Retrieves a specific note by ID for a given ski specification.
   *
   * This function:
   * 1. Verifies the ski specification exists and user owns it
   * 2. Verifies the note exists and belongs to the specification
   * 3. Returns the note as a DTO
   *
   * Security: Two-level verification prevents unauthorized access:
   * - First checks specification ownership (prevents access to other users' specs)
   * - Then checks note association (prevents cross-spec note access)
   * Returns generic "not found" error for all failure cases to prevent information disclosure.
   *
   * @param userId - ID of the authenticated user
   * @param specId - UUID of the ski specification that owns the note
   * @param noteId - UUID of the note to retrieve
   * @returns Effect that succeeds with note data or fails with SkiSpecError
   */
  getNoteById(userId: string, specId: string, noteId: string): Effect.Effect<NoteDTO, SkiSpecError> {
    return pipe(
      // Step 1: Verify ski specification exists and user owns it
      Effect.tryPromise({
        try: () => this.supabase.from('ski_specs').select('id').eq('id', specId).eq('user_id', userId).single(),
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'getNoteById',
            table: 'ski_specs',
            userId,
            resourceId: specId,
          }),
      }),

      // Step 2: Validate spec exists
      Effect.flatMap(({ data: spec, error: specError }) => {
        if (specError?.code === 'PGRST116' || !spec) {
          return Effect.fail(
            new NotFoundError('Note not found', {
              resourceType: 'note',
              resourceId: noteId,
            })
          );
        }

        if (specError) {
          return Effect.fail(
            this.handleDatabaseError(specError, {
              operation: 'getNoteById',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            })
          );
        }

        return Effect.succeed(spec);
      }),

      // Step 3: Query note with verification it belongs to the specification
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            this.supabase.from('ski_spec_notes').select('*').eq('id', noteId).eq('ski_spec_id', specId).single(),
          catch: (error) =>
            this.handleDatabaseError(error, {
              operation: 'getNoteById',
              table: 'ski_spec_notes',
              userId,
              resourceId: noteId,
            }),
        })
      ),

      // Step 4: Validate note exists
      Effect.flatMap(({ data: note, error: noteError }) => {
        if (noteError?.code === 'PGRST116' || !note) {
          return Effect.fail(
            new NotFoundError('Note not found', {
              resourceType: 'note',
              resourceId: noteId,
            })
          );
        }

        if (noteError) {
          return Effect.fail(
            this.handleDatabaseError(noteError, {
              operation: 'getNoteById',
              table: 'ski_spec_notes',
              userId,
              resourceId: noteId,
            })
          );
        }

        return Effect.succeed(note as NoteDTO);
      })
    );
  }

  /**
   * Updates an existing note for a ski specification.
   *
   * This function:
   * 1. Verifies the ski specification exists and user owns it
   * 2. Updates the note content and timestamp
   * 3. Returns the updated note
   *
   * Security: Two-level verification prevents unauthorized access:
   * - First checks specification ownership (prevents access to other users' specs)
   * - Then updates only if note belongs to the specification
   * Returns generic "not found" error for all failure cases to prevent information disclosure.
   *
   * @param userId - ID of the authenticated user
   * @param specId - UUID of the ski specification that owns the note
   * @param noteId - UUID of the note to update
   * @param command - Validated note update data (content)
   * @returns Effect that succeeds with updated note or fails with SkiSpecError
   */
  updateNote(
    userId: string,
    specId: string,
    noteId: string,
    command: UpdateNoteCommand
  ): Effect.Effect<NoteDTO, SkiSpecError> {
    return pipe(
      // Step 1: Verify ski specification exists and user owns it
      Effect.tryPromise({
        try: () => this.supabase.from('ski_specs').select('id').eq('id', specId).eq('user_id', userId).single(),
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'updateNote',
            table: 'ski_specs',
            userId,
            resourceId: specId,
          }),
      }),

      // Step 2: Validate spec exists
      Effect.flatMap(({ data: spec, error: specError }) => {
        if (specError?.code === 'PGRST116' || !spec) {
          return Effect.fail(
            new NotFoundError('Note not found', {
              resourceType: 'note',
              resourceId: noteId,
            })
          );
        }

        if (specError) {
          return Effect.fail(
            this.handleDatabaseError(specError, {
              operation: 'updateNote',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            })
          );
        }

        return Effect.succeed(spec);
      }),

      // Step 3: Update note with new content and timestamp
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            this.supabase
              .from('ski_spec_notes')
              .update({
                content: command.content,
                updated_at: new Date().toISOString(),
              })
              .eq('id', noteId)
              .eq('ski_spec_id', specId)
              .select()
              .single(),
          catch: (error) =>
            this.handleDatabaseError(error, {
              operation: 'updateNote',
              table: 'ski_spec_notes',
              userId,
              resourceId: noteId,
            }),
        })
      ),

      // Step 4: Validate response
      Effect.flatMap(({ data: updatedNote, error: updateError }) => {
        if (updateError?.code === 'PGRST116' || !updatedNote) {
          return Effect.fail(
            new NotFoundError('Note not found', {
              resourceType: 'note',
              resourceId: noteId,
            })
          );
        }

        if (updateError) {
          return Effect.fail(
            this.handleDatabaseError(updateError, {
              operation: 'updateNote',
              table: 'ski_spec_notes',
              userId,
              resourceId: noteId,
            })
          );
        }

        return Effect.succeed(updatedNote as NoteDTO);
      })
    );
  }

  /**
   * Deletes a note from a ski specification.
   *
   * This function:
   * 1. Verifies the ski specification exists and user owns it
   * 2. Verifies the note exists and belongs to the specification
   * 3. Deletes the note from the database
   *
   * Security: Two-level verification prevents unauthorized access:
   * - First checks specification ownership (prevents access to other users' specs)
   * - Then checks note association (prevents cross-spec note deletion)
   * Returns generic "not found" error for all failure cases to prevent information disclosure.
   *
   * @param userId - ID of the authenticated user
   * @param specId - UUID of the ski specification that owns the note
   * @param noteId - UUID of the note to delete
   * @returns Effect that succeeds with void or fails with SkiSpecError
   */
  deleteNote(userId: string, specId: string, noteId: string): Effect.Effect<void, SkiSpecError> {
    return pipe(
      // Step 1: Verify ski specification exists and user owns it
      Effect.tryPromise({
        try: () => this.supabase.from('ski_specs').select('id').eq('id', specId).eq('user_id', userId).single(),
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'deleteNote',
            table: 'ski_specs',
            userId,
            resourceId: specId,
          }),
      }),

      // Step 2: Validate spec exists
      Effect.flatMap(({ data: spec, error: specError }) => {
        if (specError?.code === 'PGRST116' || !spec) {
          return Effect.fail(
            new NotFoundError('Note not found', {
              resourceType: 'note',
              resourceId: noteId,
            })
          );
        }

        if (specError) {
          return Effect.fail(
            this.handleDatabaseError(specError, {
              operation: 'deleteNote',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            })
          );
        }

        return Effect.succeed(spec);
      }),

      // Step 3: Verify note exists and belongs to the specification
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            this.supabase.from('ski_spec_notes').select('id').eq('id', noteId).eq('ski_spec_id', specId).single(),
          catch: (error) =>
            this.handleDatabaseError(error, {
              operation: 'deleteNote',
              table: 'ski_spec_notes',
              userId,
              resourceId: noteId,
            }),
        })
      ),

      // Step 4: Validate note exists
      Effect.flatMap(({ data: note, error: noteError }) => {
        if (noteError?.code === 'PGRST116' || !note) {
          return Effect.fail(
            new NotFoundError('Note not found', {
              resourceType: 'note',
              resourceId: noteId,
            })
          );
        }

        if (noteError) {
          return Effect.fail(
            this.handleDatabaseError(noteError, {
              operation: 'deleteNote',
              table: 'ski_spec_notes',
              userId,
              resourceId: noteId,
            })
          );
        }

        return Effect.succeed(note);
      }),

      // Step 5: Delete the note
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => this.supabase.from('ski_spec_notes').delete().eq('id', noteId),
          catch: (error) =>
            new DatabaseError('Failed to delete note', {
              cause: error instanceof Error ? error : undefined,
              operation: 'deleteNote',
              table: 'ski_spec_notes',
            }),
        })
      ),

      // Step 6: Validate deletion
      Effect.flatMap(({ error: deleteError }) => {
        if (deleteError) {
          return Effect.fail(
            new DatabaseError(`Failed to delete note: ${deleteError.message}`, {
              cause: deleteError,
              operation: 'deleteNote',
              table: 'ski_spec_notes',
            })
          );
        }

        return Effect.succeed(undefined);
      })
    );
  }

  /**
   * Retrieves a paginated list of notes for a specific ski specification.
   *
   * This function:
   * 1. Verifies the ski specification exists and user owns it
   * 2. Fetches paginated notes sorted by creation date
   * 3. Returns notes with total count
   *
   * Security: Verifies specification ownership before returning notes.
   * Returns NotFoundError if specification doesn't exist or user doesn't own it.
   *
   * @param userId - ID of the authenticated user
   * @param specId - UUID of the ski specification
   * @param query - Validated query parameters (page, limit)
   * @returns Effect that succeeds with notes data and count or fails with SkiSpecError
   */
  listNotes(
    userId: string,
    specId: string,
    query: ListNotesQuery
  ): Effect.Effect<{ data: NoteDTO[]; total: number }, SkiSpecError> {
    return pipe(
      // Step 1: Verify specification exists and user owns it
      Effect.tryPromise({
        try: () => this.supabase.from('ski_specs').select('id').eq('id', specId).eq('user_id', userId).single(),
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'listNotes',
            table: 'ski_specs',
            userId,
            resourceId: specId,
          }),
      }),

      // Step 2: Validate spec exists
      Effect.flatMap(({ data: spec, error: specError }) => {
        if (specError?.code === 'PGRST116' || !spec) {
          return Effect.fail(
            new NotFoundError('Ski specification not found', {
              resourceType: 'ski_spec',
              resourceId: specId,
            })
          );
        }

        if (specError) {
          return Effect.fail(
            this.handleDatabaseError(specError, {
              operation: 'listNotes',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            })
          );
        }

        return Effect.succeed(spec);
      }),

      // Step 3: Fetch notes with pagination and count
      Effect.flatMap(() => {
        const offset = (query.page - 1) * query.limit;

        return Effect.tryPromise({
          try: () =>
            this.supabase
              .from('ski_spec_notes')
              .select('*', { count: 'exact' })
              .eq('ski_spec_id', specId)
              .order('created_at', { ascending: false })
              .range(offset, offset + query.limit - 1),
          catch: (error) =>
            this.handleDatabaseError(error, {
              operation: 'listNotes',
              table: 'ski_spec_notes',
              userId,
              resourceId: specId,
            }),
        });
      }),

      // Step 4: Validate response and return data
      Effect.flatMap(({ data, error, count }) => {
        if (error) {
          return Effect.fail(
            this.handleDatabaseError(error, {
              operation: 'listNotes',
              table: 'ski_spec_notes',
              userId,
              resourceId: specId,
            })
          );
        }

        return Effect.succeed({
          data: (data || []) as NoteDTO[],
          total: count ?? 0,
        });
      })
    );
  }

  /**
   * Checks database connectivity by performing a simple query.
   *
   * Used by the health endpoint to verify the database is accessible.
   *
   * @returns Effect that always succeeds with boolean (true if accessible, false otherwise)
   */
  checkDatabaseConnection(): Effect.Effect<boolean, never> {
    return pipe(
      Effect.tryPromise({
        try: () => this.supabase.from('ski_specs').select('id').limit(1),
        catch: () => false as const,
      }),
      Effect.map(({ error }) => !error),
      Effect.orElse(() => Effect.succeed(false))
    );
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Helper: Verify spec ownership (DRY for multiple methods)
   * @private
   */
  private verifySpecOwnership(
    userId: string,
    specId: string
  ): Effect.Effect<Database['public']['Tables']['ski_specs']['Row'], SkiSpecError> {
    return pipe(
      Effect.tryPromise({
        try: () => this.supabase.from('ski_specs').select('*').eq('id', specId).eq('user_id', userId).single(),
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'verifySpecOwnership',
            table: 'ski_specs',
            userId,
            resourceId: specId,
          }),
      }),
      Effect.flatMap(({ data, error }) => {
        if (error?.code === 'PGRST116' || !data) {
          return Effect.fail(
            new NotFoundError('Ski specification not found', {
              resourceType: 'ski_spec',
              resourceId: specId,
            })
          );
        }

        if (error) {
          return Effect.fail(
            this.handleDatabaseError(error, {
              operation: 'verifySpecOwnership',
              table: 'ski_specs',
              userId,
              resourceId: specId,
            })
          );
        }

        return Effect.succeed(data);
      })
    );
  }

  /**
   * Helper: Check name uniqueness (DRY for create/update)
   * @private
   */
  private checkNameUniqueness(
    userId: string,
    excludeId: string,
    newName: string,
    currentName: string
  ): Effect.Effect<void, SkiSpecError> {
    const trimmedName = newName.trim();

    // Skip check if name hasn't changed
    if (trimmedName === currentName) {
      return Effect.succeed(undefined);
    }

    return pipe(
      Effect.tryPromise({
        try: () =>
          this.supabase
            .from('ski_specs')
            .select('id')
            .eq('user_id', userId)
            .eq('name', trimmedName)
            .neq('id', excludeId)
            .maybeSingle(),
        catch: (error) =>
          this.handleDatabaseError(error, {
            operation: 'checkNameUniqueness',
            table: 'ski_specs',
            userId,
          }),
      }),
      Effect.flatMap(({ data, error }) => {
        if (error) {
          return Effect.fail(
            this.handleDatabaseError(error, {
              operation: 'checkNameUniqueness',
              table: 'ski_specs',
              userId,
            })
          );
        }

        if (data) {
          return Effect.fail(
            new ConflictError('Specification with this name already exists', {
              code: 'DUPLICATE_NAME',
              conflictingField: 'name',
              resourceType: 'ski_spec',
            })
          );
        }

        return Effect.succeed(undefined);
      })
    );
  }

  /**
   * Helper: Get notes count for a spec (DRY for multiple methods)
   * @private
   */
  private getNotesCount(specId: string): Effect.Effect<number, DatabaseError> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          this.supabase.from('ski_spec_notes').select('*', { count: 'exact', head: true }).eq('ski_spec_id', specId),
        catch: (error) =>
          new DatabaseError('Failed to count notes', {
            cause: error instanceof Error ? error : undefined,
            operation: 'getNotesCount',
            table: 'ski_spec_notes',
          }),
      }),
      Effect.flatMap(({ count, error }) => {
        if (error) {
          return Effect.fail(
            new DatabaseError('Failed to count notes', {
              cause: error,
              operation: 'getNotesCount',
              table: 'ski_spec_notes',
            })
          );
        }

        return Effect.succeed(count ?? 0);
      })
    );
  }

  /**
   * Helper: Handle database errors with context
   * @private
   */
  private handleDatabaseError(
    error: unknown,
    context: {
      operation: string;
      table: string;
      userId?: string;
      resourceId?: string;
    }
  ): SkiSpecError {
    const dbError = error as { code?: string; message?: string };

    // UNIQUE constraint violation (23505) -> ConflictError
    if (dbError?.code === '23505') {
      return new ConflictError('Duplicate record', {
        code: 'DUPLICATE_RECORD',
        resourceType: context.table,
        context,
      });
    }

    // PGRST116 (not found) -> NotFoundError
    if (dbError?.code === 'PGRST116') {
      return new NotFoundError(`${context.table} not found`, {
        resourceType: context.table,
        resourceId: context.resourceId,
      });
    }

    // Generic database error
    return new DatabaseError(`Database operation failed: ${context.operation}`, {
      cause: error instanceof Error ? error : undefined,
      operation: context.operation,
      table: context.table,
      context,
    });
  }
}
