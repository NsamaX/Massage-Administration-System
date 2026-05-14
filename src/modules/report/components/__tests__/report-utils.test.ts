import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatDateThai,
  formatPeriodShort,
  addOneDay,
} from "../report-utils";

// ทำไมทดสอบ formatDuration()?
// มี if-else 3 กิ่ง และค่า boundary ที่ 60 นาที
// ถ้าลำดับ if ผิด: 60 นาที อาจได้ "1 ชม. 0 นาที" แทน "1 ชม." — ไม่ crash แต่ดูแปลก
//
// Logic:
//   min % 60 === 0  →  "X ชม."
//   min > 60        →  "X ชม. Y นาที"
//   else            →  "X นาที"

describe("formatDuration", () => {
  it("น้อยกว่า 1 ชม. แสดงเป็นนาที", () => {
    expect(formatDuration(45)).toBe("45 นาที");
  });

  it("30 นาที แสดงเป็นนาที ไม่ใช่ชั่วโมง", () => {
    expect(formatDuration(30)).toBe("30 นาที");
  });

  it("ครบ 1 ชม. พอดี แสดงเป็น '1 ชม.' ไม่มี '0 นาที'", () => {
    // boundary case: 60 % 60 === 0 → branch แรก
    expect(formatDuration(60)).toBe("1 ชม.");
  });

  it("ครบ 2 ชม. พอดี แสดงเป็น '2 ชม.'", () => {
    expect(formatDuration(120)).toBe("2 ชม.");
  });

  it("มากกว่า 1 ชม. แต่ไม่ครบ แสดงทั้งชั่วโมงและนาที", () => {
    expect(formatDuration(90)).toBe("1 ชม. 30 นาที");
  });

  it("1 ชม. 15 นาที", () => {
    expect(formatDuration(75)).toBe("1 ชม. 15 นาที");
  });
});

// ทำไมทดสอบ formatDateThai()?
// ต้องแปลงปีจาก ค.ศ. เป็น พ.ศ. (+543) และ lookup ชื่อเดือนภาษาไทย
// ถ้าลืม +543 → แสดงปี ค.ศ. แทน พ.ศ. — ผู้ใช้ไทยสับสนทันที
// ถ้า index เดือนผิด 1 ตำแหน่ง → ชื่อเดือนเพี้ยนทั้งระบบ

describe("formatDateThai", () => {
  it("แปลงปี ค.ศ. เป็น พ.ศ. (+543)", () => {
    expect(formatDateThai("2024-01-15")).toBe("15 ม.ค. 2567");
  });

  it("เดือน 12 (ธันวาคม) — index ท้ายสุดของ array", () => {
    expect(formatDateThai("2024-12-31")).toBe("31 ธ.ค. 2567");
  });

  it("เดือน 6 (มิถุนายน)", () => {
    expect(formatDateThai("2024-06-01")).toBe("1 มิ.ย. 2567");
  });

  it("วันที่ 1 ของเดือน ไม่มี 0 นำหน้าในผลลัพธ์", () => {
    // ผลลัพธ์เป็น "1 ม.ค." ไม่ใช่ "01 ม.ค."
    expect(formatDateThai("2024-01-01")).toBe("1 ม.ค. 2567");
  });
});

// ทำไมทดสอบ formatPeriodShort()?
// มี 2 code path: ช่วงเดือนเดียวกัน vs ข้ามเดือน
// Code path ที่ 2 ต้องแสดงชื่อเดือน 2 ครั้ง — ถ้า logic ผิดจะแสดงช่วงเวลาหลอก

describe("formatPeriodShort", () => {
  it("ช่วงในเดือนเดียวกัน — แสดงชื่อเดือนครั้งเดียว", () => {
    expect(formatPeriodShort("2024-01-01", "2024-01-07")).toBe("1–7 ม.ค. 2567");
  });

  it("ช่วงข้ามเดือน — แสดงชื่อเดือนของทั้งสองฝั่ง", () => {
    expect(formatPeriodShort("2024-01-28", "2024-02-03")).toBe(
      "28 ม.ค. – 3 ก.พ. 2567"
    );
  });

  it("ช่วงข้ามปี — ใช้ปีของวันสุดท้าย", () => {
    expect(formatPeriodShort("2023-12-28", "2024-01-03")).toBe(
      "28 ธ.ค. – 3 ม.ค. 2567"
    );
  });
});

// ทำไมทดสอบ addOneDay()?
// ใช้ JS Date arithmetic ซึ่ง tricky มากเรื่อง month-end / year-end rollover
// ถ้าทำ setDate(32) บน JS Date มันจะ rollover ถูก แต่ถ้า implement เองโดย parse string อาจผิด

describe("addOneDay", () => {
  it("วันธรรมดา", () => {
    expect(addOneDay("2024-01-15")).toBe("2024-01-16");
  });

  it("ข้ามเดือน (31 ม.ค. → 1 ก.พ.)", () => {
    // ต้องการ rollover เดือนที่ถูกต้อง
    expect(addOneDay("2024-01-31")).toBe("2024-02-01");
  });

  it("ข้ามปี (31 ธ.ค. → 1 ม.ค. ปีถัดไป)", () => {
    expect(addOneDay("2023-12-31")).toBe("2024-01-01");
  });

  it("ผลลัพธ์ต้องมี 0 นำหน้าเดือนและวันที่ < 10", () => {
    expect(addOneDay("2024-01-09")).toBe("2024-01-10");
  });
});
