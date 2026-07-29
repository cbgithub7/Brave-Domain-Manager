# test_domain_manager_gui_part2.py

"""
Test Suite Part 2: Theme Handling and Configuration

This test suite covers the theme handling functionality of the DomainManagerGUI, including loading and saving preferences.
"""

import unittest
import sys
import os
from unittest.mock import patch
from PyQt5.QtWidgets import QApplication
from PyQt5.QtTest import QTest
from PyQt5.QtCore import Qt

# Adjust the path to import domain_manager_gui and domain_manager_functions
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import domain_manager_gui

class TestDomainManagerGUIThemeHandling(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication(sys.argv)

    def setUp(self):
        self.gui = domain_manager_gui.DomainManagerGUI()

    def tearDown(self):
        self.gui.close()

    def test_toggle_theme_changes_state(self):
        initial_state = self.gui.dark_theme_enabled
        QTest.mouseClick(self.gui.theme_toggle_switch, Qt.LeftButton)
        self.assertNotEqual(initial_state, self.gui.dark_theme_enabled)

    def test_load_theme_preference_from_config(self):
        with patch('configparser.ConfigParser.read', return_value=None):
            with patch('configparser.ConfigParser.getboolean', return_value=True):
                self.gui.load_theme_preference()
                self.assertTrue(self.gui.dark_theme_enabled)

    def test_save_theme_preference_to_config(self):
        with patch('configparser.ConfigParser.write') as mock_write:
            self.gui.save_theme_preference()
            self.assertTrue(mock_write.called)

if __name__ == '__main__':
    unittest.main()
