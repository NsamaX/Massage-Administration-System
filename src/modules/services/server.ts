"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Massage } from "./schema";

type ActionResult = { error: string | null };

function dbError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as any).code;
    if (code === "ER_DUP_ENTRY") return "ข้อมูลนี้มีอยู่แล้ว";
    if (code === "ER_ROW_IS_REFERENCED_2") return "ไม่สามารถลบได้ เนื่องจากมีนัดหมายที่ใช้บริการนี้อยู่";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

export async function getMassages(): Promise<Massage[]> {
  const [rows] = await db.query(
    `SELECT m.id, m.name, m.description, m.duration_min AS duration,
            m.price, m.hourly_rate AS hourlyRate, m.image_url, m.status,
            COALESCE(GROUP_CONCAT(md.duration_min ORDER BY md.duration_min SEPARATOR ','), '') AS duration_options
     FROM massages m
     LEFT JOIN massage_durations md ON md.massage_id = m.id
     GROUP BY m.id, m.name, m.description, m.duration_min, m.price, m.hourly_rate, m.image_url, m.status
     ORDER BY CASE m.status WHEN 'active' THEN 1 WHEN 'inactive' THEN 2 WHEN 'paused' THEN 3 END, m.id`
  );
  return (rows as any[]).map((r): Massage => ({
    id: r.id,
    name: r.name,
    description: r.description,
    duration: Number(r.duration),
    price: r.price,
    hourlyRate: r.hourlyRate,
    image_url: r.image_url ?? null,
    status: r.status,
    durations: r.duration_options
      ? (r.duration_options as string).split(",").map(Number)
      : [],
  }));
}

async function saveImageFile(file: File, serviceId: number): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${serviceId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "services");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/services/${filename}`;
}

export async function createMassage(
  data: Pick<Massage, "name" | "description" | "duration" | "price" | "hourlyRate" | "status">,
  durations: number[],
  imageFile?: File | null
): Promise<ActionResult> {
  try {
    const [result] = await db.query(
      "INSERT INTO massages (name, description, duration_min, price, hourly_rate, status) VALUES (?, ?, ?, ?, ?, ?)",
      [data.name, data.description, data.duration, data.price, data.hourlyRate, data.status]
    );
    const id = (result as { insertId: number }).insertId;
    if (durations.length > 0) {
      const values = durations.map(() => "(?, ?)").join(", ");
      await db.query(
        `INSERT IGNORE INTO massage_durations (massage_id, duration_min) VALUES ${values}`,
        durations.flatMap((d) => [id, d])
      );
    }
    if (imageFile && imageFile.size > 0) {
      const imageUrl = await saveImageFile(imageFile, id);
      await db.query("UPDATE massages SET image_url=? WHERE id=?", [imageUrl, id]);
    }
    revalidatePath("/services");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function updateMassage(
  id: number,
  data: Pick<Massage, "name" | "description" | "duration" | "price" | "hourlyRate" | "status">,
  durations: number[],
  imageFile?: File | null
): Promise<ActionResult> {
  try {
    await db.query(
      "UPDATE massages SET name=?, description=?, duration_min=?, price=?, hourly_rate=?, status=? WHERE id=?",
      [data.name, data.description, data.duration, data.price, data.hourlyRate, data.status, id]
    );
    await db.query("DELETE FROM massage_durations WHERE massage_id = ?", [id]);
    if (durations.length > 0) {
      const values = durations.map(() => "(?, ?)").join(", ");
      await db.query(
        `INSERT INTO massage_durations (massage_id, duration_min) VALUES ${values}`,
        durations.flatMap((d) => [id, d])
      );
    }
    if (imageFile && imageFile.size > 0) {
      const imageUrl = await saveImageFile(imageFile, id);
      await db.query("UPDATE massages SET image_url=? WHERE id=?", [imageUrl, id]);
    }
    revalidatePath("/services");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function deactivateMassage(id: number): Promise<ActionResult> {
  try {
    await db.query("UPDATE massages SET status='inactive' WHERE id=?", [id]);
    revalidatePath("/services");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function reactivateMassage(id: number): Promise<ActionResult> {
  try {
    await db.query("UPDATE massages SET status='active' WHERE id=?", [id]);
    revalidatePath("/services");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}

export async function deleteMassage(id: number): Promise<ActionResult> {
  try {
    await db.query("DELETE FROM massages WHERE id=?", [id]);
    revalidatePath("/services");
    return { error: null };
  } catch (err) {
    return { error: dbError(err) };
  }
}
