# test_domain_manager_gui_part1.py

"""
Test Suite Part 1: Initialization and Basic Functionality

This test suite covers the initialization of the DomainManagerGUI and basic functionalities such as adding and removing domains.
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
import domain_manager_functions as dm_functions

class TestDomainManagerGUIInitialization(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication(sys.argv)

    def setUp(self):
        self.gui = domain_manager_gui.DomainManagerGUI()

    def tearDown(self):
        self.gui.close()

    def test_initialization_sets_window_title(self):
        self.assertEqual(self.gui.windowTitle(), "Brave Domain Manager")

    def test_initialization_sets_central_widget(self):
        self.assertIsInstance(self.gui.central_widget, domain_manager_gui.QWidget)

    def test_add_domain_functionality(self):
        with patch.object(dm_functions, 'clean_domain', return_value='example.com') as mock_clean:
            with patch.object(dm_functions, 'add_domain', return_value='Domain example.com added.') as mock_add:
                QTest.keyClicks(self.gui.add_entry, 'example.com')
                QTest.keyClick(self.gui.add_entry, Qt.Key_Return)
                self.assertTrue(mock_clean.called)
                self.assertTrue(mock_add.called)
                self.assertIn('Domain example.com added.', self.gui.feedback_text.toPlainText())

    def test_remove_domain_functionality(self):
        with patch.object(dm_functions, 'clean_domain', return_value='example.com'):
            with patch.object(dm_functions, 'add_domain', return_value='Domain example.com added.'):
                QTest.keyClicks(self.gui.add_entry, 'example.com')
                QTest.keyClick(self.gui.add_entry, Qt.Key_Return)

        with patch.object(dm_functions, 'remove_domain', return_value='Domain example.com removed.') as mock_remove:
            item = self.gui.existing_domains_list.findItems('example.com', Qt.MatchExactly)[0]
            item.setSelected(True)
            QTest.keyClick(self.gui, Qt.Key_Delete)
            self.assertTrue(mock_remove.called)
            self.assertIn('Domain example.com removed.', self.gui.feedback_text.toPlainText())

if __name__ == '__main__':
    unittest.main()
