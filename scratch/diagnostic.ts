import { db } from "./apps/api/src/db";
import { patients } from "./apps/api/src/db/schema";

async function test() {
  console.log("db type:", typeof db);
  console.log("db.select type:", typeof db.select);
  try {
    const q = db.select({ userId: patients.userId });
    console.log("q type:", typeof q);
    console.log("q has from:", typeof q?.from);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
