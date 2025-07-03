const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BlogSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  shortDesc: {
    type: String,
    required: [true, 'Short Description is required']
  },
  fullDesc: {
    type: String,
    required: [true, 'Full Description is required']
  },
  link: {
    type: String,
    default: null
  },
  image: {
    type: String,
    default: null
  },
  imagePublicId: {
    type: String,
    default: null // Store Cloudinary public_id for image deletion
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  updatedBy: {
    type: String,
    default: 'admin'
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const Blog = mongoose.model('Blog', BlogSchema);

module.exports = Blog;