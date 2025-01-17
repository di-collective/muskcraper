import { bigint, json, mysqlTable, serial } from "drizzle-orm/mysql-core";

export const trackChanges = mysqlTable("track_changes", {
  id: serial().primaryKey(),
  trackId: bigint({ mode: "number", unsigned: true }).notNull(),
  revision: bigint({ mode: "number", unsigned: true }).notNull(),
  hash: bigint({ mode: "number", unsigned: true }).notNull(),
  value: json().notNull(),
});
