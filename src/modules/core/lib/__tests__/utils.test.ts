import { describe, it, expect } from "vitest";
import { cn } from "../utils";

// ทำไมทดสอบ cn()?
// cn() ใช้ทุกที่ใน UI ถ้า filter ผิด จะได้ class name มี "false" หรือ "null" เป็น string
// ซึ่งไม่ทำให้ crash แต่ style พัง — "silent bug" ที่จับยาก

describe("cn", () => {
  it("รวม class หลายอัน", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("กรอง false ออก", () => {
    // กรณีนี้เกิดบ่อยใน: cn("base", isActive && "active")
    expect(cn("foo", false, "bar")).toBe("foo bar");
  });

  it("กรอง null ออก", () => {
    expect(cn("foo", null, "bar")).toBe("foo bar");
  });

  it("กรอง undefined ออก", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("คืนค่าว่างถ้าไม่มี argument ที่ผ่าน filter", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("รับ argument เดียว", () => {
    expect(cn("only")).toBe("only");
  });
});
