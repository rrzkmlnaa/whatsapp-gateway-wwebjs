const express = require('express');
const router = express.Router();
const { DashboardReport } = require('../controllers/reportController');

// Create user
router.get('/', DashboardReport);

// // Get all users
// router.get('/', getUsers);

// // Get a single user by ID
// router.get('/:id', getUserById);

// // Update user
// router.put('/:id', updateUser);

// // Delete user
// router.delete('/:id', deleteUser);

module.exports = router;
