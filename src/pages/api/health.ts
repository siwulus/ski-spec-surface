import type { APIRoute } from 'astro';
import type { HealthCheckResponse } from '@/types/api.types';

export const prerender = false;

/**
 * GET /api/health
 * Health check endpoint that verifies database connectivity.
 *
 * No authentication required. Returns 200 when healthy or 503 when database is unavailable.
 * Response: HealthCheckResponse with status, timestamp, version, and optional error
 */
export const GET: APIRoute = async ({ locals }) => {
  const timestamp = new Date().toISOString();
  const version = '1.0.0';

  const { skiSpecService } = locals;
  try {
    // Test database connectivity via service
    const isHealthy = await skiSpecService.checkDatabaseConnection();

    if (!isHealthy) {
      const response: HealthCheckResponse = {
        status: 'unhealthy',
        timestamp,
        version,
        error: 'Database connection failed',
      };

      return new Response(JSON.stringify(response), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: HealthCheckResponse = {
      status: 'healthy',
      timestamp,
      version,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const response: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp,
      version,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(JSON.stringify(response), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
