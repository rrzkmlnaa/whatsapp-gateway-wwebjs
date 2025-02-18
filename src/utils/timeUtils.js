/**
 * Convert a Unix timestamp to a human-readable date string.
 * @param {number} timestamp - The Unix timestamp in seconds.
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - The format of the date string (optional, defaults to 'YYYY-MM-DD HH:mm:ss').
 * @returns {string} - The formatted date string.
 */
function formatTimestampToDate(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds

  // Use Intl.DateTimeFormat to format the date
  const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // 24-hour format
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
  return formattedDate;
}

module.exports = { formatTimestampToDate };