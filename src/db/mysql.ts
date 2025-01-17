import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { track } from "./schema/track";
import { trackChanges } from "./schema/trackChanges";

const connPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const mydb = drizzle({
  client: connPool,
  schema: { track, trackChanges },
  casing: "snake_case",
  mode: "default",
});

export { mydb };
