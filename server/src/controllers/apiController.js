const pool = require('../db/pool');
const { createOAuthClient, getCalendarClient } = require('../services/googleClient');

const getUser = async (userId) => {
  const result = await pool.query(
    'select id, email, name, picture from public.users where id = $1',
    [userId],
  );
  return result.rows[0] || null;
};

const getTokens = async (userId) => {
  const result = await pool.query(
    'select access_token, refresh_token, scope, token_type, expiry_date from public.google_tokens where user_id = $1',
    [userId],
  );
  return result.rows[0] || null;
};

const storeTokens = async (userId, credentials) => {
  const expiryDate = credentials.expiry_date
    ? new Date(credentials.expiry_date).toISOString()
    : null;

  await pool.query(
    `
      update public.google_tokens
      set access_token = $2,
          refresh_token = coalesce($3, public.google_tokens.refresh_token),
          scope = $4,
          token_type = $5,
          expiry_date = $6
      where user_id = $1
    `,
    [
      userId,
      credentials.access_token,
      credentials.refresh_token || null,
      credentials.scope || null,
      credentials.token_type || null,
      expiryDate,
    ],
  );
};

const getAuthorizedClient = async (userId) => {
  const tokens = await getTokens(userId);
  if (!tokens) {
    return null;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).getTime() : null,
  });

  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).getTime() : null;
  if (expiresAt && Date.now() >= expiresAt - 60000 && tokens.refresh_token) {
    const refreshed = await oauth2Client.refreshAccessToken();
    await storeTokens(userId, refreshed.credentials);
    oauth2Client.setCredentials(refreshed.credentials);
  }

  return oauth2Client;
};

const getEventStatusMap = async (userId, eventIds) => {
  if (!eventIds.length) {
    return new Map();
  }
  const result = await pool.query(
    `
      select event_id, completed
      from public.event_status
      where user_id = $1 and event_id = any($2::text[])
    `,
    [userId, eventIds],
  );
  return new Map(result.rows.map((row) => [row.event_id, row.completed]));
};

const parseGoogleDate = (dateValue, isEnd) => {
  if (!dateValue) return null;
  if (dateValue.dateTime) {
    return new Date(dateValue.dateTime);
  }
  if (dateValue.date) {
    const base = new Date(dateValue.date);
    if (isEnd) {
      return new Date(base.getTime() - 1);
    }
    return base;
  }
  return null;
};

exports.getMe = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'server_error' });
  }
};

exports.getEvents = async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'start_end_required' });
  }

  try {
    const oauth2Client = await getAuthorizedClient(req.userId);
    if (!oauth2Client) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const calendar = getCalendarClient(oauth2Client);
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(start).toISOString(),
      timeMax: new Date(end).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || [])
      .map((event) => {
        const startDate = parseGoogleDate(event.start, false);
        const endDate = parseGoogleDate(event.end, true);
        if (!startDate || !endDate) {
          return null;
        }
        return {
          id: event.id,
          title: event.summary || '(Sem titulo)',
          description: event.description || undefined,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          calendarId: event.organizer?.email || 'primary',
          completed: false,
        };
      })
      .filter(Boolean);

    const eventIds = events.map((event) => event.id);
    const statusMap = await getEventStatusMap(req.userId, eventIds);
    const withStatus = events.map((event) => ({
      ...event,
      completed: statusMap.get(event.id) ?? false,
    }));

    return res.json({ events: withStatus });
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return res.status(500).json({ error: 'server_error' });
  }
};

exports.createEvent = async (req, res) => {
  const { title, description, start, end, calendarId, timeZone } = req.body || {};
  if (!title || !start || !end) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  try {
    const oauth2Client = await getAuthorizedClient(req.userId);
    if (!oauth2Client) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const calendar = getCalendarClient(oauth2Client);
    const response = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      requestBody: {
        summary: title,
        description,
        start: {
          dateTime: start,
          timeZone,
        },
        end: {
          dateTime: end,
          timeZone,
        },
      },
    });

    const created = response.data;
    const startDate = parseGoogleDate(created.start, false);
    const endDate = parseGoogleDate(created.end, true);
    if (!startDate || !endDate) {
      return res.status(500).json({ error: 'invalid_event' });
    }

    return res.json({
      event: {
        id: created.id,
        title: created.summary || '(Sem titulo)',
        description: created.description || undefined,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        calendarId: created.organizer?.email || 'primary',
        completed: false,
      },
    });
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    return res.status(500).json({ error: 'server_error' });
  }
};

exports.setEventStatus = async (req, res) => {
  const { eventId, completed } = req.body || {};
  if (!eventId || typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  try {
    await pool.query(
      `
        insert into public.event_status (user_id, event_id, completed)
        values ($1, $2, $3)
        on conflict (user_id, event_id)
        do update set completed = excluded.completed
      `,
      [req.userId, eventId, completed],
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao salvar status de evento:', error);
    return res.status(500).json({ error: 'server_error' });
  }
};
