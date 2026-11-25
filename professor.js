let turmas = [], atual = null;
const $ = (id) => document.getElementById(id);
$("titulo").textContent = "Olá, " + (sessionStorage.getItem("nome") || "");
$("cargo").textContent = { professor: "Professor(a)", coordenador: "Coordenador(a)", diretor: "Diretor(a)", responsavel: "Responsável geral" }[sessionStorage.getItem("cargo")] || "";

async function carregar() {
  turmas = await call("GET", "teacher/classes");
  const todos = await call("GET", "teacher/students");
  $("tTurmas").textContent = turmas.length; $("tAlunos").textContent = todos.length;
  $("turmas").innerHTML = turmas.length ? "" : '<p class="vazio">Crie sua primeira turma acima.</p>';
  turmas.forEach((t) => {
    const b = document.createElement("button");
    b.className = "chip" + (atual === t._id ? " on" : "");
    b.textContent = `${t.name} (${t.schoolYear}º ano)`;
    b.onclick = () => { atual = t._id; carregar(); };
    $("turmas").appendChild(b);
  });
  if (atual) await detalhe();
}
async function detalhe() {
  const t = turmas.find((x) => x._id === atual); if (!t) return;
  $("detalhe").hidden = false;
  $("dTitulo").textContent = `${t.name} - ${t.schoolYear}º ano`;
  $("dCodigo").textContent = "Código da turma: " + t.code;
  const al = await call("GET", "teacher/students?classId=" + atual);
  $("alunos").innerHTML = al.length ? "" : '<p class="vazio">Nenhum aluno ainda.</p>';
  al.forEach((a) => {
    const d = document.createElement("div"); d.className = "aluno-linha";
    d.innerHTML = `<span><b>${esc(a.fullName)}</b> · ${esc(a.username)} · ${a.xp || 0} XP</span>`;
    const x = document.createElement("button"); x.className = "mini"; x.textContent = "Excluir";
    x.onclick = async () => { if (confirm("Excluir " + a.fullName + "?")) { await call("DELETE", "teacher/students/" + a._id); carregar(); } };
    d.appendChild(x); $("alunos").appendChild(d);
  });
}
$("fTurma").onsubmit = async (e) => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
  try { const t = await call("POST", "teacher/classes", f); atual = t._id; e.target.reset(); await carregar(); } catch (x) { alert(x.message); }
};
$("fAluno").onsubmit = async (e) => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); f.classId = atual;
  try { await call("POST", "teacher/students", f); e.target.reset(); $("msg").textContent = "Aluno adicionado!"; await carregar(); } catch (x) { $("msg").textContent = x.message; }
};
carregar().catch((e) => alert(e.message));
