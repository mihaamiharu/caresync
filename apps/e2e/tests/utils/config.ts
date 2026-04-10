export const config = {
  // Use environment variable if provided, otherwise default to local dev API port
  apiUrl: process.env.API_URL || 'http://localhost:3000',
};
