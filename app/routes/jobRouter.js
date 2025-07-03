const express = require('express');
const router = express.Router();
const jobController = require('../Controllers/jobController');

router.post('/', jobController.createJob);
router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);
router.put('/:id', jobController.updateJob);
router.delete('/:id', jobController.deleteJob);
router.get('/count/total', jobController.getJobCount);

module.exports = router;
