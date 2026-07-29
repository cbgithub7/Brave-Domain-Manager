# custom_prompt.py

# PyQt5 imports
from PyQt5.QtWidgets import QDialog, QVBoxLayout, QLabel, QPushButton, QHBoxLayout, QCheckBox, QFrame
from PyQt5.QtGui import QIcon
from PyQt5.QtCore import Qt

# Local imports
from custom_title_bar import CustomTitleBar
from theme_manager import theme_manager

# Constants
APP_ICON_PATH = "icons/Brave_domain_blocker.ico"
PROMPT_ICON_PATH = "icons/question-circle.svg"

# The TransparentOverlay class is for making a border for frameless prompt windows to help give them visual contrast.
class TransparentOverlay(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WA_TransparentForMouseEvents)
        self.setWindowFlags(Qt.FramelessWindowHint)

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.setGeometry(self.parent().rect())

class CustomPrompt(QDialog):
    def __init__(self, title, message, notice, parent=None):
        super().__init__(parent)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.Dialog)

        self.user_closed = False
        self.init_ui(title, message, notice, PROMPT_ICON_PATH)

        # Create the transparent overlay
        self.overlay = TransparentOverlay(self)
        self.overlay.setGeometry(self.rect())
        theme_manager.apply_theme(self.overlay, "overlay")
        self.overlay.show()

    def init_ui(self, title, message, notice, icon_path=PROMPT_ICON_PATH):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Add custom title bar
        self.title_bar = CustomTitleBar(self, app_icon_path=APP_ICON_PATH, title=title)
        layout.addWidget(self.title_bar)

        # Main content layout
        content_layout = QVBoxLayout()
        content_layout.setContentsMargins(10, 10, 10, 10)
        content_layout.setSpacing(10)

        # Warning message with icon
        prompt_layout = QHBoxLayout()
        prompt_icon = QLabel()
        prompt_icon.setPixmap(QIcon(icon_path).pixmap(45, 45))
        prompt_layout.addWidget(prompt_icon)

        # Inner layout for message and notice
        message_prompt_layout = QVBoxLayout()
        prompt_message = QLabel(message)
        prompt_notice = QLabel(notice)
        self.checkbox = QCheckBox("Don't show me this again")
        prompt_notice.setStyleSheet("color: #8AB4F7; font-weight: bold;")
        message_prompt_layout.addWidget(prompt_message)
        message_prompt_layout.addWidget(prompt_notice)
        message_prompt_layout.addWidget(self.checkbox)
        prompt_layout.addLayout(message_prompt_layout)

        # Buttons
        button_layout = QHBoxLayout()
        self.yes_button = QPushButton("Yes")
        self.no_button = QPushButton("No")
        button_layout.addWidget(self.yes_button)
        button_layout.addWidget(self.no_button)

        content_layout.addLayout(prompt_layout)
        content_layout.addLayout(button_layout)

        layout.addLayout(content_layout)

        self.setLayout(layout)

        self.yes_button.clicked.connect(self.accept)
        self.no_button.clicked.connect(self.reject)

    def get_checkbox_state(self):
        return self.checkbox.isChecked()

    def closeEvent(self, event):
        self.user_closed = True
        super().closeEvent(event)

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.overlay.setGeometry(self.rect())