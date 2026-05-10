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
    "SELECT id, name, description, duration_min AS duration, price, hourly_rate AS hourlyRate, image_url, status FROM massages ORDER BY CASE status WHEN 'active' THEN 1 WHEN 'inactive' THEN 2 WHEN 'paused' THEN 3 END, id"
  );
  return rows as Massage[];
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
  imageFile?: File | null
): Promise<ActionResult> {
  try {
    const [result] = await db.query(
      "INSERT INTO massages (name, description, duration_min, price, hourly_rate, status) VALUES (?, ?, ?, ?, ?, ?)",
      [data.name, data.description, data.duration, data.price, data.hourlyRate, data.status]
    );
    const id = (result as { insertId: number }).insertId;
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
  imageFile?: File | null
): Promise<ActionResult> {
  try {
    await db.query(
      "UPDATE massages SET name=?, description=?, duration_min=?, price=?, hourly_rate=?, status=? WHERE id=?",
      [data.name, data.description, data.duration, data.price, data.hourlyRate, data.status, id]
    );
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
