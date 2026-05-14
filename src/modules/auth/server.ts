"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn as _signIn, signOut as _signOut } from "./api/actions";
import {
  getAuthUsers as _getAuthUsers,
  hashPin as _hashPin,
} from "./api/auth.service";
import type { AuthUser } from "./schema";

export async function signIn(...args: Parameters<typeof _signIn>) {
  return _signIn(...args);
}

export async function signOut(...args: Parameters<typeof _signOut>) {
  return _signOut(...args);
}

export async function getAuthUsers(...args: Parameters<typeof _getAuthUsers>) {
  return _getAuthUsers(...args);
}

export async function hashPin(...args: Parameters<typeof _hashPin>) {
  return _hashPin(...args);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("mas-session")?.value;
  if (!session) return null;
  try {
    const data = JSON.parse(Buffer.from(session, "base64").toString("utf8"));
    return { id: data.userId, role: data.role, name: data.name };
  } catch {
    return null;
  }
}

export async function requireRole(allowed: AuthUser["role"][]): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || !allowed.includes(user.role)) redirect("/dashboard");
  return user;
}
