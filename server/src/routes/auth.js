const { Router } = require('express');
const authController = require('../controllers/authController');

const router = Router();

// Rota para iniciar o processo de autenticação com o Google
// Redireciona o usuário para a página de consentimento do Google
router.get('/google', authController.redirectToGoogle);

// Rota de callback que o Google chama após o consentimento do usuário
// Recebe o código de autorização para ser trocado por tokens
router.get('/google/callback', authController.handleGoogleCallback);

// Logout: limpa cookie de sessao
router.post('/logout', authController.logout);

module.exports = router;
