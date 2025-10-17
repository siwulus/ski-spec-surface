import type { SupabaseClient } from "@/db/supabase.client";
import type { NoteDTO, ListNotesQuery } from "@/types/api.types";

/**
 * Retrieves a paginated list of notes for a specific ski specification.
 *
 * This function:
 * 1. Verifies the specification exists and belongs to the user
 * 2. Fetches notes with pagination
 * 3. Sorts by created_at DESC (newest first)
 * 4. Counts total matching records
 * 5. Returns null if specification not found or user doesn't own it
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param specId - UUID of the ski specification
 * @param query - Validated query parameters (page, limit)
 * @returns Object with notes array and total count, or null if unauthorized
 * @throws Error if database query fails
 */
export async function listNotes(
  supabase: SupabaseClient,
  userId: string,
  specId: string,
  query: ListNotesQuery
): Promise<{ data: NoteDTO[]; total: number } | null> {
  // Step 1: Verify specification exists and user owns it
  const { data: spec, error: specError } = await supabase
    .from("ski_specs")
    .select("id")
    .eq("id", specId)
    .eq("user_id", userId)
    .single();

  // Handle not found case (PGRST116 is Supabase's "no rows returned" error code)
  if (specError?.code === "PGRST116" || !spec) {
    return null;
  }

  // Handle other database errors
  if (specError) {
    throw specError;
  }

  // Step 2: Calculate offset for pagination
  const offset = (query.page - 1) * query.limit;

  // Step 3: Fetch notes with pagination and count
  const { data, error, count } = await supabase
    .from("ski_spec_notes")
    .select("*", { count: "exact" })
    .eq("ski_spec_id", specId)
    .order("created_at", { ascending: false })
    .range(offset, offset + query.limit - 1);

  // Handle database errors
  if (error) {
    throw error;
  }

  // Step 4: Return data and total count
  return {
    data: (data || []) as NoteDTO[],
    total: count ?? 0,
  };
}
