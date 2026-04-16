export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  PORT: Number(process.env.PORT || 3000),
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "./uploads",
  MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024),
};
