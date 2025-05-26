"""Log utilities tests."""

import unittest
from src.utils.log_utils import sanitize_log_message


class TestLogUtils(unittest.TestCase):
    """Test log utilities."""

    def test_sanitize_log_message_with_string(self):
        """Test sanitize_log_message with string input."""
        # Test with newlines
        self.assertEqual(sanitize_log_message("hello\nworld"), "hello world")
        self.assertEqual(sanitize_log_message("hello\r\nworld"), "hello world")
        
        # Test with multiple newlines
        self.assertEqual(sanitize_log_message("hello\n\nworld"), "hello  world")
        
        # Test with leading/trailing whitespace
        self.assertEqual(sanitize_log_message("  hello\nworld  "), "hello world")

    def test_sanitize_log_message_with_non_string(self):
        """Test sanitize_log_message with non-string input."""
        # Test with integer
        self.assertEqual(sanitize_log_message(123), "123")
        
        # Test with None
        self.assertEqual(sanitize_log_message(None), "None")
        
        # Test with boolean
        self.assertEqual(sanitize_log_message(True), "True")
        
        # Test with list
        self.assertEqual(sanitize_log_message(["hello\nworld", 123]), "['hello\\nworld', 123]")
        
        # Test with dict
        self.assertEqual(
            sanitize_log_message({"key": "value\nwith\nnewlines"}),
            "{'key': 'value\\nwith\\nnewlines'}"
        )


if __name__ == "__main__":
    unittest.main()
