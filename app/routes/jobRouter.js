const express = require('express');
const router = express.Router();
const jobController = require('../Controllers/jobController');

// Routes
router.post('/', jobController.createJob);
router.put('/:jobId', jobController.updateJob);
router.get('/', jobController.getAllJobs);
router.get('/:jobId', jobController.getJobById);
router.delete('/:jobId', jobController.deleteJob);
router.get('/count', jobController.getJobsCount);

module.exports = router;