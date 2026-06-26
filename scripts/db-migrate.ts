import { initializeDatabase } from "../src/server/db";

const status = initializeDatabase();

console.log(
  JSON.stringify(
    {
      ok: true,
      action: "migrate",
      database: status,
    },
    null,
    2,
  ),
);
