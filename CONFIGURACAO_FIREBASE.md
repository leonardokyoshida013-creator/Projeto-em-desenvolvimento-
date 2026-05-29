# 🔥 Como configurar o Firebase (passo a passo)

## Por que Firebase?
O localStorage só existe no navegador local — não sincroniza entre dispositivos.
O Firebase Firestore é um banco de dados na nuvem gratuito que resolve isso.

---

## PASSO 1 — Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com
2. Clique em **"Criar um projeto"**
3. Dê um nome (ex: `banco-seguro`) e clique em **Continuar**
4. Desative o Google Analytics (não precisa) → **Criar projeto**

---

## PASSO 2 — Criar o banco Firestore

1. No menu lateral esquerdo, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Iniciar no modo de produção"** → Avançar
4. Escolha a região mais próxima (ex: `southamerica-east1`) → **Ativar**

---

## PASSO 3 — Registrar o app Web

1. Na página inicial do projeto, clique no ícone **`</>`** (Web)
2. Dê um apelido (ex: `banco-seguro-web`) → **Registrar app**
3. Você verá um bloco como este:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "banco-seguro.firebaseapp.com",
  projectId: "banco-seguro",
  storageBucket: "banco-seguro.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

4. **Copie esses valores** e cole no arquivo `db.js` no lugar dos `"COLE_AQUI"`

---

## PASSO 4 — Configurar as Regras de Segurança

1. No menu lateral, vá em **Firestore Database → Regras**
2. **Apague** o conteúdo atual e cole as regras abaixo:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Coleção de usuários: leitura e escrita livres
    // (o controle de acesso é feito pelo app.js via senha)
    match /usuarios/{username} {
      allow read, write: if true;
    }

    // Coleção de notas: leitura e escrita livres
    match /notas/{username} {
      allow read, write: if true;
    }
  }
}
```

3. Clique em **Publicar**

---

## PASSO 5 — Subir os arquivos no GitHub Pages

Faça upload dos 4 arquivos para o repositório:
- `index.html`
- `style.css`
- `db.js`  ← o novo, com seus dados do Firebase
- `app.js` ← o novo, com async/await

Em **Settings → Pages → Source**, selecione `main` / `root` e salve.

---

## ✅ Pronto!

Agora os usuários criados ficam salvos no Firestore e aparecem
em qualquer dispositivo que acessar o site.

---

## ⚠️ Limites do plano gratuito (Spark)

| Recurso          | Limite gratuito/dia |
|-----------------|---------------------|
| Leituras         | 50.000              |
| Escritas         | 20.000              |
| Exclusões        | 20.000              |
| Armazenamento    | 1 GB total          |

Para um sistema pequeno como este, o plano gratuito é mais do que suficiente.
