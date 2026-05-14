import { describe, it, expect, vi } from "vitest";

// mock Next.js internals ที่ไม่มีใน test environment
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { query: vi.fn() } }));

import { cookies } from "next/headers";
import { getCurrentUser } from "../server";

// ทำไมทดสอบ getCurrentUser()?
//
// function นี้อ่าน cookie แล้วคืน "ตัวตน" ของผู้ใช้ปัจจุบัน
// ทุก page, ทุก server action ที่ต้องการ auth เรียก function นี้
// ถ้า parse ผิด → ผู้ใช้ทุกคนได้ role ผิด หรือถูกตี null โดยไม่มีเหตุผล
//
// เราทดสอบ 3 scenario ที่เป็น "กิ่ง" ของ logic:
//   1. ไม่มี cookie → null
//   2. cookie ถูก format → AuthUser
//   3. cookie ผิด format → null (ไม่ throw)

function makeSessionCookie(data: object): string {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

describe("getCurrentUser", () => {
  it("คืน null ถ้าไม่มี cookie", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    expect(await getCurrentUser()).toBeNull();
  });

  it("คืน AuthUser ถ้า cookie ถูกต้อง", async () => {
    const payload = makeSessionCookie({ userId: 1, role: "admin", name: "ทดสอบ" });
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: payload }),
    } as any);

    expect(await getCurrentUser()).toEqual({ id: 1, role: "admin", name: "ทดสอบ" });
  });

  it("map userId → id ถูกต้อง (field ใน cookie ≠ field ที่คืน)", async () => {
    // cookie เก็บ "userId" แต่ AuthUser type ใช้ "id"
    const payload = makeSessionCookie({ userId: 42, role: "staff", name: "พนักงาน" });
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: payload }),
    } as any);

    const result = await getCurrentUser();
    expect(result?.id).toBe(42);
  });

  it("คืน null ถ้า cookie เป็น string ที่ไม่ใช่ JSON ที่ถูกต้อง", async () => {
    // base64 ที่ decode ได้ แต่ JSON.parse ไม่ได้
    const garbage = Buffer.from("not-json-at-all!!!").toString("base64");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: garbage }),
    } as any);

    // ต้องไม่ throw — catch block ต้องทำงาน
    expect(await getCurrentUser()).toBeNull();
  });

  it("คืน null ถ้า cookie เป็น string ที่ไม่ใช่ base64 เลย", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "!!!not-base64!!!" }),
    } as any);

    expect(await getCurrentUser()).toBeNull();
  });
});
