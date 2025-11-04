const BehaviorData = require('../models/BehaviorData');

// POST /api/collect-behavior - Collect behavioral data
const collectBehavior = async (req, res) => {
  try {
    const behaviorData = req.body;
    
    // Basic validation
    if (!behaviorData.session_id) {
      return res.status(400).json({
        success: false,
        message: 'session_id is required'
      });
    }

    // Add metadata
    const dataToSave = {
      ...behaviorData,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    };

    // Save to database
    const savedData = await BehaviorData.create(dataToSave);

    console.log(`Data collected for session: ${behaviorData.session_id}`);
    
    res.status(200).json({
      success: true,
      message: 'Behavior data collected successfully',
      session_id: behaviorData.session_id,
      record_id: savedData._id
    });
  } catch (error) {
    console.error('Error collecting behavior data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

// GET /api/behavior-data - Get all behavior data with pagination
const getBehaviorData = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const sessionId = req.query.session_id;
    
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (sessionId) {
      query.session_id = sessionId;
    }

    // Get data with pagination
    const data = await BehaviorData.find(query)
      .sort({ collected_at: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'); // Exclude version key

    // Get total count for pagination
    const total = await BehaviorData.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: data,
      pagination: {
        current: page,
        total: totalPages,
        totalRecords: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching behavior data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

// GET /api/behavior-data/:id - Get specific behavior record by ID
const getBehaviorDataById = async (req, res) => {
  try {
    const recordId = req.params.id;
    
    const data = await BehaviorData.findById(recordId).select('-__v');
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Behavior data record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching behavior data by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

// GET /api/sessions - Get all unique sessions
const getSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get unique sessions with their latest activity
    const sessions = await BehaviorData.aggregate([
      {
        $group: {
          _id: '$session_id',
          session_start: { $first: '$session_start' },
          fingerprint: { $first: '$fingerprint' },
          last_activity: { $max: '$collected_at' },
          page_views_count: { $sum: { $size: '$page_views' } },
          mouse_events_count: { $sum: { $size: '$mouse_events' } },
          click_events_count: { $sum: { $size: '$click_events' } },
          scroll_events_count: { $sum: { $size: '$scroll_events' } },
          key_events_count: { $sum: { $size: '$key_events' } },
          total_records: { $sum: 1 }
        }
      },
      { $sort: { last_activity: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const totalSessions = await BehaviorData.distinct('session_id').then(sessions => sessions.length);

    res.status(200).json({
      success: true,
      data: sessions,
      pagination: {
        current: page,
        total: Math.ceil(totalSessions / limit),
        totalSessions: totalSessions
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

// GET /api/stats - Get collection statistics
const getStats = async (req, res) => {
  try {
    const totalRecords = await BehaviorData.countDocuments();
    const totalSessions = await BehaviorData.distinct('session_id').then(sessions => sessions.length);
    
    // Get records from last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRecords = await BehaviorData.countDocuments({
      collected_at: { $gte: last24Hours }
    });

    // Get event type counts from a sample of recent records
    const sampleData = await BehaviorData.find({
      collected_at: { $gte: last24Hours }
    }).limit(1000);

    const eventStats = {
      total_mouse_events: sampleData.reduce((sum, record) => sum + record.mouse_events.length, 0),
      total_click_events: sampleData.reduce((sum, record) => sum + record.click_events.length, 0),
      total_scroll_events: sampleData.reduce((sum, record) => sum + record.scroll_events.length, 0),
      total_key_events: sampleData.reduce((sum, record) => sum + record.key_events.length, 0),
      total_page_views: sampleData.reduce((sum, record) => sum + record.page_views.length, 0)
    };

    res.status(200).json({
      success: true,
      data: {
        total_records: totalRecords,
        total_sessions: totalSessions,
        recent_activity: {
          last_24_hours: recentRecords
        },
        event_statistics: eventStats
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

module.exports = {
  collectBehavior,
  getBehaviorData,
  getBehaviorDataById,
  getSessions,
  getStats
};