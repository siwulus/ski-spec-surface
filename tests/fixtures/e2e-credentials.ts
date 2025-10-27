export const getE2ECredentials = (): { username: string; password: string } => {
  const { E2E_USERNAME, E2E_PASSWORD } = process.env;

  if (!E2E_USERNAME || !E2E_PASSWORD) {
    throw new Error('E2E_USERNAME and E2E_PASSWORD environment variables must be set in .env.e2e');
  }

  return { username: E2E_USERNAME, password: E2E_PASSWORD };
};
