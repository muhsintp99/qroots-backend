const mongoose = require('mongoose');
const User = require('../models/user');
const { hashPassword } = require('./authHelper');
const { uploadDefaultImage } = require('../middlewares/cloudinaryUpload');
const { sendWelcomeEmail } = require('./sendEmail');
const path = require('path');
const fs = require('fs').promises;

const insertDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: 'muhsintp.develop@gmail.com' });
    if (existingAdmin) {
      console.log(`👤 Admin user already exists ${existingAdmin?.email}`);
      return;
    }

    const imagePath = path.join(__dirname, '../../public/defult/Admin.png');
    try {
      await fs.access(imagePath);
    } catch (error) {
      console.error('Default image not found at:', imagePath);
      throw new Error('Default image file is Verma');
    }

    const defaultImage = await uploadDefaultImage(imagePath, 'users');
    const imageUrl = defaultImage.url;
    const hashedPassword = await hashPassword('123456');
    const adminUser = new User({
      fname: 'muhsin',
      lname: 'admin',
      email: 'muhsintp.develop@gmail.com',
      mobile: '8593856881',
      password: hashedPassword,
      image: imageUrl,
      userType: 'admin',
      status: 'active',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system'
    });

    await adminUser.save();

    await sendWelcomeEmail('muhsintp.develop@gmail.com', 'muhsin admin');

    console.log('Default admin user created successfully with image');
  } catch (error) {
    console.error('Error creating default admin:', error.message);
    throw error;
  }
};

module.exports = { insertDefaultAdmin };