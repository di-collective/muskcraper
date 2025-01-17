import { mysqlEnum, mysqlTable, serial, varchar } from "drizzle-orm/mysql-core";

export const track = mysqlTable("track", {
  id: serial().primaryKey(),
  username: varchar({ length: 256 }),
  platform: mysqlEnum(["x", "facebook", "instagram"]),
  status: mysqlEnum(["track", "untrack"]).default("track"),
});
