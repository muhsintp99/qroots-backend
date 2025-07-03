const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');
const path = require('path'); // ✅ Missing import added

dotenv.config();

// ✅ Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Function to create multer upload middleware
function createUpload(folderName = 'uploads') {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: folderName,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
      transformation: [{ width: 800, height: 800, crop: 'limit' }]
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed!'), false);
    }
    cb(null, true);
  };

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max size
    fileFilter
  }).single('image');
}

// ✅ Upload default image from server local path
async function uploadDefaultImage(localPath, folderName = 'default') {
  const absolutePath = path.resolve(localPath);
  const result = await cloudinary.uploader.upload(absolutePath, {
    folder: folderName,
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  });
  return {
    url: result.secure_url,
    publicId: result.public_id
  };
}

module.exports = {
  createUpload,
  cloudinary,
  uploadDefaultImage
};
