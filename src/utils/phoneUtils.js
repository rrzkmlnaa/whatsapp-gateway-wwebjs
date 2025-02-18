/**
 * Format or revert a phone number to/from WhatsApp ID (WID) format (phoneNumber@c.us).
 * By default, the phone number is formatted as a string with @c.us.
 *
 * @param {string | number} phoneNumber - The phone number to be formatted or reverted.
 * @param {Object} [options] - Options to customize the behavior.
 * @param {boolean} [options.toString=true] - If true, format as WID; if false, revert to plain number.
 * @returns {string | number} - The formatted WhatsApp ID (WID) or reverted phone number.
 */
function formatPhoneNumber(phoneNumber, options = { toString: true }) {
  const { toString = true } = options;

  // Remove suffix after dash if present
  const cleanPhone = String(phoneNumber).split('-')[0].trim();

  if (toString) {
    // Ensure the phone number is a string, and add "@c.us" if not already present
    return cleanPhone.endsWith('@c.us') ? cleanPhone : `${cleanPhone}@c.us`;
  } else {
    // Remove "@c.us" and convert back to a number if it represents a valid number
    const plainNumber = cleanPhone.replace(/@c\.us$/, '');
    return /^\d+$/.test(plainNumber) ? BigInt(plainNumber) : plainNumber; // Use BigInt for large numbers
  }
}

/**
 * Validates if the phone number contains only numbers and has a length between 9 and 14.
 *
 * @param {string | number} phoneNumber - The phone number to validate.
 * @returns {boolean} - Returns true if valid, otherwise false.
 */
function phoneNumberCheck(phoneNumber) {
  const phoneStr = String(phoneNumber); // Ensure the phone number is treated as a string
  const phoneRegex = /^[0-9]{9,14}$/; // Regex to match only numbers with length 9-14
  return phoneRegex.test(phoneStr);
}

module.exports = { formatPhoneNumber, phoneNumberCheck };
