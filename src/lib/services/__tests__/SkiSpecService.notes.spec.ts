import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Effect } from 'effect';
import { SkiSpecService } from '../SkiSpecService';
import { SkiSurfaceEquationSimple } from '../SkiSurfaceEquationSimple';
import { NotFoundError, DatabaseError } from '@/types/error.types';
import type { SupabaseClient } from '@/db/supabase.client';
import type { ListNotesQuery } from '@/types/api.types';
import {
  TEST_USER_ID,
  TEST_SPEC_ID,
  TEST_NOTE_ID,
  createNoteEntity,
  createValidNoteCommand,
  createUpdateNoteCommand,
  createNotFoundError,
} from './test-utils';

/**
 * Unit Tests for SkiSpecService Note Management Methods
 *
 * Tests all note-related operations:
 * - createNote: Creating notes for ski specifications
 * - getNoteById: Retrieving individual notes
 * - updateNote: Updating note content
 * - deleteNote: Deleting notes
 * - listNotes: Listing notes with pagination
 *
 * All methods include two-level security verification:
 * 1. Verify spec exists and user owns it
 * 2. Verify note belongs to the spec
 */

describe('SkiSpecService - Note Management', () => {
  let service: SkiSpecService;
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const equation = new SkiSurfaceEquationSimple();
    service = new SkiSpecService(mockSupabase, equation);
  });

  // ==========================================================================
  // createNote
  // ==========================================================================

  describe('createNote', () => {
    it('should create a note successfully', async () => {
      const command = createValidNoteCommand();
      const mockNote = createNoteEntity();

      // Mock verifySpecOwnership
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      // Mock insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockNote,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const result = await Effect.runPromise(service.createNote(TEST_USER_ID, TEST_SPEC_ID, command));

      expect(result).toEqual(mockNote);
      expect(mockInsert).toHaveBeenCalledWith({
        ski_spec_id: TEST_SPEC_ID,
        content: 'Test note content',
      });
    });

    it('should trim note content when creating', async () => {
      const command = {
        content: '  Whitespace Content  ',
      };
      const mockNote = createNoteEntity();

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockNote,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ insert: mockInsert });

      await Effect.runPromise(service.createNote(TEST_USER_ID, TEST_SPEC_ID, command));

      expect(mockInsert).toHaveBeenCalledWith({
        ski_spec_id: TEST_SPEC_ID,
        content: 'Whitespace Content',
      });
    });

    it('should fail with NotFoundError when spec does not exist', async () => {
      const command = createValidNoteCommand();

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: createNotFoundError(),
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockVerifySelect,
      });

      const effect = service.createNote(TEST_USER_ID, TEST_SPEC_ID, command);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NotFoundError);
        expect(result.left.message).toContain('Ski specification not found');
      }
    });

    it('should fail with NotFoundError when user does not own spec', async () => {
      const command = createValidNoteCommand();

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: createNotFoundError(),
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockVerifySelect,
      });

      const effect = service.createNote(TEST_USER_ID, TEST_SPEC_ID, command);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NotFoundError);
      }
    });

    it('should fail with DatabaseError when insert fails', async () => {
      const command = createValidNoteCommand();

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed', code: 'INSERT_ERROR' },
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const effect = service.createNote(TEST_USER_ID, TEST_SPEC_ID, command);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(DatabaseError);
      }
    });

    it('should fail when insert returns no data', async () => {
      const command = createValidNoteCommand();

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const effect = service.createNote(TEST_USER_ID, TEST_SPEC_ID, command);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(DatabaseError);
        expect(result.left.message).toContain('Failed to create note');
      }
    });
  });

  // ==========================================================================
  // getNoteById
  // ==========================================================================

  describe('getNoteById', () => {
    it('should retrieve a note successfully', async () => {
      const mockNote = createNoteEntity();

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNoteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockNote,
              error: null,
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNoteSelect });

      const result = await Effect.runPromise(service.getNoteById(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID));

      expect(result).toEqual(mockNote);
    });

    it('should verify note belongs to the spec', async () => {
      const mockNote = createNoteEntity();
      const eqSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockNote,
            error: null,
          }),
        }),
      });

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNoteSelect = vi.fn().mockReturnValue({
        eq: eqSpy,
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNoteSelect });

      await Effect.runPromise(service.getNoteById(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID));

      // Verify both id and ski_spec_id filters were applied
      expect(eqSpy).toHaveBeenCalledWith('id', TEST_NOTE_ID);
      const nestedEq = eqSpy.mock.results[0].value.eq;
      expect(nestedEq).toHaveBeenCalledWith('ski_spec_id', TEST_SPEC_ID);
    });

    it('should fail with NotFoundError when note does not exist', async () => {
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNoteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: createNotFoundError(),
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNoteSelect });

      const effect = service.getNoteById(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NotFoundError);
        const error = result.left as NotFoundError;
        expect(error.message).toContain('Note not found');
        expect(error.resourceType).toBe('note');
        expect(error.resourceId).toBe(TEST_NOTE_ID);
      }
    });

    it('should fail when spec does not exist (returns generic not found)', async () => {
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: createNotFoundError(),
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockVerifySelect,
      });

      const effect = service.getNoteById(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NotFoundError);
        // IDOR prevention: returns "Note not found" even though it's the spec that's missing
        expect(result.left.message).toContain('Note not found');
      }
    });
  });

  // ==========================================================================
  // updateNote
  // ==========================================================================

  describe('updateNote', () => {
    it('should update a note successfully', async () => {
      const command = createUpdateNoteCommand();
      const updatedNote = {
        ...createNoteEntity(),
        content: 'Updated note content',
        updated_at: '2025-01-02T00:00:00.000Z',
      };

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedNote,
                error: null,
              }),
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ update: mockUpdate });

      const result = await Effect.runPromise(service.updateNote(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID, command));

      expect(result.content).toBe('Updated note content');
    });

    it('should update the updated_at timestamp', async () => {
      const command = createUpdateNoteCommand();
      const mockNote = createNoteEntity();

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockNote,
                error: null,
              }),
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ update: mockUpdate });

      await Effect.runPromise(service.updateNote(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID, command));

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          content: command.content,
          updated_at: expect.any(String),
        })
      );
    });

    it('should verify note belongs to the spec when updating', async () => {
      const command = createUpdateNoteCommand();
      const mockNote = createNoteEntity();
      const eqSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockNote,
              error: null,
            }),
          }),
        }),
      });

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: eqSpy,
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ update: mockUpdate });

      await Effect.runPromise(service.updateNote(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID, command));

      expect(eqSpy).toHaveBeenCalledWith('id', TEST_NOTE_ID);
      const nestedEq = eqSpy.mock.results[0].value.eq;
      expect(nestedEq).toHaveBeenCalledWith('ski_spec_id', TEST_SPEC_ID);
    });

    it('should fail with NotFoundError when note does not exist', async () => {
      const command = createUpdateNoteCommand();

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: createNotFoundError(),
              }),
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ update: mockUpdate });

      const effect = service.updateNote(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID, command);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NotFoundError);
      }
    });
  });

  // ==========================================================================
  // deleteNote
  // ==========================================================================

  describe('deleteNote', () => {
    it('should delete a note successfully', async () => {
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNoteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_NOTE_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockDelete = vi.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNoteSelect })
        .mockReturnValueOnce({
          delete: vi.fn().mockReturnValue({
            eq: mockDelete,
          }),
        });

      const result = await Effect.runPromise(service.deleteNote(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID));

      expect(result).toBeUndefined();
    });

    it('should verify note exists before deleting', async () => {
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const eqSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEST_NOTE_ID },
            error: null,
          }),
        }),
      });

      const mockNoteSelect = vi.fn().mockReturnValue({
        eq: eqSpy,
      });

      const mockDelete = vi.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNoteSelect })
        .mockReturnValueOnce({
          delete: vi.fn().mockReturnValue({
            eq: mockDelete,
          }),
        });

      await Effect.runPromise(service.deleteNote(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID));

      // Verify note existence check with both filters
      expect(eqSpy).toHaveBeenCalledWith('id', TEST_NOTE_ID);
      const nestedEq = eqSpy.mock.results[0].value.eq;
      expect(nestedEq).toHaveBeenCalledWith('ski_spec_id', TEST_SPEC_ID);
    });

    it('should fail with NotFoundError when note does not exist', async () => {
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNoteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: createNotFoundError(),
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNoteSelect });

      const effect = service.deleteNote(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NotFoundError);
      }
    });

    it('should fail when delete operation fails', async () => {
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNoteSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_NOTE_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockDelete = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNoteSelect })
        .mockReturnValueOnce({
          delete: vi.fn().mockReturnValue({
            eq: mockDelete,
          }),
        });

      const effect = service.deleteNote(TEST_USER_ID, TEST_SPEC_ID, TEST_NOTE_ID);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(DatabaseError);
      }
    });
  });

  // ==========================================================================
  // listNotes
  // ==========================================================================

  describe('listNotes', () => {
    const query: ListNotesQuery = {
      page: 1,
      limit: 50,
    };

    it('should list notes with pagination', async () => {
      const mockNotes = [createNoteEntity()];

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNotesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockNotes,
              error: null,
              count: 1,
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNotesSelect });

      const result = await Effect.runPromise(service.listNotes(TEST_USER_ID, TEST_SPEC_ID, query));

      expect(result.data).toEqual(mockNotes);
      expect(result.total).toBe(1);
    });

    it('should sort notes by created_at descending (newest first)', async () => {
      const orderSpy = vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNotesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: orderSpy,
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNotesSelect });

      await Effect.runPromise(service.listNotes(TEST_USER_ID, TEST_SPEC_ID, query));

      expect(orderSpy).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should calculate correct range for pagination', async () => {
      const rangeSpy = vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNotesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: rangeSpy,
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNotesSelect })
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNotesSelect });

      // Page 1, limit 50: range(0, 49)
      await Effect.runPromise(service.listNotes(TEST_USER_ID, TEST_SPEC_ID, { page: 1, limit: 50 }));
      expect(rangeSpy).toHaveBeenCalledWith(0, 49);

      // Page 2, limit 50: range(50, 99)
      await Effect.runPromise(service.listNotes(TEST_USER_ID, TEST_SPEC_ID, { page: 2, limit: 50 }));
      expect(rangeSpy).toHaveBeenCalledWith(50, 99);
    });

    it('should return empty array when no notes found', async () => {
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNotesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null,
              count: 0,
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNotesSelect });

      const result = await Effect.runPromise(service.listNotes(TEST_USER_ID, TEST_SPEC_ID, query));

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should fail with NotFoundError when spec does not exist', async () => {
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: createNotFoundError(),
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockVerifySelect,
      });

      const effect = service.listNotes(TEST_USER_ID, TEST_SPEC_ID, query);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NotFoundError);
        expect(result.left.message).toContain('Ski specification not found');
      }
    });

    it('should fail with DatabaseError when query fails', async () => {
      const mockVerifySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: TEST_SPEC_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockNotesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query failed' },
              count: null,
            }),
          }),
        }),
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ select: mockVerifySelect })
        .mockReturnValueOnce({ select: mockNotesSelect });

      const effect = service.listNotes(TEST_USER_ID, TEST_SPEC_ID, query);
      const result = await Effect.runPromise(Effect.either(effect));

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(DatabaseError);
      }
    });
  });
});
