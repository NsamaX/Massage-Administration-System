"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { UserRow, EmployeeOption } from "./schema";

type ActionResult = { error: string | null };

function dbError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as any).code;
    if (code === "ER_DUP_ENTRY") return "ข้อมูลนี้มีอยู่แล้ว";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

export async function getUsers(): Promise<UserRow[]> {
  const [rows] = await db.query(`
    SELECT
      u.id,
      r.name AS role,
      COALESCE(CONCAT(e.first_name, ' ', e.last_name), CASE r.name WHEN 'dev' THEN 'นักพัฒนา' ELSE 'Admin' END) AS name,
      u.employee_id AS employeeId,
      u.last_login_at AS lastLoginAt
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN employees e ON e.id = u.employee_id
    ORDER BY u.id
  `);
  return rows as UserRow[];
}

export async function getAvailableEmployees(): Promise<EmployeeOption[]> {
  const [rows] = await db.query(`
    SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) AS name
    FROM employees e
    WHERE e.employment_status = 'employed'
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.employee_id = e.id)
    ORDER BY e.first_name
  `);
  return rows as EmployeeOption[];
}

export async function createUser(data: {
  roleName: "dev" | "admin" | "staff";
  employeeId: number | null;
  pin: string;
}): Promise<ActionResult> {
  if (!/^\d{4}$/.test(data.pin)) return { error: "PIN ต้องเป็นตัวเลข 4 หลัก" };
  try {
    const pinHash = await bcrypt.hash(data.pin, 10);
    const [roleRows] = await db.query("SELECT id FROM roles WHERE name = ?", [data.roleName]);
    const roleId = (roleRows as any[])[0]?.id;
    if (!roleId) return { error: "ไม่พบ role ที่ระบุ" };
    await db.query(
      "INSERT INTO users (employee_id, role_id, pin) VALUES (?, ?, ?)",
      [data.employeeId ?? null, roleId, pinHash]
    );
    revalidatePath("/users");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function updatePin(userId: number, pin: string): Promise<ActionResult> {
  if (!/^\d{4}$/.test(pin)) return { error: "PIN ต้องเป็นตัวเลข 4 หลัก" };

  const cookieStore = await cookies();
  const session = cookieStore.get("mas-session")?.value;
  if (!session) return { error: "ไม่ได้รับอนุญาต" };
  const caller = JSON.parse(Buffer.from(session, "base64").toString("utf8")) as { userId: number; role: string };

  if (caller.role !== "dev") {
    const [rows] = await db.query("SELECT r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?", [userId]);
    const targetRole = (rows as any[])[0]?.role as string | undefined;
    const isSelf = caller.userId === userId;
    if (!isSelf && targetRole !== "staff") return { error: "ไม่มีสิทธิ์แก้ PIN ของผู้ใช้นี้" };
  }

  try {
    const pinHash = await bcrypt.hash(pin, 10);
    await db.query("UPDATE users SET pin=? WHERE id=?", [pinHash, userId]);
    revalidatePath("/users");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function deleteUser(userId: number): Promise<ActionResult> {
  try {
    await db.query("DELETE FROM users WHERE id=?", [userId]);
    revalidatePath("/users");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}
