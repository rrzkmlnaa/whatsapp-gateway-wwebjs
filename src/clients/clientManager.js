const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const { formatPhoneNumber, phoneNumberCheck } = require('../utils/phoneUtils');
const { PrismaClient } = require('@prisma/client');
const { formatTimestampToDate } = require('../utils/timeUtils');
const { platform } = require('os');
const prisma = new PrismaClient();

// Store clients in memory
const clients = {};

// Path to store session data
const sessionsPath = path.join(__dirname, '../sessions');

/**
 * Ensure the session directory exists
 */
function ensureSessionDirectory() {
  if (!fs.existsSync(sessionsPath)) {
    fs.mkdirSync(sessionsPath, { recursive: true });
  }
}

/**
 * Create a new WhatsApp client or load an existing one if the session is available.
 * @param {string} deviceId - The unique identifier for the device.
 * @returns {Client} - The initialized WhatsApp client.
 */
function createClient(deviceId) {
  const authPath = path.join(sessionsPath, deviceId);

  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: deviceId,
      dataPath: authPath,
    }),
    puppeteer: {
      // for using on vps
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions',
      ],
    },
  });

  // Handle QR code generation
  client.on('qr', async (qr) => {
    try {
      const qrCodeBase64 = await qrcode.toDataURL(qr);
      client.emit('qr-code', { deviceId, qrCodeBase64 }); // Emit custom 'qr-code' event
    } catch (error) {
      console.error('Error generating QR Code Base64:', error);
    }
  });

  client.on('ready', async () => {
    try {
      // update the device status in the database
      await prisma.device.update({
        where: { deviceId: deviceId },
        data: { status: 'AUTHENTICATED' },
      });

      console.log(`Client ${deviceId} is ready!`);
    } catch (error) {
      // update the device status in the database
      await prisma.device.update({
        where: { deviceId: deviceId },
        data: { status: 'UNAUTHENTICATED' },
      });

      console.error('Error handling ready event:', error);
    }
  });

  client.on('message', async (message) => {
    if (message.body === 'add') {
      const chat = await message.getChat();
      chat.addParticipants(['6285156808928']);
    }

    try {
      const phoneNumber = formatPhoneNumber(message.from, { toString: false });

      // Validate phone number
      if (!phoneNumberCheck(phoneNumber)) {
        return;
      }

      // fetch the device
      const device = await prisma.device.findUnique({
        where: { deviceId: deviceId },
      });

      // Fetch or create contact
      let contact = await prisma.contact.findUnique({
        where: { phone: phoneNumber },
        select: { id: true },
      });

      if (!contact) {
        console.log(
          `Contact not found. Creating a new contact for phone number: ${phoneNumber}`,
        );
        contact = await prisma.contact.create({
          data: {
            phone: phoneNumber,
            name: `Unknown`, // Use a placeholder name for unknown contacts
            deviceId: device.id,
          },
          select: { id: true },
        });
      }

      // Fetch or create chat for the contact
      let chat = await prisma.chat.findFirst({
        where: { contactId: contact.id },
        select: { id: true, messages: true },
      });

      if (!chat) {
        console.log(
          `Chat not found for contact ID: ${contact.id}. Creating a new chat.`,
        );
        chat = await prisma.chat.create({
          data: {
            contactId: contact.id,
            messages: [],
          },
          select: { id: true, messages: true },
        });
      }

      // Add the new message to the chat
      const updatedMessages = [
        ...chat.messages,
        {
          body: message.body,
          from: message.from,
          to: message.to,
          fromMe: message.fromMe,
          links: message.links,
          dateTime: formatTimestampToDate(message.timestamp),
          deviceId,
        },
      ];

      // Update the chat with the new message
      await prisma.chat.update({
        where: { id: chat.id },
        data: { messages: updatedMessages },
      });

      console.log(`Message added to chat ID: ${chat.id}`);
    } catch (error) {
      console.error('Error handling incoming message:', error.message, {
        phoneNumber: message.from,
        errorStack: error.stack,
      });
    }
  });

  client.on('message_create', async (message) => {
    // Ignore incoming messages, only handle messages sent by the device (fromMe)
    if (!message.fromMe) return;

    try {
      const phoneNumber = formatPhoneNumber(message.to, { toString: false });

      // Validate phone number
      if (!phoneNumberCheck(phoneNumber)) {
        return;
      }

      // Fetch the device
      const device = await prisma.device.findUnique({
        where: { deviceId: deviceId },
      });

      // Fetch or create contact
      let contact = await prisma.contact.findUnique({
        where: { phone: phoneNumber },
        select: { id: true },
      });

      if (!contact) {
        console.log(
          `Contact not found. Creating a new contact for phone number: ${phoneNumber}`,
        );
        contact = await prisma.contact.create({
          data: {
            phone: phoneNumber,
            name: `Unknown`, // Use a placeholder name for unknown contacts
            deviceId: device.id,
          },
          select: { id: true },
        });
      }

      // Fetch or create chat for the contact
      let chat = await prisma.chat.findFirst({
        where: { contactId: contact.id },
        select: { id: true, messages: true },
      });

      if (!chat) {
        console.log(
          `Chat not found for contact ID: ${contact.id}. Creating a new chat.`,
        );
        chat = await prisma.chat.create({
          data: {
            contactId: contact.id,
            messages: [],
          },
          select: { id: true, messages: true },
        });
      }

      // Add the new replied message to the chat
      const updatedMessages = [
        ...chat.messages,
        {
          body: message.body,
          from: message.from,
          to: message.to,
          fromMe: message.fromMe,
          links: message.links,
          dateTime: formatTimestampToDate(message.timestamp),
          deviceId,
        },
      ];

      // Update the chat with the new message
      await prisma.chat.update({
        where: { id: chat.id },
        data: { messages: updatedMessages },
      });

      console.log(`Replied message added to chat ID: ${chat.id}`);
    } catch (error) {
      console.error('Error handling replied message:', error.message, {
        phoneNumber: message.to,
        errorStack: error.stack,
      });
    }
  });

  client.initialize();
  return client;
}

/**
 * Register a new client or load an existing client for the specified deviceId.
 * @param {string} deviceId - The unique identifier for the device.
 * @returns {Client} - The WhatsApp client instance.
 */
function registerClient(deviceId) {
  if (clients[deviceId]) {
    console.log(`Client for device ${deviceId} already registered.`);
    return clients[deviceId];
  }

  console.log(`Registering new client for device ${deviceId}`);
  clients[deviceId] = createClient(deviceId);
  return clients[deviceId];
}

/**
 * Automatically load all registered clients (devices) from the session folder.
 */
function loadClients() {
  ensureSessionDirectory();

  const deviceIds = fs.readdirSync(sessionsPath);
  deviceIds.forEach((deviceId) => {
    registerClient(deviceId);
  });
}

/**
 * Remove a client and its session data.
 * @param {string} deviceId - The unique identifier for the device.
 * @returns {boolean} - True if successfully removed, false otherwise.
 */
function removeClient(deviceId) {
  if (!clients[deviceId]) {
    console.log(`Client ${deviceId} not found.`);
    return false;
  }

  try {
    clients[deviceId].destroy();
    delete clients[deviceId];

    const sessionPath = path.join(sessionsPath, deviceId);
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log(`Client ${deviceId} and session data removed.`);
    return true;
  } catch (error) {
    console.error(`Error removing client ${deviceId}:`, error);
    return false;
  }
}

/**
 * Get a client by deviceId.
 * @param {string} deviceId - The unique identifier for the device.
 * @returns {Client} - The WhatsApp client instance.
 */
function getClient(deviceId) {
  return clients[deviceId];
}

/**
 * Generate a new QR code for the specified deviceId.
 * @param {string} deviceId - The unique identifier for the device.
 * @returns {Promise<string>} - The new QR code in Base64 format.
 */
async function generateNewQrCode(deviceId) {
  const client = getClient(deviceId);

  if (!client) {
    throw new Error(`Client with deviceId ${deviceId} not found`);
  }

  return new Promise((resolve, reject) => {
    // Listen for the next QR event
    client.once('qr', async (qr) => {
      try {
        const qrCodeBase64 = await qrcode.toDataURL(qr);
        resolve(qrCodeBase64);
      } catch (error) {
        reject(`Error generating QR Code: ${error.message}`);
      }
    });

    // Force reinitialize the QR code (disconnect and reconnect client)
    client
      .destroy()
      .then(() => client.initialize())
      .catch(reject);
  });
}

/**
 * Get client info by deviceId.
 */
async function getClientInfo(deviceId) {
  const client = getClient(deviceId);

  if (!client) {
    console.log(`Client with deviceId ${deviceId} not found`);
    return `Client with deviceId ${deviceId} not found`;
  }

  const info = client.info;

  try {
    const deviceInfo = await prisma.device.findUnique({
      where: { deviceId: deviceId },
    });

    const data = {
      whatsapp_info: {
        pushname: info.pushname,
        ...info.wid,
      },
      device_info: {
        device_id: deviceInfo.id,
        device_name: deviceInfo.name,
        platform: info.platform,
        type: deviceInfo.type,
        status: deviceInfo.status,
        created_at: deviceInfo.createdAt,
        updated_at: deviceInfo.updatedAt,
      },
    };

    return data;
  } catch (error) {
    return error;
  }
}

module.exports = {
  registerClient,
  getClient,
  loadClients,
  removeClient,
  generateNewQrCode,
  getClientInfo,
};
