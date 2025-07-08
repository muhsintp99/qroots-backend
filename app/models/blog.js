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
  createdBy: {
    type: String,
    default: 'User'
  },
  updatedBy: {
    type: String,
    default: 'User'
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
  timestamps: true
});

const Blog = mongoose.model('Blog', BlogSchema);

module.exports = Blog;