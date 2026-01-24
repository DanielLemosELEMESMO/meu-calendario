const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const {
  createOAuthClient,
  getOauthProfileClient,
} = require('../services/googleClient');

const scopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_MAX_AGE_MS,
});

const clearCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
});

/**
 * Gera e redireciona para a URL de consentimento do Google.
 */
exports.redirectToGoogle = (req, res) => {
  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
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
  if (!code) {
    return res.status(400).send('Código de autorização ausente.');
  }

  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = getOauthProfileClient(oauth2Client);
    const profileResponse = await oauth2.userinfo.get();
    const profile = profileResponse.data;

    const userResult = await pool.query(
      `
        insert into public.users (google_sub, email, name, picture)
        values ($1, $2, $3, $4)
        on conflict (google_sub)
        do update set
          email = excluded.email,
          name = excluded.name,
          picture = excluded.picture
        returning id
      `,
      [profile.id, profile.email || null, profile.name || null, profile.picture || null],
    );

    const userId = userResult.rows[0].id;
    const expiryDate = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    await pool.query(
      `
        insert into public.google_tokens
          (user_id, access_token, refresh_token, scope, token_type, expiry_date)
        values ($1, $2, $3, $4, $5, $6)
        on conflict (user_id)
        do update set
          access_token = excluded.access_token,
          refresh_token = coalesce(excluded.refresh_token, public.google_tokens.refresh_token),
          scope = excluded.scope,
          token_type = excluded.token_type,
          expiry_date = excluded.expiry_date
      `,
      [
        userId,
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.scope || null,
        tokens.token_type || null,
        expiryDate,
      ],
    );

    const sessionToken = jwt.sign({ userId }, process.env.SESSION_JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('mc_session', sessionToken, buildCookieOptions());
    const redirectTo = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    return res.redirect(`${redirectTo}/`);
  } catch (error) {
    console.error('Erro no callback do Google:', error);
    return res.status(500).send('Erro ao autenticar com o Google.');
  }
};

exports.logout = (req, res) => {
  res.clearCookie('mc_session', clearCookieOptions());
  return res.json({ ok: true });
};
