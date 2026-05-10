import "server-only";
import mysql from "mysql2/promise";

const g = global as typeof globalThis & { _db?: mysql.Pool };

g._db ??= mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "mas",
  connectionLimit: 10,
  waitForConnections: true,
});

export const db = g._db;
