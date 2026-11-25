const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDb } = require("../../backend/src/lib/db");
const { sign, authenticate } = require("../../backend/src/lib/auth");
const { json, fail } = require("../../backend/src/lib/http");
const { str, isEmail, isUsername, isName } = require("../../backend/src/lib/validate");

const YEARS = [1, 2, 3, 4, 5];
const oid = (v) => { try { return new ObjectId(String(v)); } catch { return null; } };
const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const dup = (e) => (e.code === 11000 ? null : Promise.reject(e));

exports.handler = async (event) => {
  try {
    const path = event.path.replace(/^.*\/api\/?/, "").replace(/\/$/, "");
    const m = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    const db = await getDb();

    if (m === "POST" && path === "teacher/register") {
      const CARGOS = ["professor", "coordenador", "diretor", "responsavel"];
      const cargo = str(body.cargo) || "professor";
      const name = str(body.name), username = str(body.username), email = str(body.email).toLowerCase(), pw = str(body.password);
      if (!CARGOS.includes(cargo) || !isName(name) || !isUsername(username) || !isEmail(email) || pw.length < 8) return fail(400, "Dados invalidos (usuario: letras, numeros, _ . -; senha minima: 8).");
      const r = await db.collection("teachers").insertOne({
        name, cargo, username, usernameLower: username.toLowerCase(), email, passwordHash: await bcrypt.hash(pw, 12), createdAt: new Date(),
      }).catch(dup);
      if (!r) return fail(409, "Usuario ou e-mail ja cadastrado.");
      return json(201, { token: sign({ role: "teacher", id: String(r.insertedId) }), name });
    }
    if (m === "POST" && path === "teacher/login") {
      const t = await db.collection("teachers").findOne({ usernameLower: str(body.username).toLowerCase() });
      if (!t || !(await bcrypt.compare(str(body.password), t.passwordHash))) return fail(401, "Usuario ou senha incorretos.");
      return json(200, { token: sign({ role: "teacher", id: String(t._id) }), name: t.name, cargo: t.cargo || "professor" });
    }

    if (m === "POST" && path === "student/login") {
      const s = await db.collection("students").findOne({ usernameLower: str(body.username).toLowerCase() });
      if (!s || !(await bcrypt.compare(str(body.password), s.passwordHash))) return fail(401, "Usuario ou senha incorretos.");
      const cls = s.classId ? await db.collection("classes").findOne({ _id: s.classId }) : null;
      const teacher = s.teacherId ? await db.collection("teachers").findOne({ _id: s.teacherId }) : null;
      return json(200, {
        token: sign({ role: "student", id: String(s._id) }, "30d"),
        student: { fullName: s.fullName, schoolYear: s.schoolYear, className: cls ? cls.name : null, teacherName: teacher ? teacher.name : null },
      });
    }
    if (path === "student/results") {
      const a = authenticate(event, "student");
      if (!a) return fail(401, "Nao autorizado.");
      const studentId = oid(a.id);
      if (m === "GET")
        return json(200, await db.collection("results").find({ studentId }).project({ studentId: 0 }).sort({ playedAt: -1 }).limit(20).toArray());
      if (m === "POST") {
        const list = Array.isArray(body.results) ? body.results.slice(0, 50) : [];
        const n = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
        const done = []; let xpGain = 0, coinGain = 0;
        for (const r of list) {
          const clientId = str(r.clientId);
          if (!/^[A-Za-z0-9-]{8,64}$/.test(clientId)) continue;
          const doc = { studentId, clientId, game: str(r.game).slice(0, 60), subject: str(r.subject).slice(0, 40),
            difficulty: str(r.difficulty).slice(0, 12), correct: n(r.correct, 500), wrong: n(r.wrong, 500),
            score: n(r.score, 100000), seconds: n(r.seconds, 7200),
            playedAt: isNaN(Date.parse(r.playedAt)) ? new Date() : new Date(r.playedAt), syncedAt: new Date() };
          try { await db.collection("results").insertOne(doc); xpGain += doc.correct * 5; coinGain += doc.correct; }
          catch (e) { if (e.code !== 11000) throw e; } // duplicado: ja salvo antes
          done.push(clientId);
        }
        if (xpGain) await db.collection("students").updateOne({ _id: studentId }, { $inc: { xp: xpGain, coins: coinGain } });
        return json(200, { done });
      }
    }
    if (m === "GET" && path === "student/me") {
      const a = authenticate(event, "student");
      if (!a) return fail(401, "Nao autorizado.");
      const s = await db.collection("students").findOne({ _id: oid(a.id) });
      if (!s) return fail(404, "Aluno nao encontrado.");
      const cls = s.classId ? await db.collection("classes").findOne({ _id: s.classId }) : null;
      const teacher = s.teacherId ? await db.collection("teachers").findOne({ _id: s.teacherId }) : null;
      const xp = s.xp || 0;
      return json(200, { fullName: s.fullName, schoolYear: s.schoolYear, className: cls ? cls.name : null,
        teacherName: teacher ? teacher.name : null, xp, coins: s.coins || 0, level: Math.floor(xp / 100) + 1 });
    }

    if (path.startsWith("teacher/")) {
      const a = authenticate(event, "teacher");
      if (!a) return fail(401, "Nao autorizado.");
      const teacherId = oid(a.id);

      if (m === "GET" && path === "teacher/classes")
        return json(200, await db.collection("classes").find({ teacherId }).project({ teacherId: 0 }).toArray());

      if (m === "POST" && path === "teacher/classes") {
        const name = str(body.name), year = Number(body.schoolYear);
        if (name.length < 2 || name.length > 40 || !YEARS.includes(year)) return fail(400, "Nome ou ano escolar invalido.");
        const doc = { name, schoolYear: year, teacherId, code: code(), createdAt: new Date() };
        const r = await db.collection("classes").insertOne(doc);
        return json(201, { _id: r.insertedId, name, schoolYear: year, code: doc.code });
      }

      if (m === "GET" && path === "teacher/students") {
        const f = { teacherId };
        const q = event.queryStringParameters || {};
        if (q.classId) f.classId = oid(q.classId);
        return json(200, await db.collection("students").find(f).project({ passwordHash: 0, usernameLower: 0 }).toArray());
      }

      if (m === "POST" && path === "teacher/students") {
        const fullName = str(body.fullName), username = str(body.username), pw = str(body.password);
        const classId = oid(body.classId);
        if (!isName(fullName) || !isUsername(username) || pw.length < 6 || !classId)
          return fail(400, "Todos os campos sao obrigatorios (senha minima: 6; usuario: letras, numeros, _ . -).");
        const cls = await db.collection("classes").findOne({ _id: classId, teacherId });
        if (!cls) return fail(404, "Turma nao encontrada.");
        const r = await db.collection("students").insertOne({
          fullName, username, usernameLower: username.toLowerCase(), passwordHash: await bcrypt.hash(pw, 12),
          classId, teacherId, schoolYear: cls.schoolYear, xp: 0, coins: 0, createdAt: new Date(),
        }).catch(dup);
        if (!r) return fail(409, "Nome de usuario ja esta em uso.");
        return json(201, { _id: r.insertedId, fullName, username, schoolYear: cls.schoolYear });
      }

      const mm = path.match(/^teacher\/students\/([a-f0-9]{24})$/);
      if (mm && m === "DELETE") {
        const r = await db.collection("students").deleteOne({ _id: oid(mm[1]), teacherId });
        return r.deletedCount ? json(200, { ok: true }) : fail(404, "Aluno nao encontrado.");
      }
    }
    return fail(404, "Rota nao encontrada.");
  } catch (e) {
    console.error(e);
    return fail(500, "Erro interno.");
  }
};
