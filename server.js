const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv").config();

// Database connection
const connectDB = require('./config/dbconfig');
const seedDefaultIndiaCountry = require('./app/helpers/insertIndia');
const { insertDefaultAdmin } = require('./app/helpers/insertAdmin')

const app = express();
const port = process.env.PORT || 5151;

app.set('trust proxy', 1);

app.use(cors({
  origin: "*",
  credentials: true
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 1000,
  message: "Too many requests from this IP, please try again in an hour",
  keyGenerator: (req, res) => {
    return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  }
}));

app.use(`/public/defult`, express.static(path.join(__dirname, `public/defult`)));
app.use('/cloudinary', require('./app/routes/createCloudinaryUpload'));

const sseClients = new Set();

// SSE endpoint for streaming new enquiries
app.get('/api/enquiries/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    // Send keep-alive every 30 seconds
    const keepAlive = setInterval(() => {
        res.write(':keep-alive\n\n');
    }, 30000);

    // Remove client on close
    req.on('close', () => {
        sseClients.delete(res);
        clearInterval(keepAlive);
        res.end();
    });
});

// Make sseClients available to controllers
app.set('sseClients', sseClients);

// Default route
app.get('/', (req, res) => {
  res.json({ message: "Hello, Server Started" });
});

// Routes
app.use('/users', require('./app/routes/userRouter'));
app.use('/candidate', require('./app/routes/candidateRouter'));

app.use('/blog', require('./app/routes/blogRouter'));
app.use('/jobs', require('./app/routes/jobRouter'));
app.use('/services', require('./app/routes/serviceRoutes'));
app.use('/gallery', require('./app/routes/galleryRoutes'));
app.use('/enquiries', require('./app/routes/enquiry'));
app.use('/followUp', require('./app/routes/followUp'));
app.use('/countries', require('./app/routes/countryRoutes'));
app.use('/courses', require('./app/routes/courseRoutes'));
app.use('/college', require('./app/routes/collegeRouter'));
app.use('/intake', require('./app/routes/intakeRoutes'));
app.use('/contact', require('./app/routes/contactRoutes'));
app.use('/certificates', require('./app/routes/certificateRoutes'));
app.use('/coupons', require('./app/routes/couponCodeRouter'));
app.use('/packages', require('./app/routes/packageRouter'));

// // Server start
// app.listen(port, () => {
//   console.log(`🚀 Server is running on port ${port}`);
// });


const startServer = async () => {
  try {
    await connectDB();
    await seedDefaultIndiaCountry();
    await insertDefaultAdmin();
    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();