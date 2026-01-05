# Plano de Setup: Backend

Este documento detalha os passos para configurar o ambiente de desenvolvimento do servidor backend.

## 1. Inicialização

1.  Navegar até a pasta `server/`.
2.  Executar `npm init -y` para criar um arquivo `package.json`.
3.  Criar um arquivo `.gitignore` e adicionar `node_modules/` e `.env`.

## 2. Instalação de Dependências

Vamos instalar as seguintes dependências via `npm`:

### Dependências de Produção
- `express`: Framework web para criar a API.
- `pg`: Driver para conectar com o banco de dados PostgreSQL.
- `googleapis`: Biblioteca oficial do Google para interagir com a API do Calendar.
- `dotenv`: Para carregar variáveis de ambiente a partir de um arquivo `.env`.
- `cors`: Para habilitar o Cross-Origin Resource Sharing, permitindo que o frontend acesse a API.

**Comando:**
```bash
npm install express pg googleapis dotenv cors
```

### Dependências de Desenvolvimento
- `nodemon`: Para reiniciar o servidor automaticamente durante o desenvolvimento.

**Comando:**
```bash
npm install -D nodemon
```

## 3. Scripts do `package.json`

Adicionaremos um script `start` para facilitar a inicialização do servidor em modo de desenvolvimento:

```json
"scripts": {
  "start": "nodemon index.js"
}
```

## 4. Estrutura de Arquivos do Servidor

A pasta `server` terá a seguinte estrutura inicial:

```
server/
├── node_modules/
├── .env              # (A ser criado localmente) Armazena segredos e configurações
├── .gitignore
├── index.js          # Ponto de entrada do servidor Express
└── package.json
```

## 5. Configuração do Banco de Dados (PostgreSQL)

O servidor precisará de uma string de conexão para acessar o banco de dados. Esta string será armazenada no arquivo `.env`.

**Arquivo `.env`:**
```
# PostgreSQL Connection String
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Google API Credentials
GOOGLE_CLIENT_ID="SEU_CLIENT_ID"
GOOGLE_CLIENT_SECRET="SEU_CLIENT_SECRET"
GOOGLE_REDIRECT_URI="http://localhost:3001/auth/google/callback"

# Server Port
PORT=3001
```

## 6. Definição Inicial de Endpoints da API

Planejamos os seguintes endpoints para a funcionalidade básica:

- **Autenticação:**
  - `GET /auth/google`: Redireciona o usuário para a tela de consentimento do Google.
  - `GET /auth/google/callback`: Rota de callback que o Google chama após a autenticação. O servidor troca o código de autorização por tokens de acesso.

- **Dados do Calendário:**
  - `GET /api/events`: Retorna a lista de eventos do calendário do usuário (requer autenticação).

- **Status:**
  - `GET /api/test`: Endpoint de teste para verificar se o servidor está no ar.
```
