const express = require('express');
const router = express.Router();
const {
  collectBehavior,
  getBehaviorData,
  getBehaviorDataById,
  getSessions,
  getStats
} = require('../controllers/behaviorController');

// POST route for collecting behavioral data
router.post('/collect-behavior', collectBehavior);

// GET routes for retrieving data
router.get('/behavior-data', getBehaviorData);
router.get('/behavior-data/:id', getBehaviorDataById);
router.get('/sessions', getSessions);
router.get('/stats', getStats);

module.exports = router;