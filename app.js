// ============================================================
//  app.js — lógica da aplicação
// ============================================================

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

function showLogin() {
  flexEl('loginScreen');
  hideEl('registerScreen');
  hideEl('dashboard');
  hideAlert('loginError');
  clearInputs('loginUser', 'loginPass');
}

function showRegister() {
  hideEl('loginScreen');
  flexEl('registerScreen');
  hideEl('dashboard');
  hideAlert('regError');
  hideAlert('regSuccess');
  clearInputs('regName', 'regUser', 'regPass', 'regPassConf');
}

// ---------- Login ----------

function doLogin() {
  hideAlert('loginError');
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;

  if (!username || !password) {
    showAlert('loginError', 'Preencha todos os campos.');
    return;
  }

  const user = DB.authenticate(username, password);
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

function doRegister() {
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

  const result = DB.createUser({ name, username, password });
  if (!result.ok) {
    showAlert('regError', result.error);
    return;
  }

  showAlert('regSuccess', 'Conta criada com sucesso! Redirecionando...');
  setTimeout(() => showLogin(), 1800);
}

// ---------- Dashboard ----------

function renderDashboard() {
  hideEl('loginScreen');
  hideEl('registerScreen');
  showEl('dashboard');

  // Topbar
  const av = document.getElementById('topAvatar');
  av.textContent    = initials(currentUser.name);
  av.className      = 'avatar ' + currentUser.role;

  document.getElementById('topName').textContent     = currentUser.name;
  document.getElementById('topUsername').textContent = '@' + currentUser.username;

  const badge = document.getElementById('topBadge');
  badge.textContent = currentUser.role === 'adm' ? 'ADM' : 'Usuário';
  badge.className   = 'badge ' + currentUser.role;

  if (currentUser.role === 'adm') {
    showEl('admPanel');
    hideEl('userPanel');
    renderTable();
  } else {
    hideEl('admPanel');
    showEl('userPanel');
  }
}

// ---------- Tabela de usuários ----------

function renderTable() {
  const s = DB.stats();
  document.getElementById('statTotal').textContent = s.total;
  document.getElementById('statAdm').textContent   = s.adm;
  document.getElementById('statUsers').textContent = s.user;

  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';

  DB.getAll().forEach(u => {
    const canDelete = u.role !== 'adm' && u.id !== currentUser.id;
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
      <td>${canDelete
        ? `<button class="btn-delete" onclick="deleteUser(${u.id})">Remover</button>`
        : `<span style="color:var(--text-faint);font-size:13px">—</span>`
      }</td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteUser(id) {
  if (!confirm('Tem certeza que deseja remover este usuário?')) return;
  DB.deleteUser(id);
  renderTable();
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

function createUser() {
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

  const result = DB.createUser({ name, username, password });
  if (!result.ok) {
    showAlert('modalError', result.error);
    return;
  }

  showAlert('modalSuccess', `Usuário "${name}" criado com sucesso!`);
  clearInputs('mName', 'mUser', 'mPass');
  setTimeout(() => { closeModal(); renderTable(); }, 1200);
}

// ---------- Logout ----------

function doLogout() {
  currentUser = null;
  showLogin();
}

// ---------- Segurança básica (XSS) ----------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
