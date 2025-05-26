/**
 * Utility functions for log sanitization to prevent log injection attacks.
 */

/**
 * Sanitizes a message for logging by removing newlines and other potentially harmful characters.
 * 
 * @param message - The message to sanitize (can be any type)
 * @returns The sanitized message with newlines and carriage returns replaced with spaces
 */
export const sanitizeLogMessage = (message: unknown): string => {
  if (typeof message === 'string') {
    return message.replace(/[\r\n]/g, ' ').trim();
  }
  
  if (message === null || message === undefined) {
    return String(message);
  }
  
  if (typeof message === 'object') {
    try {
      return JSON.stringify(message).replace(/[\r\n]/g, ' ').trim();
    } catch (e) {
      return String(message).replace(/[\r\n]/g, ' ').trim();
    }
  }
  
  return String(message).replace(/[\r\n]/g, ' ').trim();
};
