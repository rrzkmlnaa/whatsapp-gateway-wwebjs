const express = require('express');
const userRoutes = require('./userRoutes');
const whatsappRoutes = require('./whatsappRoutes');
const reportRoutes = require('./reportRoutes');

const router = express.Router();

// User Routes - Prefix with /api/users
router.use('/users', userRoutes);

// WhatsApp Routes - Prefix with /api/whatsapp
router.use('/', whatsappRoutes);

// Reports Routes - Prefix with /api/reports
router.use('/reports', reportRoutes);

module.exports = router;
