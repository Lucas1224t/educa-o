const { MongoClient } = require("mongodb");
let client, indexed = false;
async function getDb() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI nao configurada");
  if (!client) client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "educaplay");
  if (!indexed) {
    await db.collection("teachers").createIndex({ email: 1 }, { unique: true });
    await db.collection("teachers").createIndex({ usernameLower: 1 }, { unique: true });
    await db.collection("students").createIndex({ usernameLower: 1 }, { unique: true });
    await db.collection("classes").createIndex({ teacherId: 1 });
    await db.collection("classes").createIndex({ code: 1 }, { unique: true });
    await db.collection("results").createIndex({ studentId: 1, clientId: 1 }, { unique: true });
    indexed = true;
  }
  return db;
}
module.exports = { getDb };
