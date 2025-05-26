"""Utility functions for log sanitization."""

def sanitize_log_message(message):
    """
    Sanitizes a message for logging by removing newlines and other potentially harmful characters.
    
    Args:
        message: The message to sanitize (will be converted to string if not already)
        
    Returns:
        str: The sanitized message with newlines and carriage returns replaced with spaces
    """
    if not isinstance(message, str):
        message = str(message)
    return message.replace('\n', ' ').replace('\r', ' ').strip()
