import { describe, it, expect } from "vitest";
import { toThai, toDateKey, getInitials } from "../dashboard-utils";

// ทำไมทดสอบ toThai()?
// ใช้ array index โดยตรง: THAI_DIGITS[Number(d)]
// ถ้า d ไม่ใช่ตัวเลข หรือ array ผิด → ได้ undefined แทนตัวเลขไทย

describe("toThai", () => {
  it("แปลงเลข 0 → ๐", () => {
    expect(toThai(0)).toBe("๐");
  });

  it("แปลงเลข 9 → ๙ (index ท้ายสุด)", () => {
    expect(toThai(9)).toBe("๙");
  });

  it("แปลงเลขหลายหลัก", () => {
    // 2024 → ๒๐๒๔  — ทดสอบว่า map แต่ละ digit ถูกต้อง
    expect(toThai(2024)).toBe("๒๐๒๔");
  });

  it("แปลงเลขที่มี 0 ในกลาง", () => {
    expect(toThai(101)).toBe("๑๐๑");
  });
});

// ทำไมทดสอบ toDateKey()?
// ต้องใส่ 0 นำหน้าเดือน/วัน < 10 เสมอ (padStart)
// ถ้าลืม → "2024-1-5" แทน "2024-01-05" → query ที่ใช้ key นี้พัง

describe("toDateKey", () => {
  it("ใส่ 0 นำหน้าเดือนและวันที่ < 10", () => {
    expect(toDateKey(new Date("2024-01-05T12:00:00"))).toBe("2024-01-05");
  });

  it("เดือนและวันที่ >= 10 ไม่ใส่ 0 นำหน้า", () => {
    expect(toDateKey(new Date("2024-12-25T12:00:00"))).toBe("2024-12-25");
  });

  it("เดือน 1 หลัก, วัน 2 หลัก", () => {
    expect(toDateKey(new Date("2024-03-15T12:00:00"))).toBe("2024-03-15");
  });
});

// ทำไมทดสอบ getInitials()?
// มี logic พิเศษสำหรับภาษาไทย: หา "พยัญชนะ" ตัวแรก ไม่ใช่ตัวอักษรตัวแรก
// ชื่อไทยมักขึ้นต้นด้วยสระ (เอกชัย, อรทัย) → ถ้าไม่จัดการให้ถูก ได้สระแทนพยัญชนะ

describe("getInitials", () => {
  it("ชื่อ 2 คำ ได้พยัญชนะแรกของแต่ละคำ", () => {
    expect(getInitials("สมชาย ใจดี")).toBe("สจ");
  });

  it("ชื่อที่ขึ้นต้นด้วยสระ (เช่น เอกชัย) ได้พยัญชนะแรก ไม่ใช่สระ", () => {
    // เ ไม่ใช่พยัญชนะ → ข้ามไป → อ คือพยัญชนะแรก
    expect(getInitials("เอกชัย")).toBe("อ");
  });

  it("ชื่อภาษาอังกฤษ ได้อักษรตัวแรก uppercase", () => {
    expect(getInitials("John Smith")).toBe("JS");
  });

  it("ชื่อคำเดียว ได้ 1 อักษร", () => {
    expect(getInitials("สมชาย")).toBe("ส");
  });

  it("ชื่อเกิน 2 คำ ใช้แค่ 2 คำแรก", () => {
    expect(getInitials("สมชาย ใจดี มีสุข")).toBe("สจ");
  });
});
