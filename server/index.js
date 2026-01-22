// Importa o framework Express
const express = require('express');
// Importa o dotenv para carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

// Cria uma instância do aplicativo Express
const app = express();

// Importa e registra as rotas de autenticação
const authRoutes = require('./src/routes/auth');
app.use('/auth', authRoutes);

// Define a porta do servidor, buscando da variável de ambiente ou usando 3001 como padrão
const PORT = process.env.PORT || 3001;

// Rota de teste para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor MeuCalendario está no ar!');
});

// Inicia o servidor e o faz escutar na porta definida
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
