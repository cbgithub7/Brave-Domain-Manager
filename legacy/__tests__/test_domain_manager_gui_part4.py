# test_domain_manager_gui_part4.py

"""
Test Suite Part 4: File Handling and Domain Processing

This test suite covers the file handling and domain processing functionalities of the DomainManagerGUI, such as browsing files and processing domain lists.
"""

import unittest
import sys
import os
from unittest.mock import patch
from PyQt5.QtWidgets import QApplication, QFileDialog, QMessageBox

# Adjust the path to import domain_manager_gui and domain_manager_functions
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import domain_manager_gui
import domain_manager_functions as dm_functions

class TestDomainManagerGUIFileHandling(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication(sys.argv)

    def setUp(self):
        self.gui = domain_manager_gui.DomainManagerGUI()

    def tearDown(self):
        self.gui.close()

    def test_file_browse_button_opens_dialog(self):
        with patch.object(QFileDialog, 'getOpenFileName', return_value=('test.txt', '')):
            self.gui.on_file_browse_button_click()
            self.assertEqual(self.gui.filepath_entry.text(), 'test.txt')

    def test_open_button_processes_file(self):
        self.gui.filepath_entry.setText('test.txt')
        with patch.object(self.gui, 'populate_file_domains_list') as mock_populate:
            self.gui.on_open_button_click()
            self.assertTrue(mock_populate.called)

    def test_populate_file_domains_list_adds_domains(self):
        file_path = 'test.txt'
        file_name = 'test.txt'
        with patch.object(dm_functions, 'process_text_file', return_value=[('1', 'example.com')]) as mock_process:
            self.gui.populate_file_domains_list(file_path, file_name)
            self.assertTrue(mock_process.called)
            self.assertEqual(self.gui.file_domains_list.count(), 1)
            self.assertEqual(self.gui.file_domains_list.item(0).text(), 'example.com')

    def test_process_domains_from_list(self):
        self.gui.file_cached_domains = [('test.txt', ['example.com'])]
        with patch.object(QMessageBox, 'question', return_value=QMessageBox.Yes):
            with patch.object(dm_functions, 'add_domain', return_value='Domain example.com added.') as mock_add:
                self.gui.process_domains_from_list('Add')
                self.assertTrue(mock_add.called)
                self.assertIn('Domain example.com added.', self.gui.feedback_text.toPlainText())

if __name__ == '__main__':
    unittest.main()
