const {
  getClient,
  registerClient,
  removeClient,
  generateNewQrCode,
  getClientInfo,
} = require('../clients/clientManager');
const { formatPhoneNumber } = require('../utils/phoneUtils');
const { PrismaClient } = require('@prisma/client');
const { formatTimestampToDate } = require('../utils/timeUtils');
const prisma = new PrismaClient();

/**
 * Register a new WhatsApp device session.
 */
function registerDevice(req, res) {
  const { name, deviceId, phoneNumber, type } = req.body;
  try {
    const client = getClient(deviceId) || registerClient(deviceId);

    // Listen for the 'qr-code' event on the client
    client.once('qr-code', async ({ qrCodeBase64 }) => {
      await prisma.device.create({
        data: {
          name: name,
          deviceId,
          phone: BigInt(phoneNumber),
          type: type,
        },
      });

      res.send({
        data: { qrCode: qrCodeBase64 },
        message: `Device ${deviceId} registered successfully`,
      });
    });
  } catch (error) {
    res.send({
      errorDetails: error.message,
      message: 'Error registering device',
    });
  }
}

/**
 * Remove an existing WhatsApp device session.
 */
async function removeDevice(req, res) {
  const { deviceId } = req.body;
  try {
    const clientRemoved = removeClient(deviceId);
    console.log('Client removed:', clientRemoved);

    if (clientRemoved) {
      // Use findFirst if deviceId is not unique
      const device = await prisma.device.findFirst({
        where: { deviceId },
      });

      if (device) {
        await prisma.device.delete({
          where: { id: device.id }, // Use unique `id` for deletion
        });
        console.log('Device deleted from database:', deviceId);

        res.send({
          message: `Device ${deviceId} removed successfully`,
        });
      } else {
        res.send({
          message: 'Device not found in database',
          errorDetails: `Device with ID ${deviceId} does not exist`,
        });
      }
    } else {
      res.send({
        message: 'Device not found in client manager',
        errorDetails: `Device ${deviceId} does not exist`,
      });
    }
  } catch (error) {
    console.error('Error removing device:', error);
    res.send({
      errorDetails: error.message,
      message: 'Error removing device',
    });
  }
}

/**
 * Get Devices
 */
async function getDevices(req, res) {
  try {
    const devices = await prisma.device.findMany({
      select: {
        id: true,
        name: true,
        deviceId: true,
        phone: true, // Assuming `phone` is a BigInt
        type: true,
        status: true,
      },
    });

    // Map the results to convert BigInt values to strings
    const formattedDevices = devices.map((device) => ({
      ...device,
      phone: device.phone ? Number(device.phone) : null, // Convert BigInt to string
    }));

    res.send({
      data: formattedDevices,
      message: 'Devices fetched successfully',
    });
  } catch (error) {
    console.log(error);
    res.send({
      errorDetails: error.message,
      message: 'Error fetching devices',
    });
  }
}

/**
 * Generate a new QR code for the specified deviceId.
 */
async function generateQr(req, res) {
  const { deviceId } = req.body;

  try {
    const qrCodeBase64 = await generateNewQrCode(deviceId);
    res.send({
      data: { qrCode: qrCodeBase64 },
      message: `New QR code generated for device ${deviceId}`,
    });
  } catch (error) {
    res.send({
      errorDetails: error.message,
      message: 'Error generating QR code',
    });
  }
}

/**
 * Get device detail for the specified deviceId.
 */
async function getDeviceInfo(req, res) {
  const { deviceId } = req.body;

  try {
    const info = await getClientInfo(deviceId);
    res.send({
      data: info,
      message: `Detail info for device ${deviceId}`,
    });
  } catch (error) {
    res.send({
      errorDetails: error.message,
      message: 'Error getting device info',
    });
  }
}

/**
 * Send a message to a specific phone number.
 */
async function sendMessage(req, res) {
  const { deviceId, phoneNumber, message } = req.body;

  try {
    const client = getClient(deviceId);
    if (!client) {
      return res.send({
        message: 'Device not found',
        errorDetails: `Device with ID ${deviceId} does not exist`,
      });
    }

    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    const chat = await client.getChatById(formattedPhoneNumber);
    await chat.sendMessage(message);

    res.send({
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.send({
      errorDetails: error.message,
      message: 'Error sending message',
    });
  }
}

/**
 * Get messages from a specific device.
 */
async function getMessages(req, res) {
  const { deviceId, contactId, limitMessage } = req.query;

  // Validate the limitMessage to ensure it's a valid number (default to 10 if not provided)
  const limit = limitMessage ? parseInt(limitMessage, 10) : 10;
  if (isNaN(limit) || limit < 1) {
    return res.status(400).send({
      message: 'Invalid limitMessage parameter',
      errorDetails: 'limitMessage must be a positive integer.',
    });
  }

  try {
    const client = getClient(deviceId);
    if (!client) {
      return res.status(404).send({
        message: 'Device not found',
        errorDetails: `Device with ID ${deviceId} does not exist`,
      });
    }

    // Construct the query condition for contactId if it's provided
    const whereCondition = {
      messages: {
        path: '$[*].deviceId', // Matches `deviceId` in the `messages` array of JSON objects
        array_contains: deviceId, // Filters records where any object in `messages` has the matching `deviceId`
      },
    };

    // Add contactId filter if it's provided
    if (contactId) {
      whereCondition.contactId = parseInt(contactId, 10); // Ensure contactId is a valid number
    }

    const chats = await prisma.chat.findMany({
      where: whereCondition,
      include: {
        contact: {
          select: { phone: true, name: true },
        },
      },
    });

    // Handle BigInt in contact.phone if necessary
    const chatsWithBigIntHandled = chats.map((chat) => {
      // Filter the messages by deviceId and limit the number of messages
      const filteredMessages = chat.messages
        .filter((message) => message.deviceId === deviceId)
        .slice(0, limit); // Limit the number of messages

      return {
        contact: {
          ...chat.contact,
          phone: chat.contact.phone.toString(), // Convert BigInt to string
        },
        messages: filteredMessages,
      };
    });

    res.send({
      data: chatsWithBigIntHandled,
      message: 'Messages fetched successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      errorDetails: error.message,
      message: 'Error fetching messages',
    });
  }
}

/**
 * Send a broadcast message to multiple phone numbers.
 */
async function sendBroadcast(req, res) {
  const { deviceId, numbers, message } = req.body;

  try {
    const client = getClient(deviceId);
    if (!client) {
      return res.send({
        message: 'Device not found',
        errorDetails: `Device with ID ${deviceId} does not exist`,
      });
    }

    for (let number of numbers) {
      const formattedPhoneNumber = formatPhoneNumber(number);
      const chat = await client.getChatById(formattedPhoneNumber);
      await chat.sendMessage(message);
    }

    res.send({
      message: 'Broadcast message sent successfully',
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.send({
      errorDetails: error.message,
      message: 'Error sending broadcast message',
    });
  }
}

/**
 * Initialize contacts from whatsapp with specific device by adding them to the database.
 */
async function initContacts(req, res) {
  const { deviceId } = req.body;

  try {
    const client = getClient(deviceId);
    if (!client) {
      return res.send({
        message: 'Device not found',
        errorDetails: `Device with ID ${deviceId} does not exist`,
      });
    }

    const device = await prisma.device.findUnique({
      where: { deviceId },
    });

    const contacts = await client.getContacts();
    // Filter and map contacts data to ensure only valid contacts are included
    const contactsData = contacts
      .filter((contact) => contact.id.server === 'c.us') // Only valid contacts
      .map((contact) => ({
        phone: BigInt(contact.number), // Ensure phone is BigInt
        name: contact.name || 'Unknown',
        deviceId: device.id,
      }));

    // Ensure there's data to insert
    if (contactsData.length > 0) {
      await prisma.contact.createMany({
        data: contactsData,
        skipDuplicates: true, // Avoid inserting duplicates based on phone
      });

      res.send({
        message: 'Contacts initialized successfully',
      });
    } else {
      res.send({
        message: 'No valid contacts found to initialize',
      });
    }
  } catch (error) {
    console.error('Error initializing contacts:', error);
    res.send({
      errorDetails: error.message,
      message: 'Error initializing contacts',
    });
  }
}

/**
 * Initialize messages from whatsapp with specific device by adding them to the database.
 */
async function initMessages(req, res) {
  const { deviceId } = req.body;

  try {
    const client = getClient(deviceId);
    if (!client) {
      return res.send({
        message: 'Device not found',
        errorDetails: `Device with ID ${deviceId} does not exist`,
      });
    }

    const chats = await client.getChats();
    const messagesData = [];

    for (let chat of chats) {
      const phone = formatPhoneNumber(chat.id.user, { toString: false });

      // Fetch contactId from the Contact table
      const contact = await prisma.contact.findUnique({
        where: { phone },
      });

      const contactId = contact ? contact.id : null;

      // If contactId is null, skip this chat
      if (!contactId) {
        continue; // Skip the rest of this iteration if contactId is null
      }

      const messages = await chat.fetchMessages({ limit: 999999999 });
      const chatMessages = messages
        .filter((f) => f.type === 'chat')
        .map((message) => ({
          body: message.body,
          from: message.from,
          to: message.to,
          fromMe: message.fromMe,
          links: message.links,
          dateTime: formatTimestampToDate(message.timestamp),
          deviceId,
        }));

      // Only push if contactId is valid
      messagesData.push({
        contactId,
        messages: chatMessages,
      });
    }

    // First, delete existing messages for the contactIds being processed
    await prisma.$executeRaw`TRUNCATE TABLE Chat;`;

    // Insert messagesData into the database
    await prisma.chat.createMany({
      data: messagesData,
      skipDuplicates: true, // Avoid inserting duplicates based on contactId
    });

    res.send({
      message: 'Messages initialized successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: 'Failed to initialize messages',
      error: error.message,
    });
  }
}

/**
 * Add participants to a group.
 */
async function addParticipants(req, res) {
  const { deviceId, groupId, participants } = req.body;

  try {
    const client = getClient(deviceId);
    if (!client) {
      return res.status(404).send({
        message: 'Device not found',
        errorDetails: `Device with ID ${deviceId} does not exist`,
      });
    }

    // Validate the group exists
    const group = (await client.getChatById(groupId)).unreadCount;
    if (!group.isGroup) {
      // return res.status(400).send({
      //   message: 'The provided ID is not a group',
      // });
    }

    // Use client.addParticipants for adding members
    // await group.addParticipants(groupId, participants);

    res.send({
      message: 'Participants added successfully',
      data: group,
    });
  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).send({
      errorDetails: error.message,
      message: 'Error adding participants',
    });
  }
}

module.exports = {
  registerDevice,
  removeDevice,
  generateQr,
  getDevices,
  getDeviceInfo,
  sendMessage,
  getMessages,
  sendBroadcast,
  initContacts,
  initMessages,
  addParticipants,
};
