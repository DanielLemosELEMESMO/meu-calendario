# Plano de Setup: Frontend

Este documento detalha os passos para configurar o ambiente de desenvolvimento do cliente (frontend).

## 1. Inicialização

1.  A partir da raiz do projeto, executar o comando do Vite para criar o projeto na pasta `client/`.
2.  Usaremos o template `react-ts` para um projeto com React e TypeScript.

**Comando:**
```bash
npm create vite@latest client -- --template react-ts
```

## 2. Instalação de Dependências

Após a criação do projeto, navegaremos até a pasta `client/` e instalaremos as dependências.

1.  `npm install`: Instala as dependências padrão do template.
2.  `npm install axios react-big-calendar date-fns @types/react-big-calendar`: Instala as bibliotecas adicionais que usaremos.

### Detalhes das Dependências
- `axios`: Cliente HTTP para fazer chamadas à nossa API backend.
- `react-big-calendar`: Componente principal para a renderização do calendário.
- `date-fns`: Biblioteca de utilitários de data, uma dependência do `react-big-calendar`.
- `@types/react-big-calendar`: Definições de tipo TypeScript para a biblioteca do calendário.

## 3. Estrutura de Componentes

A estrutura de componentes inicial será simples, focada em exibir o calendário e lidar com a autenticação.

```
client/src/
├── assets/
├── components/
│   ├── Calendar.tsx      # O componente principal que renderiza o react-big-calendar.
│   └── Login.tsx         # Uma página ou componente que solicita o login com o Google.
├── App.tsx             # Componente raiz que gerencia o estado (ex: se o usuário está logado).
├── main.tsx            # Ponto de entrada da aplicação React.
└── styles/
    └── calendar.css    # Estilos para o calendário.
```

## 4. Lógica de Comunicação e Estado

- **`App.tsx`**: Será responsável por verificar se o usuário está autenticado.
  - Se não estiver autenticado, renderizará o componente `Login`.
  - Se estiver autenticado, buscará os eventos da API (`/api/events`) e renderizará o componente `Calendar`, passando os eventos como props.

- **`Login.tsx`**: Terá um único botão, "Conectar com o Google". Ao ser clicado, ele não fará uma chamada de API, mas sim redirecionará o navegador do usuário para o endpoint de autenticação do nosso backend: `http://localhost:3001/auth/google`.

- **`Calendar.tsx`**: Receberá a lista de eventos e as configurações necessárias para o `react-big-calendar`. Também importará o CSS da biblioteca para a estilização padrão.

```typescript
// Exemplo de como importar o CSS do calendário em Calendar.tsx
import 'react-big-calendar/lib/css/react-big-calendar.css';
```

## 5. Proxy de API (Vite)

Para evitar problemas com CORS em desenvolvimento e simplificar as chamadas de API, configuraremos um proxy no arquivo `vite.config.ts`. Isso fará com que chamadas do frontend para `/api` sejam redirecionadas para o nosso servidor backend.

**Arquivo `vite.config.ts`:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Endereço do nosso servidor backend
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
```
Com isso, em vez de chamarmos `axios.get('http://localhost:3001/api/events')`, poderemos simplesmente chamar `axios.get('/api/events')`.
```
