// ====== USUÁRIOS CADASTRADOS ======
const usuarios = [
  { usuario: "hholanda",  senha: "c4l1i3q5", nivel: "master" },
  { usuario: "mmaggione", senha: "270229", nivel: "instrutor" },
  { usuario: "hgodoi",    senha: "130608", nivel: "instrutor" },
  { usuario: "baco",      senha: "12345", nivel: "instrutor" }
];

// ====== SENHAS POR TURMA ======
const SENHAS_TURMAS = {
  Iniciantes: "130608",
  Intermediarios: "270229",
  Graduados: "270229"
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
let alunos = [];
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
  try{
    const resp = await fetch("./alunos.json",{cache:"no-store"});
    if(resp.ok){
      const data = await resp.json();
      if(Array.isArray(data)){
        alunos = data.map(normalizarAluno);
        localStorage.setItem("alunos", JSON.stringify(alunos));
        rebuildTurmas();
        return;
      }
    }
  }catch(e){
    console.warn("Não foi possível carregar alunos.json:",e);
  }

  // Fallback caso fetch falhe
  const localData = JSON.parse(localStorage.getItem("alunos") || "[]");
  if(localData.length > 0){
    alunos = localData.map(normalizarAluno);
    rebuildTurmas();
  }
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

// ====== CHAMADA ======
function abrirChamada(turma){
  if(usuarioAtual.nivel !== "master"){
    let senhaValida = false;
    let tentativa = "";
    while(!senhaValida){
      tentativa = prompt(`Digite a senha da turma "${turma}":`);
      if(tentativa === null) return;
      if(tentativa === SENHAS_TURMAS[turma]){
        senhaValida = true;
      } else {
        alert("Senha incorreta! Tente novamente.");
      }
    }
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
  document.getElementById("texto-relatorio").value="";
}

// ====== ALUNOS ======
function salvarAluno(){
  const nome = document.getElementById("alunoNome").value.trim();
  if(!nome) { alert("Nome obrigatório"); return; }

  const alunoObj = {
    nome: nome,
    responsavel: document.getElementById("responsavel").value.trim(),
    dataNascimento: document.getElementById("dataNascimento").value,
    telefone: document.getElementById("telefone").value.trim(),
    telefoneResponsavel: document.getElementById("telefoneResponsavel").value.trim(),
    email: document.getElementById("email").value.trim(),
    turma: document.getElementById("turma").value,
    graduacao: document.getElementById("graduacao").value,
    grau: parseInt(document.getElementById("grau").value) || 0,
    dataMatricula: new Date().toLocaleDateString("pt-BR")
  };

  if(editIndex!==null){
    alunos[editIndex] = alunoObj;
    editIndex = null;
    document.getElementById("btnCancelarEdicao").style.display="none";
  } else alunos.push(alunoObj);

  localStorage.setItem("alunos", JSON.stringify(alunos));
  rebuildTurmas();
  mostrarTela("menuAlunos");
  alert("Aluno salvo com sucesso!");
}

function cancelarEdicao(){
  editIndex = null;
  document.getElementById("btnCancelarEdicao").style.display="none";
  mostrarTela("menuAlunos");
}

function editarAluno(index){
  const aluno = alunos[index];
  if(!aluno) return;
  editIndex = index;
  document.getElementById("alunoNome").value = aluno.nome;
  document.getElementById("responsavel").value = aluno.responsavel;
  document.getElementById("dataNascimento").value = aluno.dataNascimento;
  document.getElementById("telefone").value = aluno.telefone;
  document.getElementById("telefoneResponsavel").value = aluno.telefoneResponsavel;
  document.getElementById("email").value = aluno.email;
  document.getElementById("turma").value = aluno.turma;
  document.getElementById("graduacao").value = aluno.graduacao;
  document.getElementById("grau").value = aluno.grau;
  atualizarBadgeFaixa();
  document.getElementById("btnCancelarEdicao").style.display="inline-block";
  mostrarTela("novoAluno");
}

function pesquisarAluno(){
  const busca = document.getElementById("buscarAluno").value.trim().toLowerCase();
  const lista = document.getElementById("lista-pesquisa");
  lista.innerHTML = "";
  const resultados = alunos.filter(a=>a.nome.toLowerCase().includes(busca));
  resultados.forEach(a=>{
    const li = document.createElement("li");
    li.innerHTML = `<span>${a.nome} (${a.turma} - ${a.graduacao})</span> 
      <button onclick="editarAluno(${alunos.indexOf(a)})">Editar</button>`;
    lista.appendChild(li);
  });
}

// ====== PDF ======
function gerarRelatorioGeralPDF(){
  const doc = new jspdf.jsPDF();
  doc.setFontSize(16);
  doc.text("Relatório Geral de Alunos", 14, 20);
  const col = ["Nome","Turma","Graduação","Grau","Nascimento","Responsável","Telefone"];
  const rows = alunos.map(a=>[a.nome,a.turma,a.graduacao,a.grau,a.dataNascimento,a.responsavel,a.telefone]);
  doc.autoTable({ head:[col], body:rows, startY:30 });
  doc.save("Relatorio_Geral_Alunos.pdf");
}

function gerarRelatorioAlocadosPDF(){
  rebuildTurmas();
  const doc = new jspdf.jsPDF();
  doc.setFontSize(16);
  doc.text("Relatório de Alunos Alocados por Turma", 14, 20);
  let startY = 30;
  Object.keys(turmas).forEach(t=>{
    doc.setFontSize(14);
    doc.text(t,14,startY);
    startY += 6;
    const col = ["Nome","Graduação","Grau"];
    const rows = turmas[t].map(a=>[a.nome,a.graduacao,a.grau]);
    doc.autoTable({ head:[col], body:rows, startY:startY });
    startY += rows.length*8 + 10;
  });
  doc.save("Relatorio_Alocados.pdf");
}

// ====== DOWNLOAD JSON ======
function downloadAlunosJSON(){
  const blob = new Blob([JSON.stringify(alunos,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "alunos.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ====== SUGESTÃO ======
function enviarSugestao(){
  const msg = prompt("Digite sua sugestão:");
  if(msg){
    const assunto = encodeURIComponent("Sugestão - " + ACADEMIA.nome);
    const corpo = encodeURIComponent(msg);
    window.location.href = `mailto:${ACADEMIA.email}?subject=${assunto}&body=${corpo}`;
  }
}

// ====== CHAMADA EMAIL ======
function enviarChamadaEmail(){
  const checked = Array.from(document.querySelectorAll("#lista-alunos input[type=checkbox]:checked"));
  const todos = Array.from(document.querySelectorAll("#lista-alunos input[type=checkbox]"));

  if(checked.length === 0){ 
    alert("Nenhum aluno selecionado!"); 
    return; 
  }

  const presentes = checked.map(c => c.dataset.nome);
  const faltaram = todos.filter(c => !c.checked).map(c => c.dataset.nome);

  const rel = document.getElementById("texto-relatorio")?.value || "";
  
  let corpo = `Relatório de chamada - Turma: ${turmaAtual}\n\n`;

  corpo += "✅ Presentes:\n";
  corpo += presentes.length > 0 ? presentes.join("\n") : "Nenhum aluno presente";
  corpo += "\n\n";

  corpo += "❌ Faltaram:\n";
  corpo += faltaram.length > 0 ? faltaram.join("\n") : "Todos compareceram";
  corpo += "\n\n";

  if(rel.trim() !== ""){
    corpo += "📌 Observações:\n" + rel;
  }

  const assunto = `Relatório de chamada - ${turmaAtual}`;

  window.location.href = 
    `mailto:${ACADEMIA.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

  limparChamadaUI();
  voltarInicio();
}


// ====== INSTALL APP ======
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById("btnInstalarApp");
  if(btn) btn.style.display="inline-block";
});
document.getElementById("btnInstalarApp")?.addEventListener("click", async ()=>{
  if(deferredPrompt){
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});

// ====== INIT ======
window.addEventListener("DOMContentLoaded", async ()=>{
  await carregarAlunosInicial();
  preencherSelectGraduacao();
  atualizarBadgeFaixa();

  aplicarPermissoes();

  if(usuarioAtual){
    mostrarTela(usuarioAtual.nivel==="visitante"?"tela-inicial-visitante":"tela-inicial-logado");
  } else mostrarTela("tela-login");

  document.getElementById("btnLogin")?.addEventListener("click", ()=>{
    const u = document.getElementById("usuario").value.trim();
    const s = document.getElementById("senha").value.trim();
    login(u,s);
  });
  document.getElementById("btnVisitante")?.addEventListener("click", ()=>{
    usuarioAtual = { usuario:"visitante", nivel:"visitante" };
    sessionStorage.setItem("usuarioAtual",JSON.stringify(usuarioAtual));
    aplicarPermissoes();
    mostrarTela("tela-inicial-visitante");
  });

  document.getElementById("graduacao")?.addEventListener("change", atualizarBadgeFaixa);
  document.getElementById("btnSalvarAluno")?.addEventListener("click", salvarAluno);
  document.getElementById("btnExecutarPesquisa")?.addEventListener("click", pesquisarAluno);
  document.getElementById("salvarChamada")?.addEventListener("click", enviarChamadaEmail);
});
