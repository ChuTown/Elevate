import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { config } from "../config.js";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import type { RequestWithSession } from "../middleware/session.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_REDIRECT_PATH = "/api/auth/google/callback";
const GOOGLE_SCOPES = "openid email profile";

export function createAuthRouter() {
  const router = Router();
  const {
    FRONTEND_ORIGIN,
    API_ORIGIN,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_MS,
    NODE_ENV,
  } = config;
  const GOOGLE_REDIRECT_URI = `${API_ORIGIN}${GOOGLE_REDIRECT_PATH}`;
  const isProduction = NODE_ENV === "production";

  router.get("/google", (req: Request, res: Response) => {
    if (!GOOGLE_CLIENT_ID) {
      return res.redirect(`${FRONTEND_ORIGIN}/login?error=oauth_not_configured`);
    }
    const state = Math.random().toString(36).slice(2);
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      state,
      access_type: "offline",
      prompt: "consent",
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  router.get("/google/callback", async (req: Request, res: Response) => {
    const { code, error } = req.query;
    if (error) {
      return res.redirect(
        `${FRONTEND_ORIGIN}/login?error=${encodeURIComponent(String(error))}`
      );
    }
    if (!code || typeof code !== "string") {
      return res.redirect(`${FRONTEND_ORIGIN}/login?error=missing_code`);
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${FRONTEND_ORIGIN}/login?error=oauth_not_configured`);
    }
    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: GOOGLE_REDIRECT_URI,
        }),
      });
      const data = (await tokenRes.json()) as {
        access_token?: string;
        id_token?: string;
        error?: string;
      };
      if (!tokenRes.ok || data.error || !data.access_token) {
        return res.redirect(
          `${FRONTEND_ORIGIN}/login?error=${encodeURIComponent(data.error ?? "token_exchange_failed")}`
        );
      }
      const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (!userinfoRes.ok) {
        return res.redirect(`${FRONTEND_ORIGIN}/login?error=userinfo_failed`);
      }
      const profile = (await userinfoRes.json()) as {
        email?: string;
        name?: string;
        picture?: string;
        given_name?: string;
        family_name?: string;
      };
      const email = profile.email?.trim().toLowerCase();
      if (!email) {
        return res.redirect(`${FRONTEND_ORIGIN}/login?error=no_email`);
      }
      const name =
        (profile.name ?? [profile.given_name, profile.family_name].filter(Boolean).join(" ")) || email;
      let user = await User.findOne({ email }).exec();
      if (!user) {
        user = await User.create({ email, name });
      }
      const sessionId = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
      await Session.create({ sessionId, userId: user._id, expiresAt });
      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: SESSION_MAX_AGE_MS,
        path: "/",
      });
      const redirectUrl = new URL("/", FRONTEND_ORIGIN);
      res.redirect(redirectUrl.toString());
    } catch (err) {
      console.error("Google OAuth token exchange error:", err);
      res.redirect(`${FRONTEND_ORIGIN}/login?error=server_error`);
    }
  });

  router.get("/me", (req: RequestWithSession, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ user: null });
    }
    res.json({
      user: {
        _id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        profile: req.user.profile,
      },
    });
  });

  router.post("/logout", async (req: RequestWithSession, res: Response) => {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId) {
      await Session.deleteOne({ sessionId }).exec();
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    res.status(204).end();
  });

  return router;
}
