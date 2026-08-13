import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Credenciales hardcodeadas (un solo admin: Félix). Cambiar acá si hace falta.
const ADMIN_USER = "felix";
const ADMIN_PASSWORD = "felix2026";
// Secreto del HMAC de la cookie de sesión. Rotarlo invalida todas las sesiones.
const SESSION_SECRET = "f3l1x-p0rtf0l10-s3ss10n-s3cr3t-2026-08-12";

export const COOKIE_NAME = "felix_admin";
const SESSION_DAYS = 30;

function hmac(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function checkCredentials(user: string, password: string): boolean {
  // Ambas comparaciones siempre se ejecutan (sin short-circuit que filtre timing).
  const userOk = safeEqual(user, ADMIN_USER);
  const passOk = safeEqual(password, ADMIN_PASSWORD);
  return userOk && passOk;
}

export function createSessionToken(): string {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400);
  const payload = Buffer.from(exp).toString("base64url");
  return `${payload}.${hmac(exp)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  let exp: string;
  try {
    exp = Buffer.from(payload, "base64url").toString();
  } catch {
    return false;
  }
  if (!safeEqual(sig, hmac(exp))) return false;
  return Number(exp) > Math.floor(Date.now() / 1000);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  };
}

export class AuthError extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}

// Verificación real de sesión — llamar al inicio de CADA server action del
// admin (el proxy es solo un gate optimista de UX).
export async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) throw new AuthError();
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(COOKIE_NAME)?.value);
}
