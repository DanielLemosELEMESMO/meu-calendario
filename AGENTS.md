# Instruções para Agentes de IA

Este documento contém diretrizes técnicas essenciais para o desenvolvimento e manutenção do projeto "MeuCalendario".

## 1. Codificação de Arquivos

**Regra:** Todos os arquivos de texto e código-fonte devem ser salvos com a codificação **UTF-8**.

**Motivo:** O uso consistente de UTF-8 evita problemas de exibição de caracteres especiais (como acentos, cedilhas, etc.), que podem aparecer como "" (o símbolo de diamante com interrogação) se a codificação incorreta for usada. Ferramentas devem garantir que a escrita de arquivos seja feita neste formato.

## 2. Build do Projeto

O projeto é dividido em `client` (frontend) e `server` (backend). Cada parte tem seu próprio processo de build.

### Frontend (`client/`)

O frontend é uma aplicação React + Vite. Para gerar uma versão de produção:

1.  **Navegue até a pasta:** `cd client`
2.  **Instale as dependências:** `npm install`
3.  **Execute o build:** `npm run build`

Este comando criará uma pasta `dist/` contendo os arquivos estáticos otimizados que serão usados no deploy.

### Backend (`server/`)

O backend é uma aplicação Node.js + Express. Como é escrito em JavaScript puro (sem TypeScript, por enquanto), não há um passo de "build" obrigatório. A instalação das dependências é o suficiente para prepará-lo para execução.

1.  **Navegue até a pasta:** `cd server`
2.  **Instale as dependências:** `npm install`

## 3. Deploy do Projeto

As instruções de deploy variam para o frontend e o backend.

### Frontend (`client/`)

O frontend é hospedado na **Vercel** e o processo é automatizado.

-   **Gatilho:** Qualquer `push` para a branch `main` do repositório no GitHub.
-   **Processo da Vercel:**
    1.  Detecta automaticamente que é um projeto Vite.
    2.  Executa `npm install` para instalar as dependências.
    3.  Executa `npm run build` para compilar o projeto.
    4.  Publica o conteúdo da pasta `dist/` resultante.

### Backend (`server/`)

A estratégia de deploy para o backend **ainda não foi definida**. Durante a fase de desenvolvimento, o servidor é executado localmente. Estas instruções serão atualizadas assim que a plataforma de hospedagem for decidida.
