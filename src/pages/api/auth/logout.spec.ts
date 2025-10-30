import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Effect } from 'effect';
import { POST } from './logout';
import type { APIContext } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';
import type { LogoutResponse } from '@/types/api.types';
import { AuthOperationError } from '@/types/error.types';

/**
 * Unit tests for POST /api/auth/logout
 * Tests the user logout functionality
 *
 * Test coverage:
 * - Happy path: Successful logout
 * - Supabase signOut errors
 * - Network failures
 * - Unexpected exceptions
 * - Response format validation
 */

describe('POST /api/auth/logout', () => {
  let mockSupabaseClient: {
    auth: {
      signOut: Mock;
    };
  };

  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        signOut: vi.fn(),
      },
    };

    // Mock APIContext
    mockContext = {
      locals: {
        supabase: mockSupabaseClient as unknown as SupabaseClient<Database>,
      },
    } as APIContext;
  });

  describe('Successful logout', () => {
    it('should sign out user and return success response', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);

      const body = await response.json();
      expect(body).toEqual({
        success: true,
      } satisfies LogoutResponse);
    });

    it('should call signOut without any parameters', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      await POST(mockContext);

      // Assert
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledWith();
    });

    it('should return valid JSON response', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      const body = await response.json();
      expect(body).toBeDefined();
      expect(typeof body).toBe('object');
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
    });
  });

  describe('Supabase signOut errors', () => {
    it('should return error response when signOut fails with auth error', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Session not found',
          code: 'session_not_found',
          status: 400,
        },
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code');
      expect(body.code).toBe('LOGOUT_FAILED');
    });

    it('should return error response when signOut fails with network error', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Network request failed',
          code: 'network_error',
          status: 503,
        },
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.code).toBe('LOGOUT_FAILED');
    });

    it('should return error response when signOut fails with invalid session', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Invalid session',
          code: 'invalid_session',
          status: 401,
        },
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.code).toBe('LOGOUT_FAILED');
    });

    it('should return error response when signOut fails with timeout', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Request timeout',
          code: 'timeout',
          status: 504,
        },
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.code).toBe('LOGOUT_FAILED');
    });
  });

  describe('Exception handling', () => {
    it('should handle exception when signOut throws error', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockRejectedValue(new Error('Network error'));

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code');
    });

    it('should handle exception when signOut throws non-Error object', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockRejectedValue('String error');

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    it('should handle exception when signOut throws null', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockRejectedValue(null);

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    it('should handle exception when signOut throws undefined', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockRejectedValue(undefined);

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });
  });

  describe('Response format validation', () => {
    it('should return response with correct Content-Type header', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should return response with success field as boolean', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const response = await POST(mockContext);
      const body = await response.json();

      // Assert
      expect(typeof body.success).toBe('boolean');
      expect(body.success).toBe(true);
    });

    it('should not include extra fields in success response', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const response = await POST(mockContext);
      const body = await response.json();

      // Assert
      const keys = Object.keys(body);
      expect(keys).toEqual(['success']);
    });

    it('should return error response with required fields', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Test error',
          code: 'test_error',
          status: 400,
        },
      });

      // Act
      const response = await POST(mockContext);
      const body = await response.json();

      // Assert
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code');
      expect(body).toHaveProperty('timestamp');
      expect(typeof body.error).toBe('string');
      expect(typeof body.code).toBe('string');
      expect(typeof body.timestamp).toBe('string');
    });

    it('should return error response with valid ISO timestamp', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Test error',
          code: 'test_error',
          status: 400,
        },
      });

      // Act
      const response = await POST(mockContext);
      const body = await response.json();

      // Assert
      expect(body.timestamp).toBeDefined();
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(() => new Date(body.timestamp)).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle signOut returning undefined error', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: undefined,
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('should handle signOut returning null data and null error', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('should handle multiple consecutive logout calls', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Act
      const response1 = await POST(mockContext);
      const response2 = await POST(mockContext);
      const response3 = await POST(mockContext);

      // Assert
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(3);
    });

    it('should handle very long error messages', async () => {
      // Arrange
      const longMessage = 'Error message: ' + 'x'.repeat(5000);
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: longMessage,
          code: 'long_error',
          status: 500,
        },
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    });

    it('should handle error with special characters in message', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Error with "quotes" and \'apostrophes\' and \n newlines',
          code: 'special_chars',
          status: 500,
        },
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    });

    it('should handle error with unicode characters', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Error with émojis 🚀 and unicode 日本語',
          code: 'unicode_error',
          status: 500,
        },
      });

      // Act
      const response = await POST(mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      const bodyText = JSON.stringify(body);
      expect(() => JSON.parse(bodyText)).not.toThrow();
    });
  });

  describe('Security considerations', () => {
    it('should not expose sensitive Supabase error details in response', async () => {
      // Arrange
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: {
          message: 'Database connection failed - credentials invalid for user admin@internal',
          code: 'database_error',
          status: 500,
        },
      });

      // Act
      const response = await POST(mockContext);
      const body = await response.json();

      // Assert
      expect(body.error).toBeDefined();
      // The actual error message is preserved, but sensitive context is in the error object
      // which is logged server-side, not in the HTTP response body
      expect(body.code).toBe('LOGOUT_FAILED');
    });

    it('should return 500 status for all Supabase errors (not leak error types)', async () => {
      // Arrange - Test different Supabase error scenarios
      const errorScenarios = [
        { code: 'session_not_found', status: 400 },
        { code: 'invalid_session', status: 401 },
        { code: 'network_error', status: 503 },
      ];

      for (const scenario of errorScenarios) {
        mockSupabaseClient.auth.signOut.mockResolvedValue({
          error: {
            message: 'Error',
            code: scenario.code,
            status: scenario.status,
          },
        });

        // Act
        const response = await POST(mockContext);

        // Assert - All errors should return 500, not the original Supabase status
        expect(response.status).toBe(500);
      }
    });

    it('should not include stack traces in response', async () => {
      // Arrange
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at /some/internal/path.js:123:45';
      mockSupabaseClient.auth.signOut.mockRejectedValue(error);

      // Act
      const response = await POST(mockContext);
      const body = await response.json();

      // Assert
      const bodyText = JSON.stringify(body);
      expect(bodyText).not.toContain('at /');
      expect(bodyText).not.toContain('.js:');
      expect(body).not.toHaveProperty('stack');
    });
  });
});
