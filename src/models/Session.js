const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  whatsappNumber: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  context: {
    type: Object,
    default: {}
  },
  messages: [{
    role: String,
    content: String,
    timestamp: Date
  }],
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // TTL: 24 hours
  },
  metadata: {
    platform: String,
    location: String,
    device: String
  }
});

sessionSchema.index({ whatsappNumber: 1 });
sessionSchema.index({ lastActivity: -1 });
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Session', sessionSchema);