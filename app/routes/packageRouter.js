const express = require('express');
const router = express.Router();
const packageController = require('../Controllers/packageController');

// Create a new package
router.post('/', packageController.createPackage);

// Get all packages
router.get('/', packageController.getAllPackages);

// Get single package by ID
router.get('/:id', packageController.getPackageById);

// Update package
router.put('/:id', packageController.updatePackage);

// Delete package
router.delete('/:id', packageController.deletePackage);

// Get package count
router.get('/count', packageController.getPackageCount);

module.exports = router;