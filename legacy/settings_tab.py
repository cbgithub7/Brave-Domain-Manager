# settings_tab.py

# Standard library imports
import configparser
import logging

# PyQt5 imports
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QCheckBox, QPushButton, QLabel, QGroupBox,
    QSizePolicy, QFrame, QComboBox
)
from PyQt5.QtCore import Qt, QPropertyAnimation, QPoint, QEasingCurve, pyqtSignal
from PyQt5.QtGui import QIcon

# Local imports
from theme_manager import theme_manager

# Constants
ICON_SIZE = 25
FONT_SIZE = 12
INFO_ICON_PATH = "icons/info-circle.svg"
MESSAGE = "Press the apply changes button to save your changes."

class SettingsTab(QWidget):
    font_scale_changed = pyqtSignal(int)

    def __init__(self, config_file, parent=None):
        super().__init__(parent)
        self.config_file = config_file
        self.feedback_label = None  # Label for feedback message
        self.animated_once = False # Track if feedback has been animated
        self.setup_ui()
        self.load_preferences()

    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        # Feedback notification
        self.feedback_container = QFrame()
        self.feedback_container.setStyleSheet("background-color: #1A73E8;")
        self.feedback_container.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Maximum)
        self.feedback_container.setVisible(False)  # Initially hidden
        feedback_layout = QHBoxLayout(self.feedback_container)
        feedback_layout.setContentsMargins(0, 5, 0, 5)  # Remove margins within the feedback layout

        self.info_icon = QLabel()
        self.info_icon.setPixmap(QIcon(INFO_ICON_PATH).pixmap(ICON_SIZE, ICON_SIZE))
        self.info_icon.setContentsMargins(10, 0, 0, 0)
        self.info_icon.setVisible(False)

        self.feedback_label = QLabel()
        self.feedback_label.setStyleSheet(f"color: white; padding: 0px; font-size: {FONT_SIZE}px;")
        self.feedback_label.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Maximum) 
        self.feedback_label.setVisible(False)

        feedback_layout.addWidget(self.info_icon)
        feedback_layout.addWidget(self.feedback_label)
        feedback_layout.addStretch()  # Add stretch to push the elements to the left
        layout.addWidget(self.feedback_container)

        group_box_container_layout = QVBoxLayout()
        group_box_container_layout.setContentsMargins(8, 0, 8, 0)

        # GroupBox for Logging Section
        logging_group_box = QGroupBox("Logging")
        logging_layout = QVBoxLayout(logging_group_box)

        self.logging_enabled_checkbox = QCheckBox("Enable Logging")
        self.logging_enabled_checkbox.setChecked(False)
        self.logging_enabled_checkbox.stateChanged.connect(self.on_user_interaction)
        logging_layout.addWidget(self.logging_enabled_checkbox)

        self.log_options = {
            "Startup/Shutdown Logs": QCheckBox("Startup/Shutdown Logs"),
            "Registry Access Logs": QCheckBox("Registry Access Logs"),
            "Success/Error Logs": QCheckBox("Success/Error Logs"),
            "User Activity Logs": QCheckBox("User Activity Logs"),
            "Configuration Changes": QCheckBox("Configuration Changes"),
            "Audit Logs": QCheckBox("Audit Logs"),
            "Performance Logs": QCheckBox("Performance Logs"),
            "Security Logs": QCheckBox("Security Logs")
        }

        for key, checkbox in self.log_options.items():
            checkbox.setChecked(False)
            checkbox.stateChanged.connect(self.on_user_interaction)
            logging_layout.addWidget(checkbox)

        group_box_container_layout.addWidget(logging_group_box)

        # GroupBox for Theme selection
        theme_group_box = QGroupBox("Select Default Theme")
        theme_group_box.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Fixed)
        theme_layout = QVBoxLayout(theme_group_box)

        self.light_theme_checkbox = QCheckBox("Light Theme")
        self.dark_theme_checkbox = QCheckBox("Dark Theme")
        
        self.light_theme_checkbox.stateChanged.connect(lambda state: self.on_theme_checkbox_changed(state, "Light"))
        self.dark_theme_checkbox.stateChanged.connect(lambda state: self.on_theme_checkbox_changed(state, "Dark"))

        self.light_theme_checkbox.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Fixed)
        self.dark_theme_checkbox.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Fixed)

        theme_layout.addWidget(self.light_theme_checkbox)
        theme_layout.addWidget(self.dark_theme_checkbox)

        group_box_container_layout.addWidget(theme_group_box)

        # GroupBox for Font Scaling
        font_group_box = QGroupBox("Scale Interface")
        font_layout = QVBoxLayout(font_group_box)

        self.font_combo_box = QComboBox()
        self.font_combo_box.addItems(["70%", "80%", "90%", "100%", "110%", "120%", "130%", "140%"])  # Add scaling options
        self.font_combo_box.setCurrentText("100%")
        self.font_combo_box.currentTextChanged.connect(self.handle_font_scale_change)
        font_layout.addWidget(self.font_combo_box)
        group_box_container_layout.addWidget(font_group_box)

        # Apply Changes button
        self.apply_changes_button = QPushButton("Apply Changes")
        self.apply_changes_button.clicked.connect(self.apply_changes)
        self.apply_changes_button.setSizePolicy(QSizePolicy.Maximum, QSizePolicy.Maximum)
        group_box_container_layout.addWidget(self.apply_changes_button, alignment=Qt.AlignCenter)

        layout.addLayout(group_box_container_layout)

    def handle_font_scale_change(self, value):
        scale_value = int(value.strip('%'))
        self.font_scale_changed.emit(scale_value)
        self.on_user_interaction()

    def on_theme_checkbox_changed(self, state, theme):
        if state == Qt.Checked:
            if theme == "Light":
                self.dark_theme_checkbox.setChecked(False)
            else:
                self.light_theme_checkbox.setChecked(False)
            self.on_user_interaction()

    def on_user_interaction(self):
        if not self.animated_once:
            self.animate_feedback()
            self.show_feedback()

    def show_feedback(self):
        self.feedback_label.setText(MESSAGE)
        self.feedback_container.setVisible(True)
        self.feedback_label.setVisible(True)
        self.info_icon.setVisible(True)

    def animate_feedback(self):
        if not self.animated_once:
            self.animated_once = True
            start_pos = self.feedback_container.pos()
            end_pos = QPoint(start_pos.x(), 0)

            self.feedback_container.move(start_pos.x(), -self.feedback_container.height())
            self.feedback_container.show()

            self.animation = QPropertyAnimation(self.feedback_container, b"pos")
            self.animation.setDuration(500)  # Animation duration in milliseconds
            self.animation.setStartValue(QPoint(start_pos.x(), -self.feedback_container.height()))
            self.animation.setEndValue(end_pos)

            # Apply easing curve for smooth animation
            self.animation.setEasingCurve(QEasingCurve.OutCubic)  # Example easing curve

            self.animation.start()

    def apply_changes(self):
        selected_theme = self.dark_theme_checkbox.isChecked()
        font_scale = self.font_slider.value()
        config = configparser.ConfigParser()
        config.read(self.config_file)
        
        if not config.has_section('Theme'):
            config.add_section('Theme')
        if not config.has_section('Font'):
            config.add_section('Font')
        
        config.set('Theme', 'theme', str(selected_theme))
        config.set('Font', 'scale', self.font_combo_box.currentText())

        if not config.has_section('Logging'):
            config.add_section('Logging')

        config.set('Logging', 'logging', str(self.logging_enabled_checkbox.isChecked()))

        for key, checkbox in self.log_options.items():
            config.set('Logging', key, str(checkbox.isChecked()))

        with open(self.config_file, 'w') as configfile:
            config.write(configfile)
        
        logging.info(f"Settings have been saved.")
        self.load_preferences()
        self.font_scale_changed.emit(int(self.font_combo_box.currentText().strip('%')))

    def load_preferences(self):
        config = configparser.ConfigParser()
        config.read(self.config_file)

        # Load theme preference from config
        theme = config.getboolean('Theme', 'theme', fallback=False)
        if theme:
            self.dark_theme_checkbox.setChecked(True)
        else:
            self.light_theme_checkbox.setChecked(True)

        # Load logging preferences from config
        logging_enabled = config.getboolean('Logging', 'logging', fallback=False)
        self.logging_enabled_checkbox.setChecked(logging_enabled)
        for key, checkbox in self.log_options.items():
            enabled = config.getboolean('Logging', key, fallback=False)
            checkbox.setChecked(enabled)
            checkbox.setEnabled(logging_enabled)

        # Load font scale preference from config
        font_scale = config.get('Font', 'scale', fallback="100%")
        self.font_combo_box.setCurrentText(font_scale)

        self.feedback_container.setVisible(False)  # Ensure feedback is hidden initially
        self.animated_once = False  # Reset the animation flag

    def toggle_logging(self, state):
        enable = state == Qt.Checked
        for checkbox in self.log_options.values():
            checkbox.setEnabled(enable)

        if enable:
            logging.disable(logging.NOTSET)
            logging.info('Logging enabled')
        else:
            logging.disable(logging.CRITICAL)
            logging.info('Logging disabled')

    def change_log_type(self, state, key):
        log_types = {
            "Startup/Shutdown Logs": logging.INFO,
            "Registry Access Logs": logging.INFO,
            "Success/Error Logs": logging.INFO,
            "User Activity Logs": logging.INFO,
            "Configuration Changes": logging.INFO,
            "Audit Logs": logging.WARNING,
            "Performance Logs": logging.INFO,
            "Security Logs": logging.WARNING
        }

        if state == Qt.Checked:
            logging.getLogger(key).setLevel(log_types[key])
            logging.info(f'{key} logging enabled')
        else:
            logging.getLogger(key).setLevel(logging.CRITICAL + 1)
            logging.info(f'{key} logging disabled')
        self.on_user_interaction()