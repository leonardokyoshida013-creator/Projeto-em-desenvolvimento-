// ============================================================
//  db.js — banco de dados em Firebase Firestore
//  Dados sincronizados em nuvem, acessíveis de qualquer dispositivo.
//
//  CONFIGURAÇÃO NECESSÁRIA:
//  1. Acesse https://console.firebase.google.com
//  2. Crie um projeto → Firestore Database → Modo produção
//  3. Vá em "Configurações do projeto" → "Seus aplicativos" → Web (</>)
//  4. Copie os valores do firebaseConfig e cole abaixo
//  5. Em Firestore, vá em Regras e cole as regras do arquivo FIREBASE_RULES.txt
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs,
  setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =====================================================
//  ⚙️  SUBSTITUA PELOS SEUS DADOS DO FIREBASE ABAIXO
// =====================================================
const firebaseConfig = {
  apiKey: "AIzaSyDbCZZtRHDn_BXOSOSCk54g62izOTyFFYc",
  authDomain: "banco-seguro-1aa9b.firebaseapp.com",
  projectId: "banco-seguro-1aa9b",
  storageBucket: "banco-seguro-1aa9b.firebasestorage.app",
  messagingSenderId: "247629826149",
  appId: "1:247629826149:web:0af77cbada0f263da1de8c"
};
// =====================================================

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const USERS_COL  = "usuarios";
const NOTES_COL  = "notas";

// Usuários ADM padrão — só serão criados se ainda não existirem
const DEFAULT_USERS = [
  { id: "1", name: "Leonardo", username: "leonardo", password: "adm123", role: "adm", createdAt: "27/05/2025" },
  { id: "2", name: "Abner",    username: "abner",    password: "adm123", role: "adm", createdAt: "27/05/2025" },
  { id: "3", name: "Isabela",  username: "isabela",  password: "adm123", role: "adm", createdAt: "27/05/2025" },
  { id: "4", name: "Matheus",  username: "matheus",  password: "adm123", role: "adm", createdAt: "27/05/2025" },
];

// ============================================================
//  Objeto DB — mesma interface do db.js original
//  (app.js não precisa ser alterado)
// ============================================================
const DB = {

  // ---- Inicialização: garante que os ADMs existem ----
  async init() {
    for (const u of DEFAULT_USERS) {
      const ref = doc(db, USERS_COL, u.username);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, u);
      }
    }
  },

  // ---- Listar todos os usuários ----
  async getAll() {
    const snap = await getDocs(collection(db, USERS_COL));
    return snap.docs.map(d => d.data());
  },

  // ---- Buscar por username ----
  async findByUsername(username) {
    const ref  = doc(db, USERS_COL, username.toLowerCase());
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  // ---- Autenticar ----
  async authenticate(username, password) {
    const user = await this.findByUsername(username);
    if (user && user.password === password) return user;
    return null;
  },

  // ---- Criar usuário ----
  async createUser({ name, username, password }) {
    const existing = await this.findByUsername(username);
    if (existing) return { ok: false, error: "Nome de usuário já existe." };

    // Gera ID único baseado em timestamp
    const allUsers = await this.getAll();
    const maxId = allUsers.reduce((m, u) => Math.max(m, parseInt(u.id) || 0), 0);

    const newUser = {
      id:        String(maxId + 1),
      name,
      username:  username.toLowerCase(),
      password,
      role:      "user",
      createdAt: new Date().toLocaleDateString("pt-BR"),
    };

    await setDoc(doc(db, USERS_COL, newUser.username), newUser);
    return { ok: true, user: newUser };
  },

  // ---- Remover usuário ----
  async deleteUser(id) {
    const allUsers = await this.getAll();
    const user = allUsers.find(u => String(u.id) === String(id));
    if (user) {
      await deleteDoc(doc(db, USERS_COL, user.username));
      // Remove as notas também
      await deleteDoc(doc(db, NOTES_COL, user.username));
    }
  },

  // ---- Estatísticas ----
  async stats() {
    const users = await this.getAll();
    return {
      total: users.length,
      adm:   users.filter(u => u.role === "adm").length,
      user:  users.filter(u => u.role === "user").length,
    };
  },

  // ---- Bloco de notas ----
  async getNotes(username) {
    const ref  = doc(db, NOTES_COL, username.toLowerCase());
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data().text || "") : "";
  },

  async saveNotes(username, text) {
    await setDoc(doc(db, NOTES_COL, username.toLowerCase()), { text });
  },
};

// Inicializa (cria ADMs padrão se necessário) e exporta
await DB.init();
export { DB };
