// Fundo divertido (emojis flutuando)
(function () {
  const bg = document.getElementById("bg"); if (!bg) return;
  const ico = ["⭐", "🔢", "📚", "🎈", "🚀", "🔬", "🌎", "🧩", "🎨", "➕"];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement("span");
    s.textContent = ico[i % ico.length];
    s.style.left = Math.random() * 95 + "%";
    s.style.animationDuration = 9 + Math.random() * 10 + "s";
    s.style.animationDelay = -Math.random() * 12 + "s";
    s.style.fontSize = 24 + Math.random() * 28 + "px";
    bg.appendChild(s);
  }
})();

const $ = (id) => document.getElementById(id);
const show = (id, t) => { const e = $(id); if (e) e.textContent = t; };
async function api(path, data) {
  const r = await fetch("/api/" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error || "Erro"); return j;
}
const form = (f) => Object.fromEntries(new FormData(f));

if ($("fAluno")) $("fAluno").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const j = await api("student/login", form(e.target));
    localStorage.setItem("token", j.token); sessionStorage.removeItem("token");
    location.href = "aluno.html";
  } catch (x) { show("msg", x.message); }
};
if ($("fProf")) {
  $("fProf").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const j = await api("teacher/login", form(e.target));
      sessionStorage.setItem("token", j.token); localStorage.removeItem("token");
      sessionStorage.setItem("nome", j.name); sessionStorage.setItem("cargo", j.cargo || ""); location.href = "professor.html";
    } catch (x) { show("msg", x.message); }
  };
  $("abrirCadastro").onclick = () => { $("fProf").hidden = true; $("fCadastro").hidden = false; };
  $("voltarLogin").onclick = () => { $("fCadastro").hidden = true; $("fProf").hidden = false; };
  $("fCadastro").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const j = await api("teacher/register", form(e.target));
      sessionStorage.setItem("token", j.token); localStorage.removeItem("token");
      sessionStorage.setItem("nome", j.name); sessionStorage.setItem("cargo", j.cargo || ""); location.href = "professor.html";
    } catch (x) { show("msg2", x.message); }
  };
}
