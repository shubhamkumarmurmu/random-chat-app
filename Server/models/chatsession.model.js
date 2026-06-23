const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
    },
  },
  { timestamps: true }
);

chatSessionSchema.index({ participants: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
