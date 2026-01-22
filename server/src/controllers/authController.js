const { google } = require('googleapis');

// Cria uma instância do cliente OAuth2
// As credenciais são carregadas das variáveis de ambiente
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_BASE_URL}/auth/google/callback` // Redirect URI
);

// Escopos definem as permissões que estamos solicitando ao usuário
const scopes = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Gera e redireciona para a URL de consentimento do Google.
 */
exports.redirectToGoogle = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Solicita um refresh_token
    scope: scopes,
  });
  res.redirect(url);
};

/**
 * Manipula o callback do Google após o consentimento.
 * Por enquanto, apenas exibe o código de autorização no console.
 */
exports.handleGoogleCallback = async (req, res) => {
  const { code } = req.query;
  console.log('Código de autorização recebido:', code);

  // Próximos passos (para v0.2.0):
  // 1. Trocar o 'code' por tokens de acesso e refresh
  // const { tokens } = await oauth2Client.getToken(code);
  // 2. Armazenar os tokens de forma segura
  // 3. Criar uma sessão de usuário
  // 4. Redirecionar o usuário de volta para o frontend

  res.send('Autenticação em progresso... Você pode fechar esta aba.');
};
