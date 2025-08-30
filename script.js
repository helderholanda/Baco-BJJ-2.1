// ====== USUÁRIOS CADASTRADOS ======
const usuarios = [
  { usuario: "hholanda",  senha: "c4l1i3q5", nivel: "master" },
  { usuario: "mmaggione", senha: "12345", nivel: "instrutor" },
  { usuario: "hgodoi",    senha: "12345", nivel: "instrutor" },
  { usuario: "baco",      senha: "12345", nivel: "instrutor" }
];

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
  if(!usuarioAtual) {
    if(btnMenuAlunos) btnMenuAlunos.style.display="none";
    if(btnInstalarApp) btnInstalarApp.style.display="none";
    return;
  }
  if(usuarioAtual.nivel==="master"){ if(btnMenuAlunos)btnMenuAlunos.style.display="block"; if(btnInstalarApp)btnInstalarApp.style.display="block"; }
  else if(usuarioAtual.nivel==="instrutor"){ if(btnMenuAlunos)btnMenuAlunos.style.display="block"; if(btnInstalarApp)btnInstalarApp.style.display="block"; }
  else if(usuarioAtual.nivel==="visitante"){ if(btnMenuAlunos)btnMenuAlunos.style.display="none"; if(btnInstalarApp)btnInstalarApp.style.display="none"; }
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
  turmaAtual = turma;
  const lista = document.getElementById("lista-alunos");
  lista.innerHTML = "";
  // garantir turmas reconstruídas
  rebuildTurmas();
  document.getElementById("tituloChamada").textContent = `Registro de Presença — ${turma}`;
  // limpar relatório ao abrir
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
  // limpa checkboxes e texto do relatório
  document.querySelectorAll("#lista-alunos input[type=checkbox]").forEach(cb=>cb.checked=false);
  const ta = document.getElementById("texto-relatorio");
  if(ta) ta.value = "";
}

function salvarChamada(){
  // ler checkboxes
  const boxes = Array.from(document.querySelectorAll("#lista-alunos input[type=checkbox]"));
  const presentes = boxes.filter(b=>b.checked).map(b=>b.dataset.nome);
  const report = document.getElementById("texto-relatorio")?.value || "";
  const data = new Date().toLocaleString();

  const assunto = encodeURIComponent(`Chamada - ${turmaAtual} - ${data}`);
  let corpo = `Academia: ${ACADEMIA.nome}%0D%0ATurma: ${turmaAtual}%0D%0AData: ${data}%0D%0A%0D%0APresentes:%0D%0A`;
  if(presentes.length>0){
    corpo += presentes.map(n=>`- ${n}`).join("%0D%0A");
  } else corpo += "(Nenhum presente marcado)";

  corpo += `%0D%0A%0D%0AObservações:%0D%0A${encodeURIComponent(report)}`;

  const mailto = `mailto:${ACADEMIA.email}?subject=${assunto}&body=${corpo}`;

  // abrir cliente de email
  window.open(mailto);

  // depois de abrir o mailto limpar a chamada (checkboxes + relatório)
  limparChamadaUI();
}

// ====== SUGESTÕES ======
function enviarSugestao(){
  const assunto = encodeURIComponent(`Sugestão — ${ACADEMIA.nome}`);
  const corpo = encodeURIComponent("Escreva aqui sua sugestão...");
  const mailto = `mailto:${ACADEMIA.email}?subject=${assunto}&body=${corpo}`;
  window.open(mailto);
}

// ====== ALUNOS: CRUD LOCAL (salvar, editar, listar pesquisa) ======
function salvarAluno(){
  const nome = (document.getElementById("alunoNome")?.value||"").trim();
  if(!nome){ alert("Preencha o nome do aluno."); return; }
  const resp = (document.getElementById("responsavel")?.value||"").trim();
  const dataNasc = document.getElementById("dataNascimento")?.value||"";
  const telefone = (document.getElementById("telefone")?.value||"").trim();
  const telefoneResp = (document.getElementById("telefoneResponsavel")?.value||"").trim();
  const email = (document.getElementById("email")?.value||"").trim();
  const turma = document.getElementById("turma")?.value||"";
  const graduacao = document.getElementById("graduacao")?.value||"Branca";
  const grau = parseInt(document.getElementById("grau")?.value||"0",10);
  const dataMat = new Date().toLocaleDateString("pt-BR");

  const obj = { nome, responsavel: resp, dataNascimento: dataNasc, telefone, telefoneResponsavel: telefoneResp, email, turma, graduacao, grau, dataMatricula: dataMat };

  if(editIndex !== null && typeof editIndex === "number"){
    // edição
    alunos[editIndex] = Object.assign({}, alunos[editIndex], obj);
    editIndex = null;
    document.getElementById("btnCancelarEdicao").style.display = "none";
  } else {
    // novo
    alunos.push(obj);
  }
  // salvar
  localStorage.setItem("alunos", JSON.stringify(alunos));
  rebuildTurmas();
  limparFormAluno();
  alert("Aluno salvo com sucesso.");
}

function limparFormAluno(){
  document.getElementById("alunoNome").value = "";
  document.getElementById("responsavel").value = "";
  document.getElementById("dataNascimento").value = "";
  document.getElementById("telefone").value = "";
  document.getElementById("telefoneResponsavel").value = "";
  document.getElementById("email").value = "";
  document.getElementById("turma").value = "";
  document.getElementById("graduacao").value = "";
  atualizarBadgeFaixa();
  document.getElementById("grau").value = "0";
}

function cancelarEdicao(){
  editIndex = null;
  document.getElementById("btnCancelarEdicao").style.display = "none";
  limparFormAluno();
}

function renderPesquisaLista(filter=""){
  const ul = document.getElementById("lista-pesquisa");
  ul.innerHTML = "";
  const f = (filter||"").toLowerCase();
  const mostrados = alunos.filter(a=>a.nome.toLowerCase().includes(f));
  if(mostrados.length===0){
    ul.innerHTML = `<li>Nenhum aluno encontrado.</li>`;
    return;
  }
  mostrados.forEach((a, idx)=>{
    const globalIndex = alunos.findIndex(x=>x.nome===a.nome && x.telefone===a.telefone);
    const li = document.createElement("li");
    li.innerHTML = `<div style="flex:1"><strong>${a.nome}</strong><br/><small>${a.turma} — ${a.graduacao}</small></div>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <button onclick="mostrarDetalhesAluno(${globalIndex})">Detalhes</button>
                    </div>`;
    ul.appendChild(li);
  });
}

function mostrarDetalhesAluno(globalIndex){
  const det = document.getElementById("detalhes-aluno");
  if(globalIndex<0 || globalIndex>=alunos.length){ det.innerHTML = ""; return; }
  const a = alunos[globalIndex];
  det.innerHTML = `
    <h3>${a.nome}</h3>
    <p><strong>Responsável:</strong> ${a.responsavel||"-"}</p>
    <p><strong>Data Nasc:</strong> ${a.dataNascimento||"-"}</p>
    <p><strong>Telefone:</strong> ${a.telefone||"-"}</p>
    <p><strong>E-mail:</strong> ${a.email||"-"}</p>
    <p><strong>Turma:</strong> ${a.turma||"-"} — <strong>Faixa:</strong> ${a.graduacao||"-"}</p>
    <div style="display:flex; gap:8px; justify-content:center;">
      <button onclick="editarAluno(${globalIndex})">Editar</button>
      <button onclick="excluirAluno(${globalIndex})">Excluir</button>
    </div>
  `;
}

function editarAluno(globalIndex){
  const a = alunos[globalIndex];
  if(!a) return;
  document.getElementById("alunoNome").value = a.nome;
  document.getElementById("responsavel").value = a.responsavel;
  document.getElementById("dataNascimento").value = a.dataNascimento;
  document.getElementById("telefone").value = a.telefone;
  document.getElementById("telefoneResponsavel").value = a.telefoneResponsavel;
  document.getElementById("email").value = a.email;
  document.getElementById("turma").value = a.turma;
  document.getElementById("graduacao").value = a.graduacao;
  document.getElementById("grau").value = (a.grau||0).toString();
  atualizarBadgeFaixa();
  editIndex = globalIndex;
  mostrarTela("novoAluno");
  document.getElementById("btnCancelarEdicao").style.display = "block";
}

function excluirAluno(globalIndex){
  if(!confirm("Confirma exclusão deste aluno?")) return;
  alunos.splice(globalIndex,1);
  localStorage.setItem("alunos", JSON.stringify(alunos));
  rebuildTurmas();
  renderPesquisaLista(document.getElementById("buscarAluno")?.value || "");
  document.getElementById("detalhes-aluno").innerHTML = "";
  alert("Aluno excluído.");
}

// ====== RELATÓRIOS PDF (mantive igual) ======
window.gerarRelatorioAlocadosPDF = function(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Estudantes Alocados", 14, 20);
  let data = alunos.map(a=>[a.nome,a.turma,a.graduacao,a.telefone]);
  doc.autoTable({ head:[["Nome","Turma","Faixa","Telefone"]], body:data, startY:30 });
  doc.save("Relatorio_Alocados.pdf");
};

window.gerarRelatorioGeralPDF = function(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Relatório Geral", 14, 20);
  let data = alunos.map(a=>[a.nome,a.responsavel,a.turma,a.graduacao,a.dataMatricula]);
  doc.autoTable({ head:[["Nome","Responsável","Turma","Faixa","Matrícula"]], body:data, startY:30 });
  doc.save("Relatorio_Geral.pdf");
};

// ====== PWA / Instal prompt ======
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById("btnInstalarApp");
  if(btn) btn.style.display="block";
});

document.getElementById("btnInstalarApp")?.addEventListener("click", async ()=>{
  if(deferredPrompt){
    deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById("btnInstalarApp").style.display="none";
  }
});

// Abrir Instagram
window.abrirInstagram = function(){
  window.open(ACADEMIA.instagram,"_blank");
};

// ====== INICIALIZAÇÃO E EVENTOS ======
document.addEventListener("DOMContentLoaded", async ()=>{
  preencherSelectGraduacao();
  atualizarBadgeFaixa();
  const selGrad = document.getElementById("graduacao");
  if(selGrad) selGrad.addEventListener("change", atualizarBadgeFaixa);

  await carregarAlunosInicial();
  aplicarPermissoes();

  // LOGIN
  document.getElementById("btnLogin")?.addEventListener("click", ()=>{
    login(document.getElementById("usuario")?.value.trim(), document.getElementById("senha")?.value.trim());
  });

  document.getElementById("btnVisitante")?.addEventListener("click", ()=>{
    usuarioAtual = { usuario:"visitante", nivel:"visitante" };
    sessionStorage.setItem("usuarioAtual", JSON.stringify(usuarioAtual));
    aplicarPermissoes();
    mostrarTela("tela-inicial-visitante");
  });

  // botão salvar chamada
  document.getElementById("salvarChamada")?.addEventListener("click", salvarChamada);

  // salvar aluno (novo/edita)
  document.getElementById("btnSalvarAluno")?.addEventListener("click", salvarAluno);

  // pesquisa de aluno — digitar filtra dinamicamente
  const buscarInp = document.getElementById("buscarAluno");
  if(buscarInp){
    buscarInp.addEventListener("input", (e)=>{
      renderPesquisaLista(e.target.value);
    });
  }
  document.getElementById("btnExecutarPesquisa")?.addEventListener("click", ()=>{
    renderPesquisaLista(document.getElementById("buscarAluno")?.value || "");
  });

  // render inicial da lista de pesquisa
  renderPesquisaLista("");

  // restaurar tela anterior / inicial
  const hashTela = location.hash ? location.hash.replace("#","") : null;
  const ultimaTela = sessionStorage.getItem("telaAtual") || hashTela;
  if(usuarioAtual){
    aplicarPermissoes();
    if(ultimaTela && document.getElementById(ultimaTela)) mostrarTela(ultimaTela);
    else mostrarTela(usuarioAtual.nivel==="visitante"?"tela-inicial-visitante":"tela-inicial-logado");
  } else {
    mostrarTela("tela-login");
  }
});
