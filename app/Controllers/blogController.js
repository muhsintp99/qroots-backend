// const Blog = require('../models/blog');

// // Create a new blog
// exports.createBlog = async (req, res) => {
//   try {
//     const { title, shortDesc, fullDesc, link, createdBy, updatedBy } = req.body;
//     // const image = req.file ? `/public/blog/${req.file.filename}` : null;
//     const image = req.file ? req.file.path : null;

//     if (!image) return res.status(400).json({ error: 'Image is required.' });

//     const blog = new Blog({ title, shortDesc, fullDesc, link, image, createdBy, updatedBy });
//     const saved = await blog.save();
//     res.status(201).json(saved);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Get all blogs
// exports.getAllBlog = async (req, res) => {
//   try {
//     const blogs = await Blog.find({ isDeleted: false }).sort({ createdAt: -1 });;
//     const total = await Blog.countDocuments({ isDeleted: false });
//     res.json({
//       total,
//       data: blogs
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Get a single blog
// exports.getBlogById = async (req, res) => {
//   try {
//     const blog = await Blog.findOne({ _id: req.params.id, isDeleted: false });
//     if (!blog) return res.status(404).json({ message: 'Blog not found' });
//     res.json(blog);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Update blog
// exports.updateBlog = async (req, res) => {
//   try {
//     const { title, shortDesc, fullDesc, link, updatedBy } = req.body;
//     const image = req.file ? req.file.path : null;

//     // Check if blog exists
//     const blog = await Blog.findById(req.params.id);
//     if (!blog || blog.isDeleted) {
//       return res.status(404).json({ error: 'Blog not found or has been deleted' });
//     }

//     const updateData = { title, shortDesc, fullDesc, link, updatedBy };
//     if (image) updateData.image = image;

//     const updated = await Blog.findByIdAndUpdate(req.params.id, updateData, { new: true });
//     if (!updated) {
//       return res.status(500).json({ error: 'Failed to update blog' });
//     }

//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Soft delete
// exports.softDeleteBlog = async (req, res) => {
//   try {
//     const deleted = await Blog.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
//     res.json({ message: 'Blog deleted', data: deleted });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Hard delete
// exports.deleteBlog = async (req, res) => {
//   try {
//     const deleted = await Blog.findByIdAndDelete(req.params.id);
//     if (!deleted) return res.status(404).json({ message: 'Blog not found' });
//     res.json({ message: 'Blog permanently deleted' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };



// ---------------------------------------------------------------------------------------------------------------


const Blog = require('../models/blog');
const { cloudinary, uploadDefaultImage } = require('../middlewares/cloudinaryUpload');
const path = require('path');

// Create a new blog
exports.createBlog = async (req, res) => {
  try {
    const { title, shortDesc, fullDesc, link, createdBy, updatedBy, isVisible } = req.body;
    let image = null;
    let imagePublicId = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'blogs',
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
      });
      image = result.secure_url;
      imagePublicId = result.public_id;
    } else {
      // Use default image if no file is uploaded
      const defaultImage = await uploadDefaultImage(path.join(__dirname, '../public/default/blog.png'), 'blogs');
      image = defaultImage.url;
      imagePublicId = defaultImage.publicId;
    }

    if (!image) {
      return res.status(400).json({ error: 'Image is required.' });
    }

    const blog = new Blog({
      title,
      shortDesc,
      fullDesc,
      link,
      image,
      imagePublicId,
      createdBy: createdBy || 'admin',
      updatedBy: updatedBy || 'admin',
      isVisible: isVisible !== undefined ? isVisible : true
    });
    const saved = await blog.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Create blog error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all blogs
exports.getAllBlog = async (req, res) => {
  try {
    const blogs = await Blog.find({ isDeleted: false }).sort({ createdAt: -1 });
    const total = await Blog.countDocuments({ isDeleted: false });
    res.json({
      total,
      data: blogs
    });
  } catch (err) {
    console.error('Get all blogs error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get a single blog
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, isDeleted: false });
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json(blog);
  } catch (err) {
    console.error('Get blog by ID error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const { title, shortDesc, fullDesc, link, updatedBy, isVisible } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog || blog.isDeleted) {
      return res.status(404).json({ error: 'Blog not found or has been deleted' });
    }

    const updateData = {
      title,
      shortDesc,
      fullDesc,
      link,
      updatedBy: updatedBy || 'admin',
      isVisible: isVisible !== undefined ? isVisible : blog.isVisible
    };

    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (blog.imagePublicId) {
        await cloudinary.uploader.destroy(blog.imagePublicId);
      }
      // Upload new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'blogs',
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
      });
      updateData.image = result.secure_url;
      updateData.imagePublicId = result.public_id;
    } else if (!blog.image) {
      // Use default image if no image exists and none uploaded
      const defaultImage = await uploadDefaultImage(path.join(__dirname, '../public/default/blog.png'), 'blogs');
      updateData.image = defaultImage.url;
      updateData.imagePublicId = defaultImage.publicId;
    }

    const updated = await Blog.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update blog' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Update blog error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Soft delete
exports.softDeleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog || blog.isDeleted) {
      return res.status(404).json({ message: 'Blog not found or already deleted' });
    }

    // Delete image from Cloudinary if it exists
    if (blog.imagePublicId) {
      await cloudinary.uploader.destroy(blog.imagePublicId);
    }

    const deleted = await Blog.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, image: null, imagePublicId: null },
      { new: true }
    );
    res.json({ message: 'Blog soft deleted', data: deleted });
  } catch (err) {
    console.error('Soft delete blog error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Hard delete
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Delete image from Cloudinary if it exists
    if (blog.imagePublicId) {
      await cloudinary.uploader.destroy(blog.imagePublicId);
    }

    const deleted = await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog permanently deleted' });
  } catch (err) {
    console.error('Hard delete blog error:', err);
    res.status(500).json({ error: err.message });
  }
};