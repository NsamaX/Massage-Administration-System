import { createHash, timingSafeEqual } from "crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
import { db } from "@/lib/db";
import type { AuthUser } from "../schema";

export async function getAuthUsers(): Promise<AuthUser[]> {
  const [rows] = await db.query(`
    SELECT
      u.id,
      r.name AS role,
      COALESCE(CONCAT(e.first_name, ' ', e.last_name),
        CASE r.name WHEN 'dev' THEN 'นักพัฒนา' ELSE 'Admin' END
      ) AS name
    FROM users u
    JOIN roles r    ON r.id = u.role_id
    LEFT JOIN employees e ON e.id = u.employee_id
    ORDER BY u.id
  `);
  return rows as AuthUser[];
}

export async function validatePin(
  userId: number,
  pin: string
): Promise<AuthUser | null> {
  const [rows] = await db.query(
    `SELECT u.id, r.name AS role,
            COALESCE(CONCAT(e.first_name, ' ', e.last_name),
        CASE r.name WHEN 'dev' THEN 'นักพัฒนา' ELSE 'Admin' END
      ) AS name,
            u.pin AS pin_hash
     FROM users u
     JOIN roles r    ON r.id = u.role_id
     LEFT JOIN employees e ON e.id = u.employee_id
     WHERE u.id = ?`,
    [userId]
  );
  const user = (rows as any[])[0];
  if (!user) return null;

  const pinHash = Buffer.from(sha256(pin), "hex");
  const stored = Buffer.from(user.pin_hash, "hex");
  if (pinHash.length !== stored.length) return null;
  if (!timingSafeEqual(pinHash, stored)) return null;

  await db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);

  return { id: user.id, role: user.role, name: user.name };
}

export function hashPin(pin: string): string {
  return sha256(pin);
}
