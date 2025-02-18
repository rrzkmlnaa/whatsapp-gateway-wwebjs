const express = require('express');
const router = express.Router();
const {
  registerDevice,
  removeDevice,
  sendMessage,
  sendBroadcast,
  generateQr,
  initContacts,
  getDevices,
  initMessages,
  getMessages,
  addParticipants,
  getDeviceInfo,
} = require('../controllers/whatsappController');

// Device management routes
router.post('/devices/register', registerDevice);
router.post('/devices/remove', removeDevice);
router.post('/devices/generate-qr', generateQr);
router.get('/devices', getDevices);
router.post('/devices/info', getDeviceInfo);

// Contacts routes
router.post('/init-contacts', initContacts);

// Messaging routes
router.post('/messages/init', initMessages);
router.post('/send-message', sendMessage);
router.post('/send-broadcast', sendBroadcast);
router.get('/messages', getMessages);

// Groups routes
router.post('/groups/add-participants', addParticipants);

module.exports = router;
