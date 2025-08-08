const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  whatsappNumber: String,
  query: {
    type: String,
    required: true
  },
  intent: String,
  results: [{
    userId: mongoose.Schema.Types.ObjectId,
    score: Number,
    matched: Boolean
  }],
  response: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  processingTime: Number,
  success: {
    type: Boolean,
    default: true
  },
  metadata: {
    searchType: String,
    filters: Object,
    location: String
  }
});

querySchema.index({ query: 'text' });
querySchema.index({ timestamp: -1 });
querySchema.index({ userId: 1 });
querySchema.index({ whatsappNumber: 1 });

module.exports = mongoose.model('Query', querySchema);