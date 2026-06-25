import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { adminAuth } from "../lib/firebase-admin.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
  firebaseUser?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || "cafe_manager_secret_key_123456";

// Manual cookie parser helper
const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      const name = parts.shift()!.trim();
      list[name] = decodeURIComponent(parts.join("="));
    }
  });
  return list;
};

// Admin authentication middleware protecting /api/admin/*
export const requireAdminAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Check for JWT inside httpOnly cookie
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.admin_token;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role || "owner",
        };
        return next();
      } catch (err) {
        // Token in cookie is invalid, try headers or return unauthorized
        console.warn("Invalid JWT in cookie", err);
      }
    }

    // 2. Fallback to Authorization Header (Firebase Token or Bearer JWT)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const bearerToken = authHeader.split("Bearer ")[1];
      
      // Try local JWT verification first
      try {
        const decoded = jwt.verify(bearerToken, JWT_SECRET) as any;
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role || "owner",
        };
        return next();
      } catch (err) {
        // If not a local JWT, try Firebase Auth
        try {
          const decodedFirebase = await adminAuth.verifyIdToken(bearerToken);
          req.firebaseUser = decodedFirebase;
          req.user = {
            userId: 999999, // Surrogate id for Firebase users
            email: decodedFirebase.email || "",
            role: "owner",
          };
          return next();
        } catch (fbErr) {
          console.error("Failed both JWT and Firebase verification:", fbErr);
        }
      }
    }

    return res.status(401).json({ error: "Unauthorized: Owner session required" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error during authentication" });
  }
};
