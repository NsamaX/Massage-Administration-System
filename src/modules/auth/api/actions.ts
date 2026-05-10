"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validatePin } from "./auth.service";
import type { SignInState } from "../schema";

const SESSION_COOKIE = "mas-session";

export async function signIn(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const userId = Number(formData.get("userId"));
  const pin = String(formData.get("pin") ?? "");

  if (!userId || pin.length !== 4) return { error: "PIN ไม่ถูกต้อง" };

  const user = await validatePin(userId, pin);
  if (!user) return { error: "PIN ไม่ถูกต้อง" };

  const payload = Buffer.from(
    JSON.stringify({ userId: user.id, role: user.role, name: user.name })
  ).toString("base64");

  (await cookies()).set(SESSION_COOKIE, payload, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/dashboard");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
