import "server-only";
import mysql from "mysql2/promise";

const g = global as typeof globalThis & { _db?: mysql.Pool };

if (!g._db) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "mas",
    timezone: "+07:00",
    connectionLimit: 10,
    waitForConnections: true,
  });

  pool.on("connection", (conn) => {
    conn.query("SET time_zone = '+07:00'");
  });

  g._db = pool;
}

export const db = g._db!;
