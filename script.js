// ====== USUÁRIOS CADASTRADOS ======
const usuarios = [
  { usuario: "hholanda",  senha: "c4l1i3q5", nivel: "master" },
  { usuario: "mmaggione", senha: "12345", nivel: "instrutor" },
  { usuario: "hgodoi",    senha: "12345", nivel: "instrutor" },
  { usuario: "baco",      senha: "12345", nivel: "instrutor" }
];

// ====== SENHAS POR TURMA ======
const SENHAS_TURMAS = {
  Iniciantes: "ini123",
  Intermediarios: "int123",
  Graduados: "grad123"
};

// ====== INFOS DA ACADEMIA ======
const ACADEMIA = {
  nome: "Baco BJJ",
  endereco: "R. Salim Cafure Filho, 130 - Florestal, Porto Murtinho - MS, 79280-000",
  telefone: "(67) 99608-8225",
  email: "heldergomesholanda@gmail.com",
  instagram: "https://instagram.com/bacobjj_",
  appUrl: location.origin
};

// ====== CORES DAS FAIXAS ======
const FAIXAS = [
  { nome: "Branca", cor: "#FFFFFF" },
  { nome: "Cinza",  cor: "#808080" },
  { nome: "Amarela",cor: "#FFD700" },
  { nome: "Laranja",cor: "#FFA500" },
  { nome: "Verde",  cor: "#008000" },
  { nome: "Azul",   cor: "#0000FF" },
  { nome: "Roxa",   cor: "#6A0DAD" },
  { nome: "Marrom", cor: "#7B3F00" },
  { nome: "Preta",  cor: "#000000" }
];

function getFaixaColor(nome){
  const f = FAIXAS.find(x=>x.nome===nome);
  return f ? f.cor : "#333";
}
function getTextoContraste(bgHex){
  const hex = bgHex.replace("#","").padStart(6,"0");
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  const lum = (0.2126*r + 0.7152*g + 0.0722*b)/255;
  return lum>0.7?"#B00000":"#FFFFFF";
}

// ====== ESTADO GLOBAL ======
let alunos = JSON.parse(localStorage.getItem("alunos")) || [];
let turmas = { Iniciantes: [], Intermediarios: [], Graduados: [] };
let usuarioAtual = JSON.parse(sessionStorage.getItem("usuarioAtual")) || null;
let turmaAtual = "";
let editIndex = null;
let deferredPrompt = null;

// ====== HELPERS ======
function rebuildTurmas(){
  turmas = { Iniciantes: [], Intermediarios: [], Graduados: [] };
  alunos.forEach(a=>{
    if(a.turma && turmas[a.turma]) turmas[a.turma].push(a);
  });
}

async function carregarAlunosInicial(){
  if(alunos.length>0){ rebuildTurmas(); return; }
  try{
    const resp = await fetch("./alunos.json",{cache:"no-store"});
    if(resp.ok){
      const data = await resp.json();
      if(Array.isArray(data)){
        alunos = data.map(normalizarAluno);
        localStorage.setItem("alunos", JSON.stringify(alunos));
        rebuildTurmas();
      }
    }
  }catch(e){ console.warn("Não foi possível carregar alunos.json:",e); }
}

function normalizarAluno(a){
  return {
    nome: a.nome||"",
    responsavel: a.responsavel||"",
    dataNascimento: a.dataNascimento||a.nascimento||"",
    telefone: a.telefone||"",
    telefoneResponsavel: a.telefoneResponsavel||a.telefoneResp||"",
    email: a.email||"",
    turma: a.turma||"",
    graduacao: a.graduacao||"Branca",
    grau: typeof a.grau==="number"?a.grau:0,
    dataMatricula: a.dataMatricula||new Date().toLocaleDateString("pt-BR")
  };
}

function preencherSelectGraduacao(){
  const sel = document.getElementById("graduacao");
  if(!sel) return;
  sel.innerHTML = `<option value="">Selecione a graduação</option>`;
  FAIXAS.forEach(f=>{
    const opt = document.createElement("option");
    opt.value = f.nome;
    opt.textContent = f.nome;
    opt.style.backgroundColor = f.cor;
    opt.style.color = getTextoContraste(f.cor);
    sel.appendChild(opt);
  });
}

function atualizarBadgeFaixa(){
  const sel = document.getElementById("graduacao");
  const badge = document.getElementById("badgeFaixa");
  if(!sel||!badge) return;
  const nome = sel.value||"Faixa";
  const cor = getFaixaColor(sel.value);
  badge.textContent = nome;
  badge.style.backgroundColor = cor;
  badge.style.color = getTextoContraste(cor);
}

// ====== PERMISSÕES ======
function aplicarPermissoes(){
  const btnMenuAlunos = document.getElementById("btnMenuAlunos");
  const btnInstalarApp = document.getElementById("btnInstalarApp");
  const btnDownloadJSON = document.getElementById("btnDownloadJSON");

  if(!usuarioAtual) {
    if(btnMenuAlunos) btnMenuAlunos.style.display="none";
    if(btnInstalarApp) btnInstalarApp.style.display="none";
    if(btnDownloadJSON) btnDownloadJSON.style.display="none";
    return;
  }
  if(usuarioAtual.nivel==="master"){
    if(btnMenuAlunos) btnMenuAlunos.style.display="block";
    if(btnInstalarApp) btnInstalarApp.style.display="block";
    if(btnDownloadJSON) btnDownloadJSON.style.display="block";
  } else if(usuarioAtual.nivel==="instrutor"){
    if(btnMenuAlunos) btnMenuAlunos.style.display="block";
    if(btnInstalarApp) btnInstalarApp.style.display="block";
    if(btnDownloadJSON) btnDownloadJSON.style.display="none";
  } else if(usuarioAtual.nivel==="visitante"){
    if(btnMenuAlunos) btnMenuAlunos.style.display="none";
    if(btnInstalarApp) btnInstalarApp.style.display="none";
    if(btnDownloadJSON) btnDownloadJSON.style.display="none";
  }
}

// ====== NAVEGAÇÃO ======
function mostrarTela(id){
  const telaAtual = document.getElementById(id);
  if(!telaAtual){ console.warn("Tela não encontrada:",id); return; }
  document.querySelectorAll(".tela").forEach(t=>t.classList.remove("ativa"));
  telaAtual.classList.add("ativa");
  sessionStorage.setItem("telaAtual",id);
  history.pushState({tela:id},"",`#${id}`);
}

function voltarInicio(){
  if(usuarioAtual && usuarioAtual.nivel==="visitante") mostrarTela("tela-inicial-visitante");
  else if(usuarioAtual) mostrarTela("tela-inicial-logado");
  else mostrarTela("tela-login");
}

window.onpopstate = function(e){
  if(e.state && e.state.tela){
    const alvo = document.getElementById(e.state.tela);
    if(alvo){ document.querySelectorAll(".tela").forEach(t=>t.classList.remove("ativa")); alvo.classList.add("ativa"); }
  }
};

// ====== LOGIN ======
function login(u,s){
  const user = usuarios.find(x=>x.usuario===u && x.senha===s);
  if(user){
    usuarioAtual = { usuario: user.usuario, nivel: user.nivel };
    sessionStorage.setItem("usuarioAtual", JSON.stringify(usuarioAtual));
    aplicarPermissoes();
    mostrarTela("tela-inicial-logado");
  } else alert("Usuário ou senha incorretos!");
}

// ====== CHAMADA COM SENHA ======
function abrirChamada(turma){
  const senhaInput = document.getElementById("senhaTurma")?.value || "";
  if(usuarioAtual.nivel!=="master" && SENHAS_TURMAS[turma] !== senhaInput){
    alert("Senha da turma incorreta!");
    return;
  }

  turmaAtual = turma;
  const lista = document.getElementById("lista-alunos");
  lista.innerHTML = "";

  rebuildTurmas();
  document.getElementById("tituloChamada").textContent = `Registro de Presença — ${turma}`;

  const ta = document.getElementById("texto-relatorio");
  if(ta) ta.value = "";

  (turmas[turma]||[]).forEach(a=>{
    const globalIndex = alunos.findIndex(x=>x.nome === a.nome && x.telefone === a.telefone);
    const li = document.createElement("li");
    li.innerHTML = `<label style="flex:1"><input type="checkbox" data-global-index="${globalIndex}" data-nome="${a.nome}" /> <span>${a.nome} (${a.graduacao})</span></label>`;
    lista.appendChild(li);
  });
  mostrarTela("chamada");
}

function limparChamadaUI(){
  document.querySelectorAll("#lista-alunos input[type=checkbox]").forEach(cb=>cb.checked=false);
  const ta = document.getElementById("texto-relatorio");
  if(ta) ta.value = "";
}

function salvarChamada(){
  const boxes = Array.from(document.querySelectorAll("#lista-alunos input[type=checkbox]"));
  const presentes = boxes.filter(b=>b.checked).map(b=>b.dataset.nome);
  const report = document.getElementById("texto-relatorio")?.value || "";
  const data = new Date().toLocaleString();

  const assunto = encodeURIComponent(`Chamada - ${turmaAtual} - ${data}`);
  let corpo = `Academia: ${ACADEMIA.nome}%0D%0ATurma: ${turmaAtual}%0D%0AData: ${data}%0D%0A%0D%0APresentes:%0D%0A`;
  if(presentes.length>0) corpo += presentes.map(n=>`- ${n}`).join("%0D%0A");
  else corpo += "(Nenhum presente marcado)";
  corpo += `%0D%0A%0D%0AObservações:%0D%0A${encodeURIComponent(report)}`;
  const mailto = `mailto:${ACADEMIA.email}?subject=${assunto}&body=${corpo}`;
  window.open(mailto);
  limparChamadaUI();
}

// ====== SUGESTÕES ======
function enviarSugestao(){
  const assunto = encodeURIComponent(`Sugestão — ${ACADEMIA.nome}`);
  const corpo = encodeURIComponent("Escreva aqui sua sugestão...");
  const mailto = `mailto:${ACADEMIA.email}?subject=${assunto}&body=${corpo}`;
  window.open(mailto);
}

// ====== CRUD ALUNOS COM DOWNLOAD JSON ======
function salvarAluno(){
  const nome = (document.getElementById("alunoNome")?.value||"").trim();
  if(!nome){ alert("Nome é obrigatório!"); return; }

  const aluno = {
    nome,
    responsavel: document.getElementById("responsavel")?.value||"",
    dataNascimento: document.getElementById("dataNascimento")?.value||"",
    telefone: document.getElementById("telefone")?.value||"",
    telefoneResponsavel: document.getElementById("telefoneResponsavel")?.value||"",
    email: document.getElementById("email")?.value||"",
    turma: document.getElementById("turma")?.value||"",
    graduacao: document.getElementById("graduacao")?.value||"Branca",
    grau: parseInt(document.getElementById("grau")?.value)||0,
    dataMatricula: new Date().toLocaleDateString("pt-BR")
  };

  if(editIndex!==null){
    alunos[editIndex] = aluno;
    editIndex = null;
  } else alunos.push(aluno);

  localStorage.setItem("alunos", JSON.stringify(alunos));
  rebuildTurmas();
  downloadAlunosJSON();
  alert("Aluno salvo com sucesso!");
  mostrarTela("menuAlunos");
}

function cancelarEdicao(){ editIndex=null; mostrarTela("menuAlunos"); }

function downloadAlunosJSON(){
  const blob = new Blob([JSON.stringify(alunos,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "alunos.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ====== INICIALIZAÇÃO ======
window.addEventListener("DOMContentLoaded", async ()=>{
  preencherSelectGraduacao();
  carregarAlunosInicial();
  aplicarPermissoes();

  document.getElementById("btnLogin")?.addEventListener("click", ()=>{
    const u = document.getElementById("usuario")?.value||"";
    const s = document.getElementById("senha")?.value||"";
    login(u,s);
  });

  document.getElementById("btnVisitante")?.addEventListener("click", ()=>{
    usuarioAtual = { usuario:"visitante", nivel:"visitante" };
    sessionStorage.setItem("usuarioAtual", JSON.stringify(usuarioAtual));
    aplicarPermissoes();
    mostrarTela("tela-inicial-visitante");
  });

  document.getElementById("salvarChamada")?.addEventListener("click", salvarChamada);
  document.getElementById("btnSalvarAluno")?.addEventListener("click", salvarAluno);
  document.getElementById("graduacao")?.addEventListener("change", atualizarBadgeFaixa);

  // Restaurar tela anterior
  const telaAnt = sessionStorage.getItem("telaAtual");
  if(telaAnt) mostrarTela(telaAnt);
  else voltarInicio();
});
