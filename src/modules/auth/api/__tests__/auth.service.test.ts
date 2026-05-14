import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { query: vi.fn() },
}));

import { hashPin, validatePin } from "../auth.service";
import { db } from "@/lib/db";

// ============================================================
// hashPin — pure function, ไม่ต้อง mock อะไร
// ============================================================

describe("hashPin", () => {
  it("คืนค่า SHA-256 hex string ขนาด 64 ตัวอักษร", () => {
    expect(hashPin("1234")).toHaveLength(64);
  });

  it("PIN เดียวกัน hash ออกมาเหมือนกันเสมอ (deterministic)", () => {
    expect(hashPin("1234")).toBe(hashPin("1234"));
  });

  it("PIN ต่างกัน hash ต่างกัน", () => {
    expect(hashPin("1234")).not.toBe(hashPin("5678"));
  });

  it("ผลลัพธ์เป็น hex เท่านั้น (0-9, a-f)", () => {
    expect(hashPin("9999")).toMatch(/^[0-9a-f]+$/);
  });
});

// ============================================================
// validatePin — ทำไมทดสอบ?
//
// นี่คือ "gate" ของระบบ auth ทั้งหมด
// ถ้า logic เปรียบ PIN ผิด → คนอื่น login เข้ามาได้
// ถ้า logic คืนค่าผิด → user ถูก logout โดยไม่มีเหตุผล
//
// เราไม่ทดสอบ DB query ตรงๆ แต่ทดสอบ "logic รอบ query":
//   - ถ้า DB ไม่เจอ user → คืน null
//   - ถ้า PIN ไม่ตรง → คืน null
//   - ถ้า PIN ตรง → คืน AuthUser และเรียก UPDATE
// ============================================================

describe("validatePin", () => {
  beforeEach(() => {
    // reset mock ระหว่าง test เพื่อไม่ให้ state รั่วข้ามกัน
    vi.mocked(db.query).mockReset();
  });

  it("คืน null ถ้าไม่มี user ใน DB", async () => {
    // simulate: SELECT ไม่เจอ row
    vi.mocked(db.query).mockResolvedValueOnce([[], []] as any);

    const result = await validatePin(999, "1234");

    expect(result).toBeNull();
  });

  it("คืน null ถ้า PIN ไม่ตรง", async () => {
    // simulate: DB เก็บ hash ของ "9999" แต่ input คือ "1234"
    const wrongHash = hashPin("9999");
    vi.mocked(db.query).mockResolvedValueOnce([
      [{ id: 1, role: "admin", name: "ทดสอบ", pin_hash: wrongHash }],
      [],
    ] as any);

    const result = await validatePin(1, "1234");

    expect(result).toBeNull();
  });

  it("คืน AuthUser ถ้า PIN ถูกต้อง", async () => {
    // simulate: DB เก็บ hash ที่ตรงกับ input
    const correctHash = hashPin("1234");
    vi.mocked(db.query)
      .mockResolvedValueOnce([
        [{ id: 1, role: "admin", name: "ทดสอบ", pin_hash: correctHash }],
        [],
      ] as any)
      // SELECT แล้วตาม UPDATE last_login_at
      .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

    const result = await validatePin(1, "1234");

    expect(result).toEqual({ id: 1, role: "admin", name: "ทดสอบ" });
  });

  it("เรียก UPDATE last_login_at เมื่อ login สำเร็จ", async () => {
    const correctHash = hashPin("1234");
    vi.mocked(db.query)
      .mockResolvedValueOnce([[{ id: 2, role: "staff", name: "ผู้ใช้", pin_hash: correctHash }], []] as any)
      .mockResolvedValueOnce([{ affectedRows: 1 }, []] as any);

    await validatePin(2, "1234");

    // db.query ถูกเรียก 2 ครั้ง: SELECT + UPDATE
    expect(vi.mocked(db.query)).toHaveBeenCalledTimes(2);
    // ตรวจว่า call ที่ 2 คือ UPDATE
    expect(vi.mocked(db.query).mock.calls[1][0]).toContain("UPDATE");
  });

  it("ไม่เรียก UPDATE ถ้า PIN ผิด", async () => {
    const wrongHash = hashPin("0000");
    vi.mocked(db.query).mockResolvedValueOnce([
      [{ id: 1, role: "admin", name: "ทดสอบ", pin_hash: wrongHash }],
      [],
    ] as any);

    await validatePin(1, "1234");

    // ถ้า PIN ผิด ต้องไม่ update last_login_at
    expect(vi.mocked(db.query)).toHaveBeenCalledTimes(1);
  });
});
