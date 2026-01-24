const { google } = require('googleapis');

const createOAuthClient = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_BASE_URL}/auth/google/callback`,
  );

const getCalendarClient = (auth) =>
  google.calendar({
    version: 'v3',
    auth,
  });

const getOauthProfileClient = (auth) =>
  google.oauth2({
    version: 'v2',
    auth,
  });

module.exports = {
  createOAuthClient,
  getCalendarClient,
  getOauthProfileClient,
};
