# Visão Geral do Projeto: MeuCalendario

Este documento descreve a visão geral e a arquitetura para o aplicativo de calendário desktop customizado.

## 1. Objetivo

O objetivo principal é criar um aplicativo de calendário que funcione como um substituto para o aplicativo de desktop do Google Calendar. A primeira e mais crucial funcionalidade é a sincronização bidirecional com os calendários do Google do usuário.

A longo prazo, o aplicativo será expandido para se integrar com outros sistemas de produtividade, gestão de projetos e rotinas pessoais (dieta, compromissos, etc.).

## 2. Arquitetura da Solução

Optamos por uma arquitetura de Cliente-Servidor para separar as responsabilidades e facilitar o aprendizado do desenvolvimento backend com Node.js.

- **Backend:** Uma API RESTful construída com Node.js e Express.js.
- **Frontend:** Uma Single-Page Application (SPA) construída com React e Vite.
- **Banco de Dados:** PostgreSQL para persistência de dados.

O projeto será estruturado em duas pastas principais na raiz: `client/` e `server/`.

## 3. Stack de Tecnologias

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Banco de Dados:** PostgreSQL
- **Driver do BD:** `pg` (node-postgres)
- **Autenticação:** Google APIs (OAuth 2.0)
- **Variáveis de Ambiente:** `dotenv`

### Frontend
- **Framework:** React
- **Build Tool:** Vite
- **Linguagem:** TypeScript
- **Requisições HTTP:** Axios
- **Componente de Calendário:** `react-big-calendar`
- **Estilização:** CSS puro com o `react-big-calendar/lib/css/react-big-calendar.css` e estilos customizados.

## 4. Infraestrutura (atual)

- **Banco de dados:** Supabase (PostgreSQL gerenciado), com conexao direta pelo backend.
- **Backend:** Node/Express rodando localmente durante o desenvolvimento; hospedagem de producao a definir.
- **Frontend:** Vercel para hospedar a SPA.

## 5. Estrutura de Pastas

```
MeuCalendario/
├── client/         # Aplicação React (Vite)
├── docs/           # Documentação do projeto (arquivos .md)
└── server/         # Aplicação Node.js (Express)
```
