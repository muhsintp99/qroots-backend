const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    packId: {
        type: String,
        unique: true,
        required: true
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String
    },
    rate: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        enum: ['month', 'year'],
        required: true
    },
    points: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ['recommended', 'popular', 'new'],
        default: 'new'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
});

// packageSchema.index({ createdAt: 1 })

module.exports = mongoose.model('Package', packageSchema);
