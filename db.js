// ============================================================
//  db.js — banco de dados em localStorage
//  Os dados ficam salvos no navegador, persistindo entre sessões.
// ============================================================

const DB_KEY = 'sistema_usuarios';

const DEFAULT_USERS = [
  { id: 1, name: 'Leonardo', username: 'leonardo', password: 'adm123', role: 'adm', createdAt: '01/01/2025' },
  { id: 2, name: 'Abner',    username: 'abner',    password: 'adm123', role: 'adm', createdAt: '01/01/2025' },
  { id: 3, name: 'Isabela',  username: 'isabela',  password: 'adm123', role: 'adm', createdAt: '01/01/2025' },
  { id: 4, name: 'Matheus',  username: 'matheus',  password: 'adm123', role: 'adm', createdAt: '01/01/2025' },
];

const DB = {

  // ---- Inicialização ----
  init() {
    if (!localStorage.getItem(DB_KEY)) {
      this._save({ users: DEFAULT_USERS, nextId: 5 });
    }
  },

  // ---- Leitura ----
  _load() {
    return JSON.parse(localStorage.getItem(DB_KEY));
  },

  // ---- Escrita ----
  _save(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  },

  // ---- Listar todos os usuários ----
  getAll() {
    return this._load().users;
  },

  // ---- Buscar por username ----
  findByUsername(username) {
    return this._load().users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  // ---- Autenticar ----
  authenticate(username, password) {
    const user = this.findByUsername(username);
    if (user && user.password === password) return user;
    return null;
  },

  // ---- Criar usuário ----
  createUser({ name, username, password }) {
    const data = this._load();
    if (this.findByUsername(username)) return { ok: false, error: 'Nome de usuário já existe.' };
    const newUser = {
      id: data.nextId++,
      name,
      username: username.toLowerCase(),
      password,
      role: 'user',
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };
    data.users.push(newUser);
    this._save(data);
    return { ok: true, user: newUser };
  },

  // ---- Remover usuário ----
  deleteUser(id) {
    const data = this._load();
    data.users = data.users.filter(u => u.id !== id);
    this._save(data);
  },

  // ---- Estatísticas ----
  stats() {
    const users = this._load().users;
    return {
      total: users.length,
      adm: users.filter(u => u.role === 'adm').length,
      user: users.filter(u => u.role === 'user').length,
    };
  },

  // ---- Bloco de notas (por usuário) ----
  getNotes(username) {
    const key = 'notas_' + username.toLowerCase();
    return localStorage.getItem(key) || '';
  },

  saveNotes(username, text) {
    const key = 'notas_' + username.toLowerCase();
    localStorage.setItem(key, text);
  },
};

DB.init();
