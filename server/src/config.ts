/**
 * Server URL and env config. Used for CORS, OAuth redirect URIs, etc.
 */
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5001;

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const config = {
  PORT,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  API_ORIGIN: process.env.API_ORIGIN ?? `http://localhost:${PORT}`,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  SESSION_COOKIE_NAME: "sid",
  SESSION_MAX_AGE_MS,
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;
