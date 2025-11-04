const mongoose = require('mongoose');

const mouseEventSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  t: Number // timestamp
});

const clickEventSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  btn: Number,
  tgt: String,
  t: Number
});

const scrollEventSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  t: Number
});

const keyEventSchema = new mongoose.Schema({
  t: Number
});

const pageViewSchema = new mongoose.Schema({
  url: String,
  title: String,
  ref: String,
  t: Number
});

const fingerprintSchema = new mongoose.Schema({
  ua: String,
  lang: String,
  plat: String,
  scrw: Number,
  scrh: Number,
  color: Number,
  tz: String,
  maxTouch: Number
});

const behaviorDataSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    index: true
  },
  session_start: {
    type: Number,
    required: true
  },
  mouse_events: [mouseEventSchema],
  click_events: [clickEventSchema],
  scroll_events: [scrollEventSchema],
  key_events: [keyEventSchema],
  fingerprint: fingerprintSchema,
  page_views: [pageViewSchema],
  collected_at: {
    type: Date,
    default: Date.now
  },
  ip_address: String,
  user_agent: String
}, {
  timestamps: true
});

// Index for better query performance
behaviorDataSchema.index({ session_id: 1, collected_at: -1 });
behaviorDataSchema.index({ 'collected_at': -1 });

module.exports = mongoose.model('BehaviorData', behaviorDataSchema);