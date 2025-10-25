import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, pipe } from 'effect';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  NetworkError,
  BusinessLogicError,
  AuthOperationError,
  InvalidJsonError,
  UnexpectedError,
  type SkiSpecError,
} from '@/types/error.types';
import * as errorTypes from '@/types/error.types';
import {
  createErrorResponseEffect,
  logErrorEffect,
  handleSkiSpecError,
  catchValidationError,
  catchAuthenticationError,
  catchAuthorizationError,
  catchNotFoundError,
  catchConflictError,
  catchDatabaseError,
  catchNetworkError,
  catchBusinessLogicError,
  catchAuthOperationError,
  catchInvalidJsonError,
  catchUnexpectedError,
  catchAllSkiSpecErrors,
  wrapErrorEffect,
  withErrorLogging,
  type ErrorContext,
} from './error';

// Mock dependencies from @/types/error.types
vi.mock('@/types/error.types', async (importOriginal) => {
  const original = await importOriginal<typeof errorTypes>();
  return {
    ...original,
    logError: vi.fn(),
    createErrorResponse: vi.fn(
      (error: SkiSpecError) => new Response(JSON.stringify(error), { status: error.statusCode })
    ),
    wrapError: vi.fn((error, defaultMessage) => original.wrapError(error, defaultMessage)),
  };
});

const mockedErrorTypes = vi.mocked(errorTypes);

describe('Error Handling Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testError = new ValidationError('Test validation error', []);
  const testContext: ErrorContext = { endpoint: '/test', operation: 'testing' };

  describe('createErrorResponseEffect', () => {
    it('should call createErrorResponse and wrap the result in a succeeding Effect', () => {
      const effect = createErrorResponseEffect(testError);
      const exit = Effect.runSyncExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      expect(mockedErrorTypes.createErrorResponse).toHaveBeenCalledOnce();
      expect(mockedErrorTypes.createErrorResponse).toHaveBeenCalledWith(testError);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toBeInstanceOf(Response);
      }
    });
  });

  describe('logErrorEffect', () => {
    it('should call logError with the correct arguments', () => {
      const effect = logErrorEffect(testError, testContext);
      Effect.runSync(effect);

      expect(mockedErrorTypes.logError).toHaveBeenCalledOnce();
      expect(mockedErrorTypes.logError).toHaveBeenCalledWith(testError, testContext);
    });

    it('should return the original error in the success channel', () => {
      const effect = logErrorEffect(testError, testContext);
      const result = Effect.runSync(effect);

      expect(result).toBe(testError);
    });
  });

  describe('handleSkiSpecError', () => {
    it('should log the error and then create an error response', () => {
      const effect = handleSkiSpecError(testError, testContext);
      Effect.runSync(effect);

      expect(mockedErrorTypes.logError).toHaveBeenCalledOnce();
      expect(mockedErrorTypes.logError).toHaveBeenCalledWith(testError, testContext);
      expect(mockedErrorTypes.createErrorResponse).toHaveBeenCalledOnce();
      expect(mockedErrorTypes.createErrorResponse).toHaveBeenCalledWith(testError);

      const logErrorCallOrder = mockedErrorTypes.logError.mock.invocationCallOrder[0];
      const createErrorResponseCallOrder = mockedErrorTypes.createErrorResponse.mock.invocationCallOrder[0];
      expect(logErrorCallOrder).toBeLessThan(createErrorResponseCallOrder);
    });
  });

  describe('Pre-built Catch Handlers', () => {
    const handlers = {
      ValidationError: catchValidationError,
      AuthenticationError: catchAuthenticationError,
      AuthorizationError: catchAuthorizationError,
      NotFoundError: catchNotFoundError,
      ConflictError: catchConflictError,
      DatabaseError: catchDatabaseError,
      NetworkError: catchNetworkError,
      BusinessLogicError: catchBusinessLogicError,
      AuthOperationError: catchAuthOperationError,
      InvalidJsonError: catchInvalidJsonError,
      UnexpectedError: catchUnexpectedError,
    };

    const errorInstances: Record<string, SkiSpecError> = {
      ValidationError: new ValidationError('Test ValidationError', []),
      AuthenticationError: new AuthenticationError('Test AuthenticationError'),
      AuthorizationError: new AuthorizationError('Test AuthorizationError'),
      NotFoundError: new NotFoundError('Test NotFoundError'),
      ConflictError: new ConflictError('Test ConflictError'),
      DatabaseError: new DatabaseError('Test DatabaseError'),
      NetworkError: new NetworkError('Test NetworkError'),
      BusinessLogicError: new BusinessLogicError('Test BusinessLogicError'),
      AuthOperationError: new AuthOperationError('Test AuthOperationError'),
      InvalidJsonError: new InvalidJsonError('Test InvalidJsonError'),
      UnexpectedError: new UnexpectedError('Test UnexpectedError'),
    };

    describe.each(Object.keys(handlers))('catch%s', (errorType) => {
      it(`should create a handler for ${errorType} that calls handleSkiSpecError`, () => {
        const handler = handlers[errorType as keyof typeof handlers];
        const errorInstance = errorInstances[errorType as keyof typeof errorInstances];

        const catchEffect = (handler(testContext) as (error: SkiSpecError) => Effect.Effect<Response>)(errorInstance);
        Effect.runSync(catchEffect);

        expect(mockedErrorTypes.logError).toHaveBeenCalledOnce();
        expect(mockedErrorTypes.logError).toHaveBeenCalledWith(errorInstance, testContext);
        expect(mockedErrorTypes.createErrorResponse).toHaveBeenCalledOnce();
        expect(mockedErrorTypes.createErrorResponse).toHaveBeenCalledWith(errorInstance);
      });
    });
  });

  describe('catchAllSkiSpecErrors', () => {
    const errorCases: SkiSpecError[] = [
      new ValidationError('ValidationError', []),
      new AuthenticationError('AuthenticationError'),
      new AuthorizationError('AuthorizationError'),
      new NotFoundError('NotFoundError'),
      new ConflictError('ConflictError'),
      new DatabaseError('DatabaseError'),
      new NetworkError('NetworkError'),
      new BusinessLogicError('BusinessLogicError'),
      new AuthOperationError('AuthOperationError'),
      new InvalidJsonError('InvalidJsonError'),
      new UnexpectedError('UnexpectedError'),
    ];

    it('should not affect a succeeding effect', () => {
      const successEffect = Effect.succeed(new Response('Success!'));
      const handledEffect = pipe(successEffect, catchAllSkiSpecErrors(testContext));
      const exit = Effect.runSyncExit(handledEffect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toBeInstanceOf(Response);
      }
      expect(mockedErrorTypes.logError).not.toHaveBeenCalled();
    });

    describe.each(errorCases)('when catching a $constructor.name', (error) => {
      it('should handle the error, log it, and create a response', () => {
        const failingEffect = Effect.fail(error);
        const handledEffect = pipe(failingEffect, catchAllSkiSpecErrors(testContext));
        const exit = Effect.runSyncExit(handledEffect);

        expect(Exit.isSuccess(exit)).toBe(true);
        expect(mockedErrorTypes.logError).toHaveBeenCalledOnce();
        expect(mockedErrorTypes.logError).toHaveBeenCalledWith(error, testContext);
        expect(mockedErrorTypes.createErrorResponse).toHaveBeenCalledOnce();
        expect(mockedErrorTypes.createErrorResponse).toHaveBeenCalledWith(error);
      });
    });

    it('should handle an unknown error by wrapping it in UnexpectedError', () => {
      const unknownError = new Error('Something totally unexpected');
      const failingEffect = Effect.fail(unknownError as unknown as SkiSpecError);
      const handledEffect = pipe(failingEffect, catchAllSkiSpecErrors(testContext));
      const exit = Effect.runSyncExit(handledEffect);

      expect(Exit.isSuccess(exit)).toBe(true);
      expect(mockedErrorTypes.logError).toHaveBeenCalledOnce();
      const loggedError = mockedErrorTypes.logError.mock.calls[0][0];
      expect(loggedError).toBeInstanceOf(UnexpectedError);
      expect(loggedError.message).toBe('Unhandled error type');
      expect(loggedError.cause).toBe(unknownError);
      expect(mockedErrorTypes.createErrorResponse).toHaveBeenCalledOnce();
    });
  });

  describe('wrapErrorEffect', () => {
    it('should not affect a succeeding effect', () => {
      const successEffect = Effect.succeed('Success!');
      const wrappedEffect = wrapErrorEffect(successEffect);
      const result = Effect.runSync(wrappedEffect);
      expect(result).toBe('Success!');
    });

    it('should wrap an unknown error using the wrapError utility', () => {
      const unknownError = new Error('External library error');
      const failingEffect = Effect.fail(unknownError);
      const wrappedEffect = wrapErrorEffect(failingEffect, 'Default message');
      const exit = Effect.runSyncExit(wrappedEffect);

      expect(Exit.isFailure(exit)).toBe(true);
      expect(mockedErrorTypes.wrapError).toHaveBeenCalledOnce();
      expect(mockedErrorTypes.wrapError).toHaveBeenCalledWith(unknownError, 'Default message');

      if (Exit.isFailure(exit)) {
        const failure = exit.cause;
        if (failure._tag === 'Fail') {
          expect(failure.error).toBeInstanceOf(UnexpectedError);
        }
      }
    });
  });

  describe('withErrorLogging', () => {
    it('should not log anything on a succeeding effect', () => {
      const successEffect = Effect.succeed('Success!');
      const effectWithLogging = withErrorLogging(successEffect, testContext);
      const result = Effect.runSync(effectWithLogging);

      expect(result).toBe('Success!');
      expect(mockedErrorTypes.logError).not.toHaveBeenCalled();
    });

    it('should log an error but not handle it on a failing effect', () => {
      const failingEffect = Effect.fail(testError);
      const effectWithLogging = withErrorLogging(failingEffect, testContext);
      const exit = Effect.runSyncExit(effectWithLogging);

      expect(mockedErrorTypes.logError).toHaveBeenCalledOnce();
      expect(mockedErrorTypes.logError).toHaveBeenCalledWith(testError, testContext);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const failure = exit.cause;
        if (failure._tag === 'Fail') {
          expect(failure.error).toBe(testError);
        }
      }
    });
  });
});
