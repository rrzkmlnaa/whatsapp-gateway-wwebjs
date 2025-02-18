const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Dashboard reports data.
 */
async function DashboardReport(req, res) {
  const { deviceId } = req.query;

  try {
    const getDevice = await prisma.device.findFirst({
      where: {
        deviceId: deviceId,
      },
    });

    let totalMessage = 0;
    let totalMessageToday = 0;
    let totalRepliedMessageToday = 0;
    let totalNonRepliedMessageToday = 0;
    let listMessagesMorningToday = [];
    let listMessagesAfternoonToday = [];
    let listMessagesEveningToday = [];
    let listMessagesLastWeek = [];

    if (getDevice) {
      totalMessage = await prisma.chat.count({
        where: {
          contact: {
            device: {
              id: getDevice.id,
            },
          },
        },
      });

      const messageTodayRaw = await prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM Chat
        LEFT JOIN Contact ON Contact.id = Chat.contactId
        WHERE DATE(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
          '%m/%d/%Y, %H:%i:%s'
        )) = CURRENT_DATE() AND Contact.deviceId = ${getDevice.id}`;
      totalMessageToday = parseInt(messageTodayRaw[0].total.toString());

      const messageRepliedTodayRaw = await prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM Chat
        WHERE DATE(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
          '%m/%d/%Y, %H:%i:%s'
        )) = CURRENT_DATE()
        AND JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].fromMe')) = 'true';`;
      totalRepliedMessageToday = parseInt(
        messageRepliedTodayRaw[0].total.toString(),
      );

      const messageNonRepliedTodayRaw = await prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM Chat
        WHERE DATE(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
          '%m/%d/%Y, %H:%i:%s'
        )) = CURRENT_DATE()
        AND JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].fromMe')) = 'false';`;
      totalNonRepliedMessageToday = parseInt(
        messageNonRepliedTodayRaw[0].total.toString(),
      );

      listMessagesMorningToday = await prisma.$queryRaw`
        SELECT Chat.*, Contact.name, Contact.phone, Contact.deviceId
        FROM Chat
        LEFT JOIN Contact ON Contact.id = Chat.contactId
        WHERE DATE(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
          '%m/%d/%Y, %H:%i:%s'
        )) = CURRENT_DATE()
        AND TIME(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
            '%m/%d/%Y, %H:%i:%s'
        )) BETWEEN '00:00:00' AND '11:59:59'
        AND Contact.deviceId = ${getDevice.id}`;
      listMessagesMorningToday.forEach((entry) => {
        entry.phone = Number(entry.phone); // Convert phone to a number
      });

      listMessagesAfternoonToday = await prisma.$queryRaw`
        SELECT Chat.*, Contact.name, Contact.phone, Contact.deviceId
        FROM Chat
        LEFT JOIN Contact ON Contact.id = Chat.contactId
        WHERE DATE(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
          '%m/%d/%Y, %H:%i:%s'
        )) = CURRENT_DATE()
        AND TIME(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
            '%m/%d/%Y, %H:%i:%s'
        )) BETWEEN '12:00:00' AND '15:59:59'`;
      listMessagesAfternoonToday.forEach((entry) => {
        entry.phone = Number(entry.phone); // Convert phone to a number
      });

      listMessagesEveningToday = await prisma.$queryRaw`
        SELECT Chat.*, Contact.name, Contact.phone, Contact.deviceId
        FROM Chat
        LEFT JOIN Contact ON Contact.id = Chat.contactId
        WHERE DATE(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
          '%m/%d/%Y, %H:%i:%s'
        )) = CURRENT_DATE()
        AND TIME(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
            '%m/%d/%Y, %H:%i:%s'
        )) BETWEEN '15:59:59' AND '23:59:59'`;
      listMessagesEveningToday.forEach((entry) => {
        entry.phone = Number(entry.phone); // Convert phone to a number
      });

      listMessagesLastWeek = await prisma.$queryRaw`
        SELECT Chat.*, Contact.name, Contact.phone, Contact.deviceId
        FROM Chat
        LEFT JOIN Contact ON Contact.id = Chat.contactId
        WHERE DATE(STR_TO_DATE(
          JSON_UNQUOTE(JSON_EXTRACT(messages, '$[last].dateTime')),
          '%m/%d/%Y, %H:%i:%s'
        ))
        BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURRENT_DATE()`;
      listMessagesLastWeek.forEach((entry) => {
        entry.phone = Number(entry.phone); // Convert phone to a number
      });
    }

    const reports = {
      totalMessage,
      totalMessageToday,
      totalRepliedMessageToday,
      totalNonRepliedMessageToday,
      listMessagesMorningToday,
      listMessagesAfternoonToday,
      listMessagesEveningToday,
      listMessagesLastWeek,
    };

    res.send({ data: reports, message: 'Data pulled successfully' }); // Send data and message
  } catch (error) {
    if (error.name === 'PrismaClientKnownRequestError') {
      res.send({
        errorDetails: error.message,
        message: 'Database error occurred',
      });
    } else {
      res.send({
        errorDetails: error.message,
        message: 'Error when pulling data',
      });
    }
  }
}

module.exports = {
  DashboardReport,
};
