const express = require('express');
const router = express.Router();
const certificateController = require('../Controllers/certificateController');

router.post('/', certificateController.createCertificate);
router.put('/:id', certificateController.updateCertificate);
router.get('/:id', certificateController.getCertificateById);
router.get('/', certificateController.getAllCertificates);
router.delete('/:id', certificateController.deleteCertificate);
router.get('/count', certificateController.countCertificates);

module.exports = router;