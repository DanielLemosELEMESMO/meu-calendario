const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const token = req.cookies?.mc_session;
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.SESSION_JWT_SECRET);
    req.userId = payload.userId;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'unauthorized' });
  }
};

module.exports = requireAuth;
