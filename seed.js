// Cria/atualiza a conta de teste. SOMENTE desenvolvimento.
try { require("dotenv").config(); } catch {}
const bcrypt = require("bcryptjs");
const { getDb } = require("../lib/db");

(async () => {
  if (process.env.NODE_ENV === "production" || process.env.CONTEXT === "production" || process.env.NETLIFY === "true") {
    console.error("BLOQUEADO: o seed da conta de teste nao roda em producao."); process.exit(1);
  }
  let cfg;
  try { cfg = require("../config/testAccount").TEST_STUDENT; }
  catch { console.error("Arquivo backend/src/config/testAccount.js nao encontrado."); process.exit(1); }
  if (!cfg.password || !cfg.password.trim()) {
    console.log("Conta de teste PENDENTE: preencha o campo password em backend/src/config/testAccount.js e rode: npm run seed");
    process.exit(0);
  }
  const db = await getDb();
  await db.collection("students").updateOne(
    { usernameLower: cfg.username.toLowerCase() },
    { $set: { fullName: cfg.fullName, username: cfg.username, usernameLower: cfg.username.toLowerCase(),
        passwordHash: await bcrypt.hash(cfg.password, 12), schoolYear: cfg.schoolYear, isTestAccount: true },
      $setOnInsert: { xp: 0, coins: 0, classId: null, teacherId: null, createdAt: new Date() } },
    { upsert: true });
  console.log(`Conta de teste "${cfg.username}" criada/atualizada.`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
