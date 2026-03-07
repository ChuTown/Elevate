import type { Request, Response, NextFunction } from "express";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { config } from "../config.js";

const { SESSION_COOKIE_NAME } = config;

export interface RequestWithSession extends Request {
  user?: InstanceType<typeof User> | null;
}

/**
 * Load session from cookie and attach user to req.user. Does not fail the request if no/invalid session.
 */
export async function loadSession(
  req: RequestWithSession,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId || typeof sessionId !== "string") {
    req.user = null;
    return next();
  }
  try {
    const session = await Session.findOne({
      sessionId,
      expiresAt: { $gt: new Date() },
    }).exec();
    if (!session) {
      req.user = null;
      return next();
    }
    const user = await User.findById(session.userId).exec();
    req.user = user ?? null;
  } catch {
    req.user = null;
  }
  next();
}

/**
 * Use on routes that require a logged-in user. Sends 401 if req.user is missing.
 */
export function requireAuth(
  req: RequestWithSession,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
