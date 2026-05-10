"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Employee, Skill } from "./schema";

type ActionResult = { error: string | null };

function dbError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as any).code;
    if (code === "ER_DUP_ENTRY") return "ข้อมูลนี้มีอยู่แล้ว";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

export async function getEmployees(): Promise<Employee[]> {
  const [rows] = await db.query(`
    SELECT
      e.id,
      e.first_name        AS firstName,
      e.last_name         AS lastName,
      e.phone,
      e.image_url         AS imageUrl,
      e.employment_status = 'employed'       AS employed,
      CASE WHEN a.status = 'present' THEN 1 ELSE 0 END AS present,
      GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ',') AS skills
    FROM employees e
    LEFT JOIN employee_skills es ON es.employee_id = e.id
    LEFT JOIN skills s           ON s.id = es.skill_id
    LEFT JOIN attendance a       ON a.employee_id = e.id AND a.date = CURDATE()
    GROUP BY e.id
    ORDER BY (e.employment_status = 'terminated'), e.id
  `);

  return (rows as any[]).map((row) => ({
    ...row,
    employed: row.employed === 1,
    present: row.present === 1,
    skills: row.skills ? row.skills.split(",") : [],
  }));
}

async function saveEmployeeImageFile(file: File, employeeId: number): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${employeeId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "employees");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/employees/${filename}`;
}

export async function updateEmployee(
  id: number,
  data: Pick<Employee, "firstName" | "lastName" | "phone" | "employed" | "skills">,
  imageFile?: File | null
): Promise<ActionResult> {
  try {
    await db.query(
      "UPDATE employees SET first_name=?, last_name=?, phone=?, employment_status=? WHERE id=?",
      [data.firstName, data.lastName, data.phone, data.employed ? "employed" : "terminated", id]
    );

    await db.query("DELETE FROM employee_skills WHERE employee_id=?", [id]);

    if (data.skills.length > 0) {
      const [skillRows] = await db.query(
        "SELECT id FROM skills WHERE name IN (?)",
        [data.skills]
      );
      const pairs = (skillRows as any[]).map((r) => [id, r.id]);
      if (pairs.length > 0) {
        await db.query("INSERT INTO employee_skills (employee_id, skill_id) VALUES ?", [pairs]);
      }
    }

    if (imageFile && imageFile.size > 0) {
      const imageUrl = await saveEmployeeImageFile(imageFile, id);
      await db.query("UPDATE employees SET image_url=? WHERE id=?", [imageUrl, id]);
    }

    revalidatePath("/staff");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function createEmployee(
  data: Pick<Employee, "firstName" | "lastName" | "phone" | "skills">,
  imageFile?: File | null
): Promise<ActionResult> {
  try {
    const [result] = await db.query(
      "INSERT INTO employees (first_name, last_name, phone, employment_status) VALUES (?, ?, ?, 'employed')",
      [data.firstName, data.lastName, data.phone]
    );
    const id = (result as { insertId: number }).insertId;

    if (data.skills.length > 0) {
      const [skillRows] = await db.query(
        "SELECT id FROM skills WHERE name IN (?)",
        [data.skills]
      );
      const pairs = (skillRows as any[]).map((r) => [id, r.id]);
      if (pairs.length > 0) {
        await db.query("INSERT INTO employee_skills (employee_id, skill_id) VALUES ?", [pairs]);
      }
    }

    if (imageFile && imageFile.size > 0) {
      const imageUrl = await saveEmployeeImageFile(imageFile, id);
      await db.query("UPDATE employees SET image_url=? WHERE id=?", [imageUrl, id]);
    }

    revalidatePath("/staff");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function getSkills(): Promise<Skill[]> {
  const [rows] = await db.query("SELECT id, name FROM skills ORDER BY name");
  return rows as Skill[];
}

export async function createSkill(name: string): Promise<ActionResult> {
  try {
    await db.query("INSERT INTO skills (name) VALUES (?)", [name.trim()]);
    revalidatePath("/staff");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function updateSkill(id: number, name: string): Promise<ActionResult> {
  try {
    await db.query("UPDATE skills SET name=? WHERE id=?", [name.trim(), id]);
    revalidatePath("/staff");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function deleteSkill(id: number): Promise<ActionResult> {
  try {
    await db.query("DELETE FROM employee_skills WHERE skill_id=?", [id]);
    await db.query("DELETE FROM skills WHERE id=?", [id]);
    revalidatePath("/staff");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function toggleAttendance(employeeId: number): Promise<ActionResult> {
  try {
    await db.query(
      `INSERT INTO attendance (employee_id, date, status)
       VALUES (?, CURDATE(), 'present')
       ON DUPLICATE KEY UPDATE status = IF(status = 'present', 'absent', 'present')`,
      [employeeId]
    );
    revalidatePath("/staff");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}
