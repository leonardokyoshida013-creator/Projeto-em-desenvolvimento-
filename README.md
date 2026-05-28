# Sistema de Acesso com ADM

Site com sistema de login, 4 contas ADM pré-configuradas e banco de dados em localStorage.

## Contas ADM padrão

| Usuário | Senha |
|---|---|
| `leonardo` | `adm123` |
| `abner` | `adm123` |
| `isabela` | `adm123` |
| `matheus` | `adm123` |

> Você pode alterar as senhas padrão editando o arquivo `db.js`.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (pode ser público ou privado com Pages ativado)
2. Faça upload dos 4 arquivos:
   - `index.html`
   - `style.css`
   - `db.js`
   - `app.js`
3. Vá em **Settings → Pages**
4. Em **Source**, selecione a branch `main` e a pasta `/ (root)`
5. Clique em **Save**
6. Aguarde 1-2 minutos — o site estará disponível em `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO`

## Funcionalidades

- Login com validação de usuário e senha
- 4 contas ADM pré-configuradas (Leonardo, Abner, Isabela, Matheus)
- Painel ADM com estatísticas e tabela de usuários
- Criação de novos usuários (pelo painel ADM ou pela tela de registro)
- Remoção de usuários comuns pelo ADM
- Banco de dados em `localStorage` — os dados persistem entre sessões no mesmo navegador
- Layout responsivo (funciona no celular)

## Estrutura de arquivos

```
index.html   → estrutura da página
style.css    → estilos visuais
db.js        → banco de dados (localStorage)
app.js       → lógica da aplicação
```
