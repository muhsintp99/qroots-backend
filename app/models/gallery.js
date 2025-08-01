const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
    image: {
        type: String,
        required: true,
        default: '/public/defult/noimage.png'
    },
    date: {
        type: Date,
        required: true
        // No default value - must be provided
    },
    title: {
        type: String,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: String,
        default: 'admin'
    },
    updatedBy: {
        type: String,
        default: 'admin'
    }
}, {
    timestamps: true
});

// Index for better query performance
gallerySchema.index({ createdAt: -1 });
gallerySchema.index({ isDeleted: 1 });
gallerySchema.index({ date: -1 }); // Index for date field

const Gallery = mongoose.model('Gallery', gallerySchema);

module.exports = Gallery;