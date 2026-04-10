export const config = {
  // Use environment variable if provided, otherwise default to local dev API port
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  // Admin credentials for tests that require admin access (set via env vars or seed data)
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
};
