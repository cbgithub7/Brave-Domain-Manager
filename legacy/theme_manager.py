# theme_manager.py

# PyQt5 imports
from PyQt5.QtGui import QColor, QIcon, QPixmap, QPainter, QFont
from PyQt5.QtCore import QSize, Qt
from PyQt5.QtSvg import QSvgRenderer

# Third-party imports
import qdarktheme

class ThemeManager:
    # Title Bar
    TITLE_BAR_HEIGHT = 34
    APP_ICON_SIZE = QSize(24, 24)
    APP_ICON_PADDING = 45
    FONT_SIZE = 12
    FONT_FAMILY = "Segoe UI"
    
    # Title Bar Buttons
    ICON_MINIMIZE = 'icons/dash-lg.svg'
    ICON_MAXIMIZE = 'icons/fullscreen.svg'
    ICON_RESTORE = 'icons/fullscreen-exit.svg'
    ICON_CLOSE = 'icons/x-lg.svg'
    ICON_SIZE = QSize(14, 14)
    BUTTON_SIZE = QSize(46, 34)
    FADE_IN_DURATION = 100
    FADE_OUT_DURATION = 200
    CLICK_DURATION = 100

    def __init__(self):
        self.theme = False  # Default theme is light
        self.stylesheets = {}

    def apply_theme(self, widget=None, stylesheet_key="main", theme=None, title_bar=None):
        if theme is not None:
            self.theme = theme
        qdarktheme.setup_theme("dark" if self.theme else "light")
        self.generate_stylesheets()

        if widget is not None:
            widget.setStyleSheet(self.stylesheets[stylesheet_key])

        if title_bar is not None:
            title_bar.setStyleSheet(self.stylesheets["title_bar"])
            self.update_title_bar_buttons(title_bar)

    def generate_stylesheets(self):
        self.stylesheets = {
            "main": self.get_main_stylesheet(),
            "prompt": self.get_prompt_stylesheet(),
            "title_bar": self.get_title_bar_stylesheet(),
            "overlay": self.get_overlay_stylesheet()
        }

    def get_main_stylesheet(self):
        placeholder_color = "#CCCCCC" if self.theme else "#666666"
        text_color = "white" if self.theme else "black"
        return f"""
            QLineEdit {{
                color: {text_color};
            }}
            QLineEdit::placeholder {{
                color: {placeholder_color};
            }}
            QLineEdit:focus {{
                color: {text_color};
            }}
            QWidget {{
                border-radius: 0px;
            }}
            QPushButton {{
                border-radius: 0px;
            }}
        """

    def get_prompt_stylesheet(self):
        background_color = "#E9E9E9" if not self.theme else "#333333"
        border_color = "#CCCCCC" if not self.theme else "#666666"
        text_color = "black" if not self.theme else "white"
        return f"""
            QDialog {{
                background-color: {background_color};
                border: 1px solid {border_color};
                border-radius: 0px;
            }}
            QLabel {{
                color: {text_color};
                border-radius: 0px;
            }}
            QCheckBox {{
                color: {text_color};
            }}
        """
    
    def get_overlay_stylesheet(self):
        border_color = "#DADCE0" if not self.theme else "#3F4042"
        return f"""
            QFrame {{
                background-color: rgba(0, 0, 0, 0);
                border: 1px solid {border_color};
                border-radius: 0px;
            }}
        """

    def get_title_bar_stylesheet(self):
        colors = self.get_title_bar_colors()
        return f"""
            QWidget {{
                background-color: {colors['default_color']};
                height: {self.TITLE_BAR_HEIGHT}px;
            }}
            QPushButton {{
                background-color: {colors['default_color']};
                border: none;
                border-radius: 0px;
                width: {self.BUTTON_SIZE.width()}px;
                height: {self.BUTTON_SIZE.height()}px;
                icon-size: {self.ICON_SIZE.width()}px;
            }}
            QPushButton:hover {{
                background-color: {colors['hover_color']};
            }}
            QPushButton:pressed {{
                background-color: {colors['click_color_default']};
            }}
            QPushButton#close:hover {{
                background-color: {colors['hover_color_close']};
            }}
            QPushButton#close:pressed {{
                background-color: {colors['click_color_close']};
            }}
            QLabel {{
                font: {self.FONT_FAMILY};
                color: {colors['text_color']};
                font-size: {self.FONT_SIZE}px;
            }}
        """

    def get_title_bar_colors(self):
        if self.theme:
            return { # Colors for dark theme
                "text_color": "#FFFFFF",
                "default_color": "#202124",
                "hover_color": "#555555",
                "click_color_default": "#686868",
                "hover_color_close": "#E81123",
                "click_color_close": "#94141E",
            }
        else:
            return { # Colors for light theme
                "text_color": "#000000",
                "default_color": "#F8F9FA",
                "hover_color": "#BBBBBB",
                "click_color_default": "#999999",
                "hover_color_close": "#E81123",
                "click_color_close": "#94141E",
            }

    def get_icon_fill_color(self):
        return "#FFFFFF" if self.theme else "#000000"

    def update_icon(self, icon_path):
        fill_color = self.get_icon_fill_color()
        renderer = QSvgRenderer(icon_path)
        image = QPixmap(self.ICON_SIZE)
        image.fill(Qt.transparent)
        painter = QPainter(image)
        renderer.render(painter)
        painter.setCompositionMode(QPainter.CompositionMode_SourceIn)
        painter.fillRect(image.rect(), QColor(fill_color))
        painter.end()
        return QIcon(image)

    def update_title_bar_buttons(self, title_bar):
        title_bar.btn_minimize.setIcon(self.update_icon(self.ICON_MINIMIZE))
        title_bar.btn_maximize.setIcon(self.update_icon(self.ICON_MAXIMIZE))
        title_bar.btn_restore.setIcon(self.update_icon(self.ICON_RESTORE))
        title_bar.btn_close.setIcon(self.update_icon(self.ICON_CLOSE))

        colors = self.get_title_bar_colors()
        title_bar.btn_minimize.update_button_colors(colors)
        title_bar.btn_maximize.update_button_colors(colors)
        title_bar.btn_restore.update_button_colors(colors)
        title_bar.btn_close.update_button_colors({
            "default_color": colors["default_color"],
            "hover_color": colors["hover_color_close"],
            "click_color_default": colors["click_color_close"]
        })

theme_manager = ThemeManager()
