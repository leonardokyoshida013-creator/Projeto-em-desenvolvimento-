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
  const raw   = await DB.getNotes(username);
  const notes = parseNotes(raw);

  document.getElementById('notesModalTitle').textContent = 'Notas de ' + name;
  document.getElementById('notesModalSub').textContent   = '@' + username;
  document.getElementById('notesModalCount').textContent = `${notes.length} nota${notes.length !== 1 ? 's' : ''}`;

  const list = document.getElementById('notesModalList');
  list.innerHTML = '';

  if (notes.length === 0) {
    list.innerHTML = '<p style="color:var(--text-faint);font-size:13px;text-align:center;padding:1.5rem">(sem notas)</p>';
    flexEl('notesModalOverlay');
    return;
  }

  notes.sort((a, b) => b.date.localeCompare(a.date));
  notes.forEach(note => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem 1rem;display:flex;flex-direction:column;gap:5px';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:11px;font-weight:600;color:var(--text-muted);font-family:'DM Mono',monospace;background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:2px 7px">
          <i class="ti ti-calendar" style="font-size:11px"></i> ${formatDate(note.date)}
        </span>
        ${note.desc ? `<span style="font-size:12px;color:var(--text-muted);font-style:italic">${escapeHtml(note.desc)}</span>` : ''}
      </div>
      <p style="font-size:13px;color:var(--text);line-height:1.65;white-space:pre-wrap">${escapeHtml(note.content)}</p>
    `;
    list.appendChild(card);
  });

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

// ---------- Sistema de notas estruturadas ----------

let editingNoteId = null; // null = nova nota, number = editando existente

async function loadNotes() {
  await renderNotesList();
}

async function renderNotesList() {
  const wrap = document.getElementById('notesListWrap');
  if (!wrap) return;
  wrap.innerHTML = '<p style="color:var(--text-faint);font-size:13px;text-align:center;padding:1.5rem">Carregando…</p>';

  const raw   = await DB.getNotes(currentUser.username);
  const notes = parseNotes(raw);

  if (notes.length === 0) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:var(--text-faint)">
        <i class="ti ti-notes" style="font-size:40px;display:block;margin-bottom:.75rem"></i>
        <p style="font-size:14px">Nenhuma nota ainda.<br>Clique em <strong>+ Nova nota</strong> para começar.</p>
      </div>`;
    return;
  }

  // Ordena por data decrescente
  notes.sort((a, b) => b.date.localeCompare(a.date));

  wrap.innerHTML = '';
  notes.forEach(note => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1rem 1.25rem;display:flex;flex-direction:column;gap:6px';
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);font-family:'DM Mono',monospace;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:2px 8px">
            <i class="ti ti-calendar" style="font-size:12px"></i> ${formatDate(note.date)}
          </span>
          ${note.desc ? `<span style="font-size:12px;color:var(--text-muted);font-style:italic">${escapeHtml(note.desc)}</span>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn-icon" title="Editar" onclick="openNoteModal(${note.id})" style="width:26px;height:26px;font-size:15px"><i class="ti ti-pencil"></i></button>
          <button class="btn-icon" title="Excluir" onclick="deleteNote(${note.id})" style="width:26px;height:26px;font-size:15px;color:var(--red-text)"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <p style="font-size:14px;color:var(--text);line-height:1.65;white-space:pre-wrap;margin-top:2px">${escapeHtml(note.content)}</p>
    `;
    wrap.appendChild(card);
  });
}

function parseNotes(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function openNoteModal(id = null) {
  editingNoteId = id;
  hideAlert('noteModalError');

  if (id !== null) {
    // Modo edição — carrega dados da nota
    DB.getNotes(currentUser.username).then(raw => {
      const notes = parseNotes(raw);
      const note  = notes.find(n => n.id === id);
      if (!note) return;
      document.getElementById('noteModalTitle').textContent = 'Editar nota';
      document.getElementById('noteDate').value    = note.date;
      document.getElementById('noteDesc').value    = note.desc;
      document.getElementById('noteContent').value = note.content;
      flexEl('noteModalOverlay');
    });
  } else {
    // Modo criação — data padrão = hoje
    document.getElementById('noteModalTitle').textContent = 'Nova nota';
    document.getElementById('noteDate').value    = new Date().toISOString().slice(0, 10);
    document.getElementById('noteDesc').value    = '';
    document.getElementById('noteContent').value = '';
    flexEl('noteModalOverlay');
    setTimeout(() => document.getElementById('noteDesc').focus(), 50);
  }
}

function closeNoteModal() {
  hideEl('noteModalOverlay');
  editingNoteId = null;
}

function handleNoteOverlayClick(e) {
  if (e.target.id === 'noteModalOverlay') closeNoteModal();
}

async function saveNoteModal() {
  const date    = document.getElementById('noteDate').value;
  const desc    = document.getElementById('noteDesc').value.trim();
  const content = document.getElementById('noteContent').value.trim();

  if (!date) {
    showAlert('noteModalError', 'Selecione uma data.');
    return;
  }
  if (!content) {
    showAlert('noteModalError', 'O conteúdo não pode estar vazio.');
    return;
  }

  const btn = document.getElementById('noteModalSaveBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  const raw   = await DB.getNotes(currentUser.username);
  const notes = parseNotes(raw);

  if (editingNoteId !== null) {
    const idx = notes.findIndex(n => n.id === editingNoteId);
    if (idx !== -1) { notes[idx].date = date; notes[idx].desc = desc; notes[idx].content = content; }
  } else {
    const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
    notes.push({ id: newId, date, desc, content });
  }

  await DB.saveNotes(currentUser.username, JSON.stringify(notes));

  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-device-floppy"></i> Salvar nota';

  closeNoteModal();
  await renderNotesList();
}

async function deleteNote(id) {
  if (!confirm('Excluir esta nota? Não pode ser desfeito.')) return;
  const raw   = await DB.getNotes(currentUser.username);
  const notes = parseNotes(raw).filter(n => n.id !== id);
  await DB.saveNotes(currentUser.username, JSON.stringify(notes));
  await renderNotesList();
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
window.openNoteModal      = openNoteModal;
window.closeNoteModal     = closeNoteModal;
window.handleNoteOverlayClick = handleNoteOverlayClick;
window.saveNoteModal      = saveNoteModal;
window.deleteNote         = deleteNote;
