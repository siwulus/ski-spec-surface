import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useErrorHandler } from './useErrorHandler';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NetworkError,
  AuthorizationError,
  NotFoundError,
} from '@/types/error.types';
import { toast } from 'sonner';

vi.mock('sonner', () => {
  return {
    toast: {
      error: vi.fn(),
      success: vi.fn(),
    },
  };
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const original = window.location;
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...original, assign, pathname: '/current' },
      writable: true,
    });
  });

  it('returns field errors and shows toast for ValidationError', () => {
    const { result } = renderHook(() => useErrorHandler());

    const error = new ValidationError('Invalid data', [{ field: 'name', message: 'Required' }]);

    const fieldErrors = result.current.showError(error);

    expect(fieldErrors).toEqual({ name: 'Required' });
    expect(toast.error).toHaveBeenCalledWith('Validation Error', { description: '1 validation error found' });
  });

  it('shows auth toast and redirects to login when redirectOnAuth is true (using current path)', () => {
    const { result } = renderHook(() => useErrorHandler());

    const error = new AuthenticationError('Please login');

    result.current.showError(error, { redirectOnAuth: true });

    expect(toast.error).toHaveBeenCalledWith('Authentication Required', {
      description: 'Please login',
    });
    expect(window.location.assign).toHaveBeenCalledWith('/auth/login?redirectTo=%2Fcurrent');
  });

  it('redirects to provided redirectTo when specified', () => {
    const { result } = renderHook(() => useErrorHandler());

    const error = new AuthenticationError('Auth needed');

    result.current.showError(error, { redirectOnAuth: true, redirectTo: '/ski-specs' });

    expect(window.location.assign).toHaveBeenCalledWith('/auth/login?redirectTo=%2Fski-specs');
  });

  it('shows conflict toast with error message', () => {
    const { result } = renderHook(() => useErrorHandler());

    const error = new ConflictError('Duplicate name');

    const fields = result.current.showError(error);

    expect(fields).toEqual({});
    expect(toast.error).toHaveBeenCalledWith('Already Exists', {
      description: 'Duplicate name',
    });
  });

  it('shows network error toast unless disabled by showToast=false', () => {
    const { result } = renderHook(() => useErrorHandler());

    const error = new NetworkError('Offline');
    result.current.showError(error);
    expect(toast.error).toHaveBeenCalledWith('Network Error', {
      description: 'Offline',
    });

    vi.resetAllMocks();
    result.current.showError(error, { showToast: false });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('handles generic authorization and not found errors with appropriate titles', () => {
    const { result } = renderHook(() => useErrorHandler());

    result.current.showError(new AuthorizationError('Forbidden'));
    expect(toast.error).toHaveBeenCalledWith('Access Forbidden', {
      description: 'Forbidden',
    });

    vi.resetAllMocks();
    result.current.showError(new NotFoundError('Missing resource'));
    expect(toast.error).toHaveBeenCalledWith('Not Found', {
      description: 'Missing resource',
    });
  });

  it('shows success toast with message and optional description', () => {
    const { result } = renderHook(() => useErrorHandler());

    result.current.showSuccess('Saved', 'All good');
    expect(toast.success).toHaveBeenCalledWith('Saved', { description: 'All good' });
  });
});
