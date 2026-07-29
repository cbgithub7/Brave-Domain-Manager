# test_domain_manager_gui_part3.py

"""
Test Suite Part 3: Search and Display Functionality

This test suite covers the search functionality and display elements of the DomainManagerGUI, such as displaying Brave status and registry path.
"""

import unittest
import sys
import os
from unittest.mock import patch
from PyQt5.QtWidgets import QApplication
from PyQt5.QtTest import QTest

# Adjust the path to import domain_manager_gui and domain_manager_functions
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import domain_manager_gui
import domain_manager_functions as dm_functions

class TestDomainManagerGUISearchDisplay(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication(sys.argv)

    def setUp(self):
        self.gui = domain_manager_gui.DomainManagerGUI()

    def tearDown(self):
        self.gui.close()

    def test_search_domains_filters_correctly(self):
        self.gui.cached_domains = ['example.com', 'test.com']
        QTest.keyClicks(self.gui.search_entry, 'example')
        self.gui.search_domains()
        self.assertEqual(self.gui.existing_domains_list.count(), 1)
        self.assertEqual(self.gui.existing_domains_list.item(0).text(), 'example.com')

    def test_display_brave_status(self):
        with patch.object(dm_functions, 'check_brave_installation', return_value=True):
            self.gui.display_brave_status()
            self.assertIn('Brave is installed on this system.', self.gui.feedback_text.toPlainText())

    def test_display_registry_path(self):
        with patch.object(dm_functions, 'check_registry_path', return_value='Registry path is correct.'):
            self.gui.display_registry_path()
            self.assertIn('Registry path is correct.', self.gui.feedback_text.toPlainText())

if __name__ == '__main__':
    unittest.main()
