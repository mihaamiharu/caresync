export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  PORT: Number(process.env.PORT || 3001),
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
};
