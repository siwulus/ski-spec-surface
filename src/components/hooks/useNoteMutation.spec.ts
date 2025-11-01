/**
 * UNIT TESTS FOR useNoteMutation HOOK
 *
 * This hook handles note CRUD operations (create, update, delete).
 *
 * Key features tested:
 * 1. Create note with success/error handling
 * 2. Update note with success/error handling
 * 3. Delete note with success/error handling
 * 4. Loading states (isSubmitting)
 * 5. API error collection and display
 * 6. Toast notifications
 * 7. Error clearing between operations
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateNoteCommand, NoteDTO, UpdateNoteCommand } from '@/types/api.types';
import { Effect } from 'effect';
import { ValidationError, NetworkError } from '@/types/error.types';

// Mock external dependencies
vi.mock('@/lib/utils/SkiSpecHttpClient');
vi.mock('./useErrorHandler');

// Import after mocking
import { useNoteMutation } from './useNoteMutation';
import { skiSpecHttpClient } from '@/lib/utils/SkiSpecHttpClient';
import { useErrorHandler } from './useErrorHandler';

// Test data
const mockCreateCommand: CreateNoteCommand = {
  content: 'Excellent in powder conditions',
};

const mockUpdateCommand: UpdateNoteCommand = {
  content: 'Updated: Excellent in powder and groomers',
};

const mockNote: NoteDTO = {
  id: 'note-1',
  spec_id: 'spec-123',
  user_id: 'user-1',
  content: mockCreateCommand.content,
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
};

const mockUpdatedNote: NoteDTO = {
  ...mockNote,
  content: mockUpdateCommand.content,
  updated_at: '2025-01-01T11:00:00Z',
};

describe('useNoteMutation', () => {
  const mockShowError = vi.fn().mockReturnValue({});
  const mockShowSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useErrorHandler).mockReturnValue({
      showError: mockShowError,
      showSuccess: mockShowSuccess,
    });

    vi.mocked(skiSpecHttpClient.post).mockReturnValue(Effect.succeed(mockNote));
    vi.mocked(skiSpecHttpClient.put).mockReturnValue(Effect.succeed(mockUpdatedNote));
    vi.mocked(skiSpecHttpClient.deleteNoContent).mockReturnValue(Effect.succeed(undefined));
  });

  describe('Initial State', () => {
    it('should expose default state values', () => {
      const { result } = renderHook(() => useNoteMutation());

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.apiErrors).toEqual({});
      expect(result.current.createNote).toBeInstanceOf(Function);
      expect(result.current.updateNote).toBeInstanceOf(Function);
      expect(result.current.deleteNote).toBeInstanceOf(Function);
    });
  });

  describe('createNote', () => {
    it('should create note and show success message', async () => {
      const { result } = renderHook(() => useNoteMutation());

      let response: NoteDTO | undefined;
      await act(async () => {
        response = await result.current.createNote('spec-123', mockCreateCommand);
      });

      expect(response).toEqual(mockNote);
      expect(skiSpecHttpClient.post).toHaveBeenCalledWith(
        '/api/ski-specs/spec-123/notes',
        expect.anything(),
        mockCreateCommand
      );
      expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Note has been added');
      await waitFor(() => expect(result.current.isSubmitting).toBe(false));
      expect(result.current.apiErrors).toEqual({});
    });

    it('should set isSubmitting to true during create operation', async () => {
      let resolvePromise: (value: NoteDTO) => void;
      const pendingPromise = new Promise<NoteDTO>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(skiSpecHttpClient.post).mockReturnValue(Effect.promise(() => pendingPromise));

      const { result } = renderHook(() => useNoteMutation());

      let createPromise: Promise<NoteDTO>;
      act(() => {
        createPromise = result.current.createNote('spec-123', mockCreateCommand);
      });

      // Should be submitting
      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockNote);
        await createPromise;
      });

      // Should no longer be submitting
      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it('should handle validation errors and collect field errors', async () => {
      const validationError = new ValidationError('Invalid data', [
        { field: 'content', message: 'Content is required' },
      ]);
      const fieldErrors = { content: 'Content is required' };

      vi.mocked(skiSpecHttpClient.post).mockReturnValueOnce(Effect.fail(validationError));
      mockShowError.mockReturnValueOnce(fieldErrors);

      const { result } = renderHook(() => useNoteMutation());

      await act(async () => {
        await expect(result.current.createNote('spec-123', mockCreateCommand)).rejects.toThrow('Invalid data');
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));

      expect(mockShowError).toHaveBeenCalledWith(validationError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
      await waitFor(() => expect(result.current.apiErrors).toEqual(fieldErrors));
    });

    it('should clear previous API errors before new submission', async () => {
      const validationError = new ValidationError('Invalid data', [
        { field: 'content', message: 'Too short' },
      ]);
      const errorMap = { content: 'Too short' };

      vi.mocked(skiSpecHttpClient.post)
        .mockReturnValueOnce(Effect.fail(validationError))
        .mockReturnValueOnce(Effect.succeed(mockNote));

      mockShowError.mockReturnValueOnce(errorMap).mockReturnValueOnce({});

      const { result } = renderHook(() => useNoteMutation());

      // First submission fails
      await act(async () => {
        await expect(result.current.createNote('spec-123', mockCreateCommand)).rejects.toThrow('Invalid data');
      });

      await waitFor(() => expect(result.current.apiErrors).toEqual(errorMap));

      // Second submission succeeds
      let response: NoteDTO | undefined;
      await act(async () => {
        response = await result.current.createNote('spec-123', mockCreateCommand);
      });

      expect(response).toEqual(mockNote);
      await waitFor(() => expect(result.current.apiErrors).toEqual({}));
    });

    it('should handle network errors', async () => {
      const networkError = new NetworkError('Connection timeout');

      vi.mocked(skiSpecHttpClient.post).mockReturnValueOnce(Effect.fail(networkError));

      const { result } = renderHook(() => useNoteMutation());

      await act(async () => {
        await expect(result.current.createNote('spec-123', mockCreateCommand)).rejects.toThrow('Connection timeout');
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));

      expect(mockShowError).toHaveBeenCalledWith(networkError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
    });
  });

  describe('updateNote', () => {
    it('should update note and show success message', async () => {
      const { result } = renderHook(() => useNoteMutation());

      let response: NoteDTO | undefined;
      await act(async () => {
        response = await result.current.updateNote('spec-123', 'note-1', mockUpdateCommand);
      });

      expect(response).toEqual(mockUpdatedNote);
      expect(skiSpecHttpClient.put).toHaveBeenCalledWith(
        '/api/ski-specs/spec-123/notes/note-1',
        expect.anything(),
        mockUpdateCommand
      );
      expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Note has been updated');
      await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    });

    it('should set isSubmitting to true during update operation', async () => {
      let resolvePromise: (value: NoteDTO) => void;
      const pendingPromise = new Promise<NoteDTO>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(skiSpecHttpClient.put).mockReturnValue(Effect.promise(() => pendingPromise));

      const { result } = renderHook(() => useNoteMutation());

      let updatePromise: Promise<NoteDTO>;
      act(() => {
        updatePromise = result.current.updateNote('spec-123', 'note-1', mockUpdateCommand);
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(true);
      });

      await act(async () => {
        resolvePromise!(mockUpdatedNote);
        await updatePromise;
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it('should handle validation errors and propagate field messages', async () => {
      const validationError = new ValidationError('Invalid data', [
        { field: 'content', message: 'Content too long' },
      ]);
      const fieldErrors = { content: 'Content too long' };

      vi.mocked(skiSpecHttpClient.put).mockReturnValueOnce(Effect.fail(validationError));
      mockShowError.mockReturnValue(fieldErrors);

      const { result } = renderHook(() => useNoteMutation());

      await act(async () => {
        await expect(result.current.updateNote('spec-123', 'note-1', mockUpdateCommand)).rejects.toThrow(
          'Invalid data'
        );
      });

      expect(mockShowError).toHaveBeenCalledWith(validationError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });

      await waitFor(() => expect(result.current.apiErrors).toEqual(fieldErrors));
    });

    it('should handle network errors during update', async () => {
      const networkError = new NetworkError('Server unreachable');

      vi.mocked(skiSpecHttpClient.put).mockReturnValueOnce(Effect.fail(networkError));

      const { result } = renderHook(() => useNoteMutation());

      await act(async () => {
        await expect(result.current.updateNote('spec-123', 'note-1', mockUpdateCommand)).rejects.toThrow(
          'Server unreachable'
        );
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));

      expect(mockShowError).toHaveBeenCalledWith(networkError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
    });
  });

  describe('deleteNote', () => {
    it('should delete note and show success toast', async () => {
      const { result } = renderHook(() => useNoteMutation());

      await act(async () => {
        await result.current.deleteNote('spec-123', 'note-1');
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));
      expect(skiSpecHttpClient.deleteNoContent).toHaveBeenCalledWith('/api/ski-specs/spec-123/notes/note-1');
      expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Note has been deleted');
    });

    it('should set isSubmitting to true during delete operation', async () => {
      let resolvePromise: (value: void) => void;
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(skiSpecHttpClient.deleteNoContent).mockReturnValue(Effect.promise(() => pendingPromise));

      const { result } = renderHook(() => useNoteMutation());

      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.deleteNote('spec-123', 'note-1');
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(true);
      });

      await act(async () => {
        resolvePromise!();
        await deletePromise;
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it('should handle delete errors via error handler', async () => {
      const networkError = new NetworkError('Delete failed');

      vi.mocked(skiSpecHttpClient.deleteNoContent).mockReturnValueOnce(Effect.fail(networkError));

      const { result } = renderHook(() => useNoteMutation());

      await act(async () => {
        await expect(result.current.deleteNote('spec-123', 'note-1')).rejects.toThrow('Delete failed');
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));

      expect(mockShowError).toHaveBeenCalledWith(networkError, {
        redirectOnAuth: true,
        redirectTo: '/ski-specs',
      });
    });

    it('should not set apiErrors on delete (only on create/update)', async () => {
      const validationError = new ValidationError('Cannot delete', []);

      vi.mocked(skiSpecHttpClient.deleteNoContent).mockReturnValueOnce(Effect.fail(validationError));

      const { result } = renderHook(() => useNoteMutation());

      await act(async () => {
        await expect(result.current.deleteNote('spec-123', 'note-1')).rejects.toThrow('Cannot delete');
      });

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));

      // apiErrors should still be empty (delete doesn't populate field errors)
      expect(result.current.apiErrors).toEqual({});
    });
  });

  describe('Multiple Operations', () => {
    it('should handle sequential create and update operations', async () => {
      const { result } = renderHook(() => useNoteMutation());

      // Create
      await act(async () => {
        await result.current.createNote('spec-123', mockCreateCommand);
      });

      expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Note has been added');

      // Update
      await act(async () => {
        await result.current.updateNote('spec-123', 'note-1', mockUpdateCommand);
      });

      expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Note has been updated');
      expect(mockShowSuccess).toHaveBeenCalledTimes(2);
    });

    it('should handle sequential error then success', async () => {
      const validationError = new ValidationError('Invalid', [{ field: 'content', message: 'Required' }]);
      const fieldErrors = { content: 'Required' };

      vi.mocked(skiSpecHttpClient.post)
        .mockReturnValueOnce(Effect.fail(validationError))
        .mockReturnValueOnce(Effect.succeed(mockNote));

      mockShowError.mockReturnValueOnce(fieldErrors).mockReturnValueOnce({});

      const { result } = renderHook(() => useNoteMutation());

      // First create fails
      await act(async () => {
        await expect(result.current.createNote('spec-123', mockCreateCommand)).rejects.toThrow('Invalid');
      });

      await waitFor(() => expect(result.current.apiErrors).toEqual(fieldErrors));

      // Second create succeeds
      await act(async () => {
        await result.current.createNote('spec-123', mockCreateCommand);
      });

      await waitFor(() => expect(result.current.apiErrors).toEqual({}));
      expect(mockShowSuccess).toHaveBeenCalledWith('Success', 'Note has been added');
    });
  });
});
