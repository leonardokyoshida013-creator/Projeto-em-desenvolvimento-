// ============================================================
//  app.js — lógica da aplicação (versão Firebase/async)
// ============================================================

import { DB } from './db.js';

let currentUser = null;

// ---------- Utilitários ----------

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function showEl(id)  { document.getElementById(id).style.display = 'block'; }
function hideEl(id)  { document.getElementById(id).style.display = 'none'; }
function flexEl(id)  { document.getElementById(id).style.display = 'flex'; }

function showAlert(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}
function hideAlert(id) {
  document.getElementById(id).style.display = 'none';
}

function clearInputs(...ids) {
  ids.forEach(id => { document.getElementById(id).value = ''; });
}

// ---------- Navegação entre telas ----------

function showLanding() {
  showEl('landingScreen');
  hideEl('loginScreen');
  hideEl('registerScreen');
  hideEl('dashboard');
}

function showLogin() {
  hideEl('landingScreen');
  flexEl('loginScreen');
  hideEl('registerScreen');
  hideEl('dashboard');
  hideAlert('loginError');
  clearInputs('loginUser', 'loginPass');
}

function showRegister() {
  hideEl('landingScreen');
  hideEl('loginScreen');
  flexEl('registerScreen');
  hideEl('dashboard');
  hideAlert('regError');
  hideAlert('regSuccess');
  clearInputs('regName', 'regUser', 'regPass', 'regPassConf');
}

// ---------- Login ----------

async function doLogin() {
  hideAlert('loginError');
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;

  if (!username || !password) {
    showAlert('loginError', 'Preencha todos os campos.');
    return;
  }

  // Feedback visual de carregamento
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Entrando…';

  const user = await DB.authenticate(username, password);

  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-login"></i> Entrar';

  if (!user) {
    showAlert('loginError', 'Usuário ou senha incorretos.');
    return;
  }

  currentUser = user;
  renderDashboard();
}

// Enter no campo de senha faz login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('loginUser').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
  });
});

// ---------- Registro ----------

async function doRegister() {
  hideAlert('regError');
  hideAlert('regSuccess');

  const name     = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUser').value.trim();
  const password = document.getElementById('regPass').value;
  const confirm  = document.getElementById('regPassConf').value;

  if (!name || !username || !password || !confirm) {
    showAlert('regError', 'Preencha todos os campos.');
    return;
  }
  if (password !== confirm) {
    showAlert('regError', 'As senhas não coincidem.');
    return;
  }
  if (password.length < 4) {
    showAlert('regError', 'A senha deve ter ao menos 4 caracteres.');
    return;
  }

  const btn = document.getElementById('regBtn');
  btn.disabled = true;
  btn.textContent = 'Criando…';

  const result = await DB.createUser({ name, username, password });

  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-user-plus"></i> Criar conta';

  if (!result.ok) {
    showAlert('regError', result.error);
    return;
  }

  showAlert('regSuccess', 'Conta criada com sucesso! Redirecionando…');
  setTimeout(() => showLogin(), 1800);
}

// ---------- Dashboard ----------

async function renderDashboard() {
  hideEl('landingScreen');
  hideEl('loginScreen');
  hideEl('registerScreen');
  showEl('dashboard');

  const av = document.getElementById('topAvatar');
  av.textContent = initials(currentUser.name);
  av.className   = 'avatar ' + currentUser.role;

  document.getElementById('topName').textContent     = currentUser.name;
  document.getElementById('topUsername').textContent = '@' + currentUser.username;

  const badge = document.getElementById('topBadge');
  badge.textContent = currentUser.role === 'adm' ? 'ADM' : 'Usuário';
  badge.className   = 'badge ' + currentUser.role;

  if (currentUser.role === 'adm') {
    showEl('admPanel');
    hideEl('userPanel');
    await renderTable();
  } else {
    hideEl('admPanel');
    showEl('userPanel');
    await loadNotes();
  }
}

// ---------- Tabela de usuários ----------

async function renderTable() {
  const s = await DB.stats();
  document.getElementById('statTotal').textContent = s.total;
  document.getElementById('statAdm').textContent   = s.adm;
  document.getElementById('statUsers').textContent = s.user;

  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-faint);padding:1.5rem">Carregando…</td></tr>';

  const allUsers = await DB.getAll();
  tbody.innerHTML = '';

  // Separa e ordena alfabeticamente por nome
  const sortByName = (a, b) => a.name.localeCompare(b.name, 'pt-BR');
  const adms   = allUsers.filter(u => u.role === 'adm').sort(sortByName);
  const common = allUsers.filter(u => u.role === 'user').sort(sortByName);

  // Busca notas dos usuários comuns em paralelo
  const notePromises = common.map(u => DB.getNotes(u.username).then(n => [u.username, n]));
  const notesMap = Object.fromEntries(await Promise.all(notePromises));

  function buildRow(u) {
    const canDelete = u.role !== 'adm';
    const notes     = notesMap[u.username] || '';
    const hasNotes  = notes.trim().length > 0;
    const wordCount = hasNotes ? notes.trim().split(/\s+/).length : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="cell-name">
          <div class="avatar-sm ${u.role}">${initials(u.name)}</div>
          ${escapeHtml(u.name)}
        </div>
      </td>
      <td style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:12px">@${escapeHtml(u.username)}</td>
      <td><span class="badge ${u.role}">${u.role === 'adm' ? 'ADM' : 'Usuário'}</span></td>
      <td style="color:var(--text-muted)">${u.createdAt}</td>
      <td>${u.role === 'user'
        ? hasNotes
          ? `<button class="btn-notes" onclick="viewNotes('${u.username}','${escapeHtml(u.name)}')"><i class="ti ti-notes"></i> ${wordCount} pal.</button>`
          : '<span style="color:var(--text-faint);font-size:12px">vazio</span>'
        : '<span style="color:var(--text-faint);font-size:13px">—</span>'
      }</td>
      <td>${canDelete
        ? `<button class="btn-delete" onclick="deleteUser('${u.id}')">Remover</button>`
        : `<span style="color:var(--text-faint);font-size:13px">—</span>`
      }</td>
    `;
    return tr;
  }

  function buildDivider(label, count) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="6" style="
        background:var(--surface2);
        padding:6px 16px;
        font-size:11px;
        font-weight:600;
        color:var(--text-muted);
        text-transform:uppercase;
        letter-spacing:0.06em;
        border-top:1px solid var(--border);
      ">${label} <span style="font-weight:400;opacity:0.6">(${count})</span></td>
    `;
    return tr;
  }

  // Grupo ADM
  tbody.appendChild(buildDivider('Administradores', adms.length));
  adms.forEach(u => tbody.appendChild(buildRow(u)));

  // Grupo Usuários
  tbody.appendChild(buildDivider('Usuários', common.length));
  if (common.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="text-align:center;color:var(--text-faint);padding:1.25rem;font-size:13px">Nenhum usuário cadastrado</td>`;
    tbody.appendChild(tr);
  } else {
    common.forEach(u => tbody.appendChild(buildRow(u)));
  }
}

async function deleteUser(id) {
  if (!confirm('Tem certeza que deseja remover este usuário?')) return;
  await DB.deleteUser(id);
  await renderTable();
}

// ---------- Modal ver notas (ADM) ----------

async function viewNotes(username, name) {
  const notes = await DB.getNotes(username);
  const words = notes.trim() === '' ? 0 : notes.trim().split(/\s+/).length;
  const chars = notes.length;
  document.getElementById('notesModalTitle').textContent   = 'Notas de ' + name;
  document.getElementById('notesModalSub').textContent     = '@' + username;
  document.getElementById('notesModalContent').textContent = notes || '(sem conteúdo)';
  document.getElementById('notesModalCount').textContent   = words + ' palavras · ' + chars + ' caracteres';
  flexEl('notesModalOverlay');
}

function closeNotesModal() {
  hideEl('notesModalOverlay');
}

function handleNotesOverlayClick(e) {
  if (e.target.id === 'notesModalOverlay') closeNotesModal();
}

// ---------- Modal de novo usuário ----------

function openModal() {
  flexEl('modalOverlay');
  hideAlert('modalError');
  hideAlert('modalSuccess');
  clearInputs('mName', 'mUser', 'mPass');
  setTimeout(() => document.getElementById('mName').focus(), 50);
}

function closeModal() {
  hideEl('modalOverlay');
}

function handleOverlayClick(e) {
  if (e.target.id === 'modalOverlay') closeModal();
}

async function createUser() {
  hideAlert('modalError');
  hideAlert('modalSuccess');

  const name     = document.getElementById('mName').value.trim();
  const username = document.getElementById('mUser').value.trim();
  const password = document.getElementById('mPass').value;

  if (!name || !username || !password) {
    showAlert('modalError', 'Preencha todos os campos.');
    return;
  }
  if (password.length < 4) {
    showAlert('modalError', 'A senha deve ter ao menos 4 caracteres.');
    return;
  }

  const btn = document.getElementById('modalCreateBtn');
  btn.disabled = true;
  btn.textContent = 'Criando…';

  const result = await DB.createUser({ name, username, password });

  btn.disabled = false;
  btn.textContent = 'Criar usuário';

  if (!result.ok) {
    showAlert('modalError', result.error);
    return;
  }

  showAlert('modalSuccess', `Usuário "${name}" criado com sucesso!`);
  clearInputs('mName', 'mUser', 'mPass');
  setTimeout(async () => { closeModal(); await renderTable(); }, 1200);
}

// ---------- Bloco de notas ----------

let noteSaveTimer = null;

async function loadNotes() {
  const textarea = document.getElementById('notepad');
  if (!textarea) return;
  textarea.value = await DB.getNotes(currentUser.username);
  updateWordCount();
}

function onNoteInput() {
  updateWordCount();
  showNoteStatus('salvando…', false);
  clearTimeout(noteSaveTimer);
  noteSaveTimer = setTimeout(async () => {
    await DB.saveNotes(currentUser.username, document.getElementById('notepad').value);
    showNoteStatus('salvo ✓', true);
  }, 800);
}

function updateWordCount() {
  const text  = document.getElementById('notepad').value;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const chars = text.length;
  document.getElementById('wordCount').textContent = `${words} palavra${words !== 1 ? 's' : ''} · ${chars} caractere${chars !== 1 ? 's' : ''}`;
}

function showNoteStatus(msg, saved) {
  const el = document.getElementById('noteStatus');
  el.textContent = msg;
  el.style.color = saved ? 'var(--green-text)' : 'var(--text-faint)';
}

async function clearNotes() {
  if (!confirm('Deseja apagar todas as notas? Isso não pode ser desfeito.')) return;
  document.getElementById('notepad').value = '';
  await DB.saveNotes(currentUser.username, '');
  updateWordCount();
  showNoteStatus('apagado ✓', true);
}

// ---------- Logout ----------

function doLogout() {
  currentUser = null;
  showLanding();
}

// ---------- Segurança básica (XSS) ----------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- Expõe funções para o HTML ----------
// Necessário pois o módulo ES não polui o escopo global automaticamente
window.showLogin          = showLogin;
window.showRegister       = showRegister;
window.showLanding        = showLanding;
window.doLogin            = doLogin;
window.doRegister         = doRegister;
window.doLogout           = doLogout;
window.openModal          = openModal;
window.closeModal         = closeModal;
window.handleOverlayClick = handleOverlayClick;
window.createUser         = createUser;
window.deleteUser         = deleteUser;
window.viewNotes          = viewNotes;
window.closeNotesModal    = closeNotesModal;
window.handleNotesOverlayClick = handleNotesOverlayClick;
window.onNoteInput        = onNoteInput;
window.clearNotes         = clearNotes;
