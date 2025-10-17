import type { SupabaseClient } from "@/db/supabase.client";
import type { Database } from "@/db/database.types";
import type {
  CreateSkiSpecCommand,
  SkiSpecDTO,
  ListSkiSpecsQuery,
  UpdateSkiSpecCommand,
  CreateNoteCommand,
  UpdateNoteCommand,
  NoteDTO,
} from "@/types/api.types";

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
export function calculateSurfaceArea(dimensions: {
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
 * @returns Relative weight in g/cm²
 */
export function calculateRelativeWeight(weight: number, surfaceArea: number): number {
  if (surfaceArea === 0) {
    throw new Error("Surface area cannot be zero");
  }

  const relativeWeight = weight / surfaceArea;

  // Round to 2 decimal places
  return Math.round(relativeWeight * 100) / 100;
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
export function getCurrentAlgorithmVersion(): string {
  return "1.0.0";
}

/**
 * Creates a new ski specification in the database.
 *
 * This function:
 * 1. Calculates derived fields (surface_area, relative_weight)
 * 2. Inserts the specification into the database
 * 3. Returns the created specification as a DTO with notes_count
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param command - Validated ski specification data
 * @returns Created ski specification with calculated fields
 * @throws Error if creation fails
 */
export async function createSkiSpec(
  supabase: SupabaseClient,
  userId: string,
  command: CreateSkiSpecCommand
): Promise<SkiSpecDTO> {
  // Step 1: Calculate derived fields
  const surfaceArea = calculateSurfaceArea({
    length: command.length,
    tip: command.tip,
    waist: command.waist,
    tail: command.tail,
    radius: command.radius,
  });

  const relativeWeight = calculateRelativeWeight(command.weight, surfaceArea);
  const algorithmVersion = getCurrentAlgorithmVersion();

  // Step 2: Prepare data for insertion
  const insertData = {
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
    algorithm_version: algorithmVersion,
  };

  // Step 3: Insert into database
  const { data, error } = await supabase.from("ski_specs").insert(insertData).select().single();

  // Step 4: Handle errors
  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create ski specification");
  }

  // Step 5: Return DTO with notes_count
  // For a newly created spec, notes_count is always 0
  return {
    ...data,
    notes_count: 0,
  };
}

/**
 * Retrieves a ski specification by ID for a specific user.
 *
 * This function:
 * 1. Queries the ski_specs table with filters for id and user_id
 * 2. Counts associated notes from ski_spec_notes table
 * 3. Returns the specification as a DTO with notes_count
 * 4. Returns null if not found or user doesn't own the specification
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification to retrieve
 * @returns Ski specification with notes count, or null if not found
 * @throws Error if database query fails
 */
export async function getSkiSpec(supabase: SupabaseClient, userId: string, specId: string): Promise<SkiSpecDTO | null> {
  // Query ski_specs with user ownership validation
  const { data: spec, error: specError } = await supabase
    .from("ski_specs")
    .select("*")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  // Handle not found case (PGRST116 is Supabase's "no rows returned" error)
  if (specError?.code === "PGRST116") {
    return null;
  }

  // Handle other errors
  if (specError) {
    throw specError;
  }

  // Query notes count separately
  const { count, error: countError } = await supabase
    .from("ski_spec_notes")
    .select("*", { count: "exact", head: true })
    .eq("ski_spec_id", specId);

  if (countError) {
    throw countError;
  }

  // Return DTO with notes_count
  return {
    ...spec,
    notes_count: count ?? 0,
  };
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
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - ID of the ski specification to delete
 * @throws Error with "not found" message if specification doesn't exist or user doesn't own it
 * @throws Error for database errors
 */
export async function deleteSkiSpec(supabase: SupabaseClient, userId: string, specId: string): Promise<void> {
  // Delete and check affected rows in single operation
  const { error, count } = await supabase
    .from("ski_specs")
    .delete({ count: "exact" })
    .eq("id", specId)
    .eq("user_id", userId);

  // Handle database errors
  if (error) {
    throw error;
  }

  // If no rows affected, spec doesn't exist or user doesn't own it
  // Return same error for both cases to prevent information disclosure
  if (count === 0) {
    throw new Error("Ski specification not found");
  }
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
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param query - Validated query parameters (page, limit, sort_by, sort_order, search)
 * @returns Object containing array of SkiSpecDTO and total count
 * @throws Error if database query fails
 */
export async function listSkiSpecs(
  supabase: SupabaseClient,
  userId: string,
  query: ListSkiSpecsQuery
): Promise<{ data: SkiSpecDTO[]; total: number }> {
  // Step 1: Build base query with user filter and count
  let dbQuery = supabase.from("ski_specs").select("*", { count: "exact" }).eq("user_id", userId);

  // Step 2: Apply search filter if provided
  if (query.search) {
    const searchTerm = query.search.trim();
    if (searchTerm) {
      dbQuery = dbQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }
  }

  // Step 3: Apply sorting
  dbQuery = dbQuery.order(query.sort_by, {
    ascending: query.sort_order === "asc",
  });

  // Step 4: Apply pagination
  const offset = (query.page - 1) * query.limit;
  dbQuery = dbQuery.range(offset, offset + query.limit - 1);

  // Step 5: Execute query
  const { data, error, count } = await dbQuery;

  // Handle database errors
  if (error) {
    throw error;
  }

  // Step 6: Get notes count for each specification
  // Note: Using separate queries for now (N+1 pattern)
  // TODO: Optimize with aggregation in single query if performance becomes an issue
  const specsWithNotes = await Promise.all(
    (data || []).map(async (spec: Database["public"]["Tables"]["ski_specs"]["Row"]) => {
      const { count: notesCount, error: countError } = await supabase
        .from("ski_spec_notes")
        .select("*", { count: "exact", head: true })
        .eq("ski_spec_id", spec.id);

      if (countError) {
        throw countError;
      }

      return {
        ...spec,
        notes_count: notesCount ?? 0,
      } as SkiSpecDTO;
    })
  );

  return {
    data: specsWithNotes,
    total: count ?? 0,
  };
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
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification to update
 * @param command - Validated ski specification update data
 * @returns Updated ski specification with calculated fields and notes count
 * @throws Error with "Specification not found" if spec doesn't exist or user doesn't own it
 * @throws Error with "Name already exists" if new name conflicts with another spec
 * @throws Error for database errors
 */
export async function updateSkiSpec(
  supabase: SupabaseClient,
  userId: string,
  specId: string,
  command: UpdateSkiSpecCommand
): Promise<SkiSpecDTO> {
  // Step 1: Verify specification exists and user owns it
  const { data: existing, error: fetchError } = await supabase
    .from("ski_specs")
    .select("*")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  // Handle not found (PGRST116) or other fetch errors
  if (fetchError?.code === "PGRST116" || !existing) {
    throw new Error("Specification not found");
  }

  if (fetchError) {
    throw fetchError;
  }

  // Step 2: Check name uniqueness (only if name changed)
  const trimmedName = command.name.trim();
  if (trimmedName !== existing.name) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from("ski_specs")
      .select("id")
      .eq("user_id", userId)
      .eq("name", trimmedName)
      .neq("id", specId)
      .maybeSingle();

    if (duplicateError) {
      throw duplicateError;
    }

    if (duplicate) {
      throw new Error("Name already exists");
    }
  }

  // Step 3: Calculate derived fields
  const surfaceArea = calculateSurfaceArea({
    length: command.length,
    tip: command.tip,
    waist: command.waist,
    tail: command.tail,
    radius: command.radius,
  });

  const relativeWeight = calculateRelativeWeight(command.weight, surfaceArea);
  const algorithmVersion = getCurrentAlgorithmVersion();

  // Step 4: Prepare update data
  const updateData = {
    name: trimmedName,
    description: command.description?.trim() || null,
    length: command.length,
    tip: command.tip,
    waist: command.waist,
    tail: command.tail,
    radius: command.radius,
    weight: command.weight,
    surface_area: surfaceArea,
    relative_weight: relativeWeight,
    algorithm_version: algorithmVersion,
  };

  // Step 5: Update in database
  const { data, error } = await supabase
    .from("ski_specs")
    .update(updateData)
    .eq("id", specId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Update failed");
  }

  // Step 6: Get notes count
  const { count, error: countError } = await supabase
    .from("ski_spec_notes")
    .select("*", { count: "exact", head: true })
    .eq("ski_spec_id", specId);

  if (countError) {
    throw countError;
  }

  // Step 7: Return DTO with notes_count
  return {
    ...data,
    notes_count: count ?? 0,
  };
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
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification
 * @param command - Validated note creation data
 * @returns Created note with all fields populated
 * @throws Error with "Specification not found" if spec doesn't exist or user doesn't own it
 * @throws Error for database errors
 */
export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  specId: string,
  command: CreateNoteCommand
): Promise<NoteDTO> {
  // Step 1: Verify specification exists and user owns it
  const { data: spec, error: specError } = await supabase
    .from("ski_specs")
    .select("id")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  // Handle not found (PGRST116) or other fetch errors
  if (specError?.code === "PGRST116" || !spec) {
    throw new Error("Specification not found");
  }

  if (specError) {
    throw specError;
  }

  // Step 2: Prepare note data for insertion
  const noteData = {
    ski_spec_id: specId,
    content: command.content.trim(),
  };

  // Step 3: Insert note into database
  const { data, error } = await supabase.from("ski_spec_notes").insert(noteData).select().single();

  // Step 4: Handle errors
  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create note");
  }

  // Step 5: Return created note as DTO
  return data as NoteDTO;
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
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification that owns the note
 * @param noteId - UUID of the note to retrieve
 * @returns Note data as DTO
 * @throws Error with "Note not found" if spec/note not found or not owned by user
 * @throws Error for database errors
 */
export async function getNoteById(
  supabase: SupabaseClient,
  userId: string,
  specId: string,
  noteId: string
): Promise<NoteDTO> {
  // Step 1: Verify ski specification exists and user owns it
  const { data: spec, error: specError } = await supabase
    .from("ski_specs")
    .select("id")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  // Handle not found (PGRST116) or ownership failure
  if (specError?.code === "PGRST116" || !spec) {
    throw new Error("Note not found");
  }

  if (specError) {
    throw specError;
  }

  // Step 2: Query note with verification that it belongs to the specification
  const { data: note, error: noteError } = await supabase
    .from("ski_spec_notes")
    .select("*")
    .eq("id", noteId)
    .eq("ski_spec_id", specId)
    .single();

  // Handle not found (PGRST116) or association failure
  if (noteError?.code === "PGRST116" || !note) {
    throw new Error("Note not found");
  }

  if (noteError) {
    throw noteError;
  }

  // Step 3: Return note as DTO
  return note as NoteDTO;
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
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification that owns the note
 * @param noteId - UUID of the note to update
 * @param command - Validated note update data (content)
 * @returns Updated note with new timestamp
 * @throws Error with "Note not found" if spec/note not found or not owned by user
 * @throws Error For database errors
 */
export async function updateNote(
  supabase: SupabaseClient,
  userId: string,
  specId: string,
  noteId: string,
  command: UpdateNoteCommand
): Promise<NoteDTO> {
  // Step 1: Verify ski specification exists and user owns it
  const { data: spec, error: specError } = await supabase
    .from("ski_specs")
    .select("id")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  // Handle not found (PGRST116) or ownership failure
  if (specError?.code === "PGRST116" || !spec) {
    throw new Error("Note not found");
  }

  if (specError) {
    throw specError;
  }

  // Step 2: Update note with new content and timestamp
  // Note: updated_at is automatically set by database trigger, but we set it explicitly for consistency
  const { data: updatedNote, error: updateError } = await supabase
    .from("ski_spec_notes")
    .update({
      content: command.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("ski_spec_id", specId)
    .select()
    .single();

  // Handle not found (PGRST116) or update failure
  if (updateError?.code === "PGRST116" || !updatedNote) {
    throw new Error("Note not found");
  }

  if (updateError) {
    throw updateError;
  }

  // Step 3: Return updated note
  return updatedNote as NoteDTO;
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
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification that owns the note
 * @param noteId - UUID of the note to delete
 * @throws Error with "Note not found" if spec/note not found or not owned by user
 * @throws Error For database errors
 */
export async function deleteNote(
  supabase: SupabaseClient,
  userId: string,
  specId: string,
  noteId: string
): Promise<void> {
  // Step 1: Verify ski specification exists and user owns it
  const { data: spec, error: specError } = await supabase
    .from("ski_specs")
    .select("id")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  // Handle not found (PGRST116) or ownership failure
  if (specError?.code === "PGRST116" || !spec) {
    throw new Error("Note not found");
  }

  if (specError) {
    throw specError;
  }

  // Step 2: Verify note exists and belongs to the specification
  const { data: note, error: noteError } = await supabase
    .from("ski_spec_notes")
    .select("id")
    .eq("id", noteId)
    .eq("ski_spec_id", specId)
    .single();

  // Handle not found (PGRST116) or association failure
  if (noteError?.code === "PGRST116" || !note) {
    throw new Error("Note not found");
  }

  if (noteError) {
    throw noteError;
  }

  // Step 3: Delete the note (RLS policies provide additional security layer)
  const { error: deleteError } = await supabase.from("ski_spec_notes").delete().eq("id", noteId);

  if (deleteError) {
    throw new Error(`Failed to delete note: ${deleteError.message}`);
  }
}
