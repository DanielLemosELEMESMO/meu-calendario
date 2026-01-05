# Documentação do Fluxo de Autenticação: Google OAuth 2.0

Este documento descreve o fluxo de autenticação e autorização para acessar os dados do Google Calendar de um usuário. Usaremos o fluxo "OAuth 2.0 for Web Server Applications".

## 1. Pré-requisitos: Google Cloud Platform

Antes de escrever qualquer código, é necessário configurar um projeto no [Google Cloud Platform (GCP)](https://console.cloud.google.com/):

1.  **Criar um Novo Projeto:** Se ainda não tiver um, crie um novo projeto.
2.  **Ativar a API:** No painel do projeto, vá para "APIs & Services" > "Library" e ative a **Google Calendar API**.
3.  **Criar Credenciais:**
    *   Vá para "APIs & Services" > "Credentials".
    *   Clique em "Create Credentials" > "OAuth client ID".
    *   Selecione "Web application" como tipo de aplicação.
    *   Em "Authorized JavaScript origins", adicione `http://localhost:5173` (a URL padrão do Vite).
    *   Em "Authorized redirect URIs", adicione `http://localhost:3001/auth/google/callback` (o endpoint do nosso backend que irá processar o retorno do Google).
4.  **Salvar Credenciais:** Após a criação, o Google fornecerá um **Client ID** e um **Client Secret**. Estes valores são extremamente sensíveis e devem ser armazenados de forma segura no arquivo `.env` do nosso backend.

## 2. O Fluxo de Autenticação (Passo a Passo)

O processo envolve uma dança entre o frontend, o backend e o Google.

**Passo 1: Início do Fluxo (Frontend -> Backend)**

-   O usuário clica no botão "Conectar com o Google" no nosso frontend.
-   O frontend **não** chama a API do Google diretamente. Em vez disso, ele redireciona o navegador do usuário para o nosso backend, no endpoint `GET /auth/google`.

**Passo 2: Geração da URL de Consentimento (Backend -> Google)**

-   O endpoint `GET /auth/google` no nosso servidor Express usa a biblioteca `googleapis`.
-   Ele gera uma URL de autorização especial. Essa URL inclui nosso `client_id`, os `scopes` (permissões) que estamos solicitando (ex: `https://www.googleapis.com/auth/calendar.readonly`), e a nossa `redirect_uri`.
-   O backend então redireciona o navegador do usuário para essa URL do Google.

**Passo 3: Consentimento do Usuário (Google)**

-   O usuário agora vê a tela de login e consentimento do Google.
-   Ele faz login (se necessário) e concede ao nosso aplicativo a permissão para acessar seu calendário.
-   Após o consentimento, o Google redireciona o navegador de volta para a `redirect_uri` que especificamos: `http://localhost:3001/auth/google/callback`. O Google anexa um `code` (código de autorização) a essa URL como um parâmetro de query.

**Passo 4: Troca do Código por Tokens (Backend -> Google)**

-   Nosso endpoint `GET /auth/google/callback` é ativado.
-   O servidor extrai o `code` da URL.
-   O servidor então faz uma requisição segura e direta (sem envolvimento do navegador) para a API do Google, trocando esse `code` (junto com o `client_id` e `client_secret`) por tokens de acesso.
-   O Google retorna:
    -   `access_token`: Uma chave de curta duração para fazer chamadas à API.
    -   `refresh_token`: Uma chave de longa duração para obter novos `access_token`s quando o atual expirar, sem precisar que o usuário faça login novamente.
    -   `expiry_date`: A data de expiração do `access_token`.

**Passo 5: Armazenamento dos Tokens (Backend -> Banco de Dados)**

-   O servidor armazena o `access_token` e, mais importante, o `refresh_token` no banco de dados PostgreSQL, associados ao perfil do usuário.
-   **Segurança:** O `refresh_token` é particularmente sensível e deve ser criptografado antes de ser salvo no banco de dados.

**Passo 6: Finalização do Fluxo**

-   Após salvar os tokens, o backend pode criar uma sessão para o usuário (por exemplo, usando cookies ou JWTs) para que o frontend saiba que o usuário está logado.
-   Finalmente, o backend redireciona o usuário de volta para a aplicação frontend, por exemplo, para `http://localhost:5173/calendar`.

A partir deste ponto, sempre que o frontend precisar de dados do calendário, ele fará uma requisição para um endpoint seguro no nosso backend (ex: `GET /api/events`), e o backend usará o `access_token` armazenado para buscar os dados no Google Calendar em nome do usuário.
```
