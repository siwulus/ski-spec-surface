import { Effect } from 'effect';
import { AuthenticationError } from '@/types/error.types';

/**
 * Validates and extracts user ID from the authenticated user object.
 *
 * This utility is used in API routes to ensure the user is authenticated before proceeding.
 * Fails with AuthenticationError if user is not authenticated.
 *
 * @param user - User object from Astro locals (can be null or undefined if not authenticated)
 * @returns Effect.Effect that succeeds with the user ID string or fails with AuthenticationError
 */
export const getUserIdEffect = (user: { id: string } | null | undefined): Effect.Effect<string, AuthenticationError> =>
  user?.id ? Effect.succeed(user.id) : Effect.fail(new AuthenticationError('User not authenticated'));
