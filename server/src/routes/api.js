const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const apiController = require('../controllers/apiController');

const router = Router();

router.get('/me', requireAuth, apiController.getMe);
router.get('/events', requireAuth, apiController.getEvents);
router.get('/colors', requireAuth, apiController.getColors);
router.post('/events', requireAuth, apiController.createEvent);
router.patch('/events/:id', requireAuth, apiController.updateEvent);
router.delete('/events/:id', requireAuth, apiController.deleteEvent);
router.post('/event-status', requireAuth, apiController.setEventStatus);

module.exports = router;
