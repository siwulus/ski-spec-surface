import type {
  AuthenticationError,
  ConflictError,
  NetworkError,
  SkiSpecError,
  ValidationError,
} from '@/types/error.types';
import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Options for configuring error handler behavior
 */
export interface ErrorHandlerOptions {
  /**
   * Whether to redirect to login page on authentication errors
   * @default false
   */
  redirectOnAuth?: boolean;

  /**
   * URL to redirect to after successful login (used with redirectOnAuth)
   * If not provided, uses current page path
   */
  redirectTo?: string;

  /**
   * Whether to display toast notification
   * @default true
   */
  showToast?: boolean;
}

/**
 * Return type for useErrorHandler hook
 */
export interface UseErrorHandlerReturn {
  /**
   * Display error toast and optionally redirect based on error type.
   * Returns field-level errors for ValidationError (useful for forms).
   *
   * @param error - SkiSpecError to handle
   * @param options - Configuration options
   * @returns Record of field errors for ValidationError, empty object otherwise
   */
  showError: (error: SkiSpecError, options?: ErrorHandlerOptions) => Record<string, string>;

  /**
   * Display success toast notification.
   *
   * @param message - Success message title
   * @param description - Optional detailed description
   */
  showSuccess: (message: string, description?: string) => void;
}

/**
 * Hook for centralized client-side error handling with toast notifications.
 *
 * Provides consistent error handling across all components with:
 * - Automatic toast notifications based on error type
 * - Optional redirect on authentication errors
 * - Field-level error extraction for forms
 * - Type-safe error handling with SkiSpecError
 *
 * @returns Error handler methods
 *
 * @example
 * ```typescript
 * const { showError, showSuccess } = useErrorHandler();
 *
 * // Handle error with redirect on auth failure
 * const fieldErrors = showError(error, {
 *   redirectOnAuth: true,
 *   redirectTo: "/ski-specs"
 * });
 *
 * // Display success message
 * showSuccess("Specification created", "Your specification has been saved");
 * ```
 */
export const useErrorHandler = (): UseErrorHandlerReturn => {
  /**
   * Handle authentication errors with optional redirect to login
   */
  const handleAuthenticationError = useCallback((error: AuthenticationError, options?: ErrorHandlerOptions) => {
    if (options?.showToast !== false) {
      toast.error('Authentication Required', {
        description: error.message || 'Please log in to continue',
      });
    }

    if (options?.redirectOnAuth) {
      const redirectTo = options.redirectTo || window.location.pathname;

      window.location.assign(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }, []);

  /**
   * Handle validation errors and extract field-level errors
   */
  const handleValidationError = useCallback((error: ValidationError, options?: ErrorHandlerOptions) => {
    const fieldErrors: Record<string, string> = {};

    // Extract field-level errors
    error.details.forEach((detail) => {
      fieldErrors[detail.field] = detail.message;
    });

    if (options?.showToast !== false) {
      // Show generic validation error toast
      const description =
        error.details.length > 0
          ? `${error.details.length} validation error${error.details.length > 1 ? 's' : ''} found`
          : 'Please check the entered data';

      toast.error('Validation Error', { description });
    }

    return fieldErrors;
  }, []);

  /**
   * Handle conflict errors (e.g., duplicate names)
   */
  const handleConflictError = useCallback((error: ConflictError, options?: ErrorHandlerOptions) => {
    if (options?.showToast !== false) {
      toast.error('Already Exists', {
        description: error.message || 'A resource with this identifier already exists',
      });
    }
  }, []);

  /**
   * Handle network errors with retry suggestion
   */
  const handleNetworkError = useCallback((error: NetworkError, options?: ErrorHandlerOptions) => {
    if (options?.showToast !== false) {
      toast.error('Network Error', {
        description: error.message || 'Please check your internet connection and try again',
      });
    }
  }, []);

  /**
   * Handle generic errors with fallback message
   */
  const handleGenericError = useCallback((error: SkiSpecError, errorType: string, options?: ErrorHandlerOptions) => {
    if (options?.showToast !== false) {
      toast.error(errorType, {
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    }
  }, []);

  /**
   * Main error handler that dispatches to specific handlers based on error type
   */
  const showError = useCallback(
    (error: SkiSpecError, options?: ErrorHandlerOptions): Record<string, string> => {
      // Handle specific error types
      switch (error._tag) {
        case 'ValidationError':
          return handleValidationError(error as ValidationError, options);

        case 'AuthenticationError':
          handleAuthenticationError(error as AuthenticationError, options);
          return {};

        case 'AuthorizationError':
          handleGenericError(error, 'Access Forbidden', options);
          return {};

        case 'NotFoundError':
          handleGenericError(error, 'Not Found', options);
          return {};

        case 'ConflictError':
          handleConflictError(error as ConflictError, options);
          return {};

        case 'NetworkError':
          handleNetworkError(error as NetworkError, options);
          return {};

        case 'InvalidJsonError':
          handleGenericError(error, 'Invalid Response', {
            ...options,
            showToast: options?.showToast !== false,
          });
          return {};

        case 'DatabaseError':
          handleGenericError(error, 'Database Error', options);
          return {};

        case 'BusinessLogicError':
          handleGenericError(error, 'Operation Failed', options);
          return {};

        case 'AuthOperationError':
          handleGenericError(error, 'Authentication Failed', options);
          return {};

        case 'UnexpectedError':
          handleGenericError(error, 'Unexpected Error', options);
          return {};

        default:
          // Fallback for safety - should never be reached if all cases are handled
          // TypeScript will error if a new error type is added but not handled
          // eslint-disable-next-line no-console
          console.error('Unhandled error type:', error);
          return {};
      }
    },
    [handleValidationError, handleAuthenticationError, handleConflictError, handleNetworkError, handleGenericError]
  );

  /**
   * Display success toast notification
   */
  const showSuccess = useCallback((message: string, description?: string) => {
    toast.success(message, {
      description,
    });
  }, []);

  return {
    showError,
    showSuccess,
  };
};
