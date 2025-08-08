const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  whatsappNumber: String,
  totalSessions: {
    type: Number,
    default: 0
  },
  totalQueries: {
    type: Number,
    default: 0
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  lastActive: Date,
  engagementScore: {
    type: Number,
    default: 0
  },
  dailyActivity: [{
    date: Date,
    sessions: Number,
    queries: Number,
    messages: Number
  }],
  queryTypes: {
    search: { type: Number, default: 0 },
    help: { type: Number, default: 0 },
    profile: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  averageSessionLength: Number,
  preferredHours: [Number],
  topSearchTerms: [String],
  connections: [{
    userId: mongoose.Schema.Types.ObjectId,
    timestamp: Date
  }]
});

userStatsSchema.index({ userId: 1 });
userStatsSchema.index({ whatsappNumber: 1 });
userStatsSchema.index({ lastActive: -1 });

module.exports = mongoose.model('UserStats', userStatsSchema);