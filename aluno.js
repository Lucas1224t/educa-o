const el = (id) => document.getElementById(id);
function desenhar(s) {
  el("ola").textContent = "Olá, " + s.fullName.split(" ")[0] + "!";
  el("info").textContent = [s.schoolYear + "º ano", s.className, s.teacherName && "Prof. " + s.teacherName].filter(Boolean).join(" · ");
  el("nivel").textContent = s.level; el("xp").textContent = s.xp; el("moedas").textContent = s.coins;
  const box = el("materias"); box.innerHTML = "";
  MATERIAS.forEach((m) => {
    const b = document.createElement("button");
    b.className = "materia"; b.style.setProperty("--c", m.cor);
    b.innerHTML = `<span>${m.icone}</span>${esc(m.nome)}`;
    b.onclick = () => {
      el("biblioteca").hidden = false; el("bibTitulo").textContent = `${m.nome} - ${s.schoolYear}º ano`;
      const j = el("jogos"); j.innerHTML = "";
      for (let i = 1; i <= 20; i++) j.insertAdjacentHTML("beforeend", `<div class="jogo"><span>🔒</span>Jogo ${i}<small>Em breve</small></div>`);
      el("biblioteca").scrollIntoView({ behavior: "smooth" });
    };
    box.appendChild(b);
  });
}
async function status() {
  const n = (await pendentes()).length, st = el("status");
  const partes = [];
  if (!navigator.onLine) partes.push("📴 Sem internet: você pode jogar e seus resultados ficam salvos neste aparelho.");
  if (n) partes.push(`⏳ ${n} partida(s) aguardando sincronização.`);
  st.hidden = !partes.length; st.textContent = partes.join(" ");
}
async function historico() {
  let lista = [];
  try { if (navigator.onLine) lista = await call("GET", "student/results"); } catch {}
  const locais = await pendentes();
  const todos = [...locais.map((r) => ({ ...r, local: true })), ...lista].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt)).slice(0, 15);
  el("historico").innerHTML = todos.length ? todos.map((r) =>
    `<div class="aluno-linha"><span><b>${esc(r.subject || "")}</b> · ${esc(r.game || "")} · ${r.score} pts · ${r.correct} acertos / ${r.wrong} erros</span><span>${r.local ? "⏳" : "✅"}</span></div>`).join("")
    : '<p class="vazio">Você ainda não jogou. Escolha uma matéria!</p>';
}
async function iniciar() {
  let s;
  try { s = await call("GET", "student/me"); await kvSet("perfil", s); }
  catch (e) { if (e.name !== "TypeError") throw e; s = await kvGet("perfil"); if (!s) throw new Error("Conecte-se à internet uma vez para carregar seu perfil."); }
  desenhar(s); await status(); await historico(); sincronizar();
}
window.addEventListener("online", () => { status(); iniciar().catch(() => {}); });
window.addEventListener("offline", status);
window.addEventListener("sincronizado", () => { status(); historico(); });
if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  el("teste").hidden = false;
  el("teste").onclick = () => salvarResultado({ game: "Partida de teste", subject: "Matemática", difficulty: "facil", correct: 8, wrong: 2, score: 80, seconds: 45 }).then(() => { status(); historico(); });
}
iniciar().catch((e) => { el("info").textContent = e.message; });
