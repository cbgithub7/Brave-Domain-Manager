# custom_title_bar.py

# PyQt5 imports
from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QSizePolicy
from PyQt5.QtCore import Qt, QPropertyAnimation, pyqtProperty, QEasingCurve
from PyQt5.QtGui import QColor, QIcon

# Local imports
from theme_manager import theme_manager

class AnimatedButton(QPushButton):
    def __init__(self, icon_path, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.setIcon(theme_manager.update_icon(icon_path))
        self.setIconSize(theme_manager.ICON_SIZE)
        self.setFixedSize(theme_manager.BUTTON_SIZE)
        self.hover_color = QColor()
        self.click_color = QColor()
        self.default_color = QColor()
        self._current_color = self.default_color
        self.fade_in_animation = QPropertyAnimation(self, b"background_color")
        self.fade_out_animation = QPropertyAnimation(self, b"background_color")
        self.click_animation = QPropertyAnimation(self, b"background_color")
        self.setup_animations()
        self.update_stylesheet()

    def setup_animations(self):
        self.fade_in_animation.setDuration(theme_manager.FADE_IN_DURATION)
        self.fade_in_animation.setEasingCurve(QEasingCurve.InOutQuad)
        self.fade_out_animation.setDuration(theme_manager.FADE_OUT_DURATION)
        self.fade_out_animation.setEasingCurve(QEasingCurve.InOutQuad)
        self.click_animation.setDuration(theme_manager.CLICK_DURATION)
        self.click_animation.setEasingCurve(QEasingCurve.InOutQuad)

    def enterEvent(self, event):
        self.animate_color(self.fade_in_animation, self._current_color, self.hover_color)
        super().enterEvent(event)

    def leaveEvent(self, event):
        self.animate_color(self.fade_out_animation, self._current_color, self.default_color)
        super().leaveEvent(event)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.animate_color(self.click_animation, self._current_color, self.click_color)
        super().mousePressEvent(event)

    def animate_color(self, animation, start_color, end_color):
        animation.stop()
        animation.setStartValue(start_color)
        animation.setEndValue(end_color)
        animation.start()

    @pyqtProperty(QColor)
    def background_color(self):
        return self._current_color

    @background_color.setter
    def background_color(self, color):
        self._current_color = color
        self.update_stylesheet()

    def update_stylesheet(self):
        self.setStyleSheet(f"background-color: {self._current_color.name()};")

    def update_button_colors(self, colors):
        self.default_color = QColor(colors["default_color"])
        self.hover_color = QColor(colors["hover_color"])
        self.click_color = QColor(colors["click_color_default"])
        self._current_color = self.default_color 
        self.update_stylesheet()

class CustomTitleBar(QWidget):
    def __init__(self, parent=None, app_icon_path=None, title="Application"):
        super().__init__(parent)
        self.setFixedHeight(theme_manager.TITLE_BAR_HEIGHT)
        self.init_ui(app_icon_path, title)
        theme_manager.apply_theme(self, "title_bar", title_bar=self)

    def init_ui(self, app_icon_path, title):
        self.layout = QHBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.setSpacing(0)
        icon_layout = QVBoxLayout()
        icon_layout.setContentsMargins(0, 0, 0, 0)

        self.icon_label = QLabel()
        if app_icon_path:
            self.icon_label.setPixmap(QIcon(app_icon_path).pixmap(theme_manager.APP_ICON_SIZE))
        self.icon_label.setAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
        self.icon_label.setFixedWidth(theme_manager.APP_ICON_PADDING)
        self.icon_label.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Expanding)
        icon_layout.addWidget(self.icon_label)

        self.title_label = QLabel(title)
        self.title_label.setAlignment(Qt.AlignLeft | Qt.AlignVCenter)
        self.title_label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)

        self.layout.addLayout(icon_layout)
        self.layout.addWidget(self.title_label)

        self.btn_minimize = AnimatedButton(theme_manager.ICON_MINIMIZE)
        self.btn_maximize = AnimatedButton(theme_manager.ICON_MAXIMIZE)
        self.btn_restore = AnimatedButton(theme_manager.ICON_RESTORE)
        self.btn_close = AnimatedButton(theme_manager.ICON_CLOSE)

        self.layout.addWidget(self.btn_minimize)
        self.layout.addWidget(self.btn_maximize)
        self.layout.addWidget(self.btn_restore)
        self.layout.addWidget(self.btn_close)

        self.btn_minimize.setObjectName("minimize")
        self.btn_maximize.setObjectName("maximize")
        self.btn_restore.setObjectName("restore")
        self.btn_close.setObjectName("close")

        self.btn_minimize.clicked.connect(self.minimize_window)
        self.btn_maximize.clicked.connect(self.maximize_window)
        self.btn_restore.clicked.connect(self.restore_window)
        self.btn_close.clicked.connect(self.close_window)

        self.start_pos = None
        self.is_maximized = False
        self.btn_restore.hide()

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.update_geometry()

    def update_geometry(self):
        parent_widget = self.parentWidget()
        if parent_widget:
            self.setGeometry(0, 0, parent_widget.width(), theme_manager.TITLE_BAR_HEIGHT)

    def eventFilter(self, obj, event):
        if event.type() == event.MouseButtonDblClick:
            self.maximize_restore_window()
            return True
        return super().eventFilter(obj, event)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.start_pos = event.pos()

    def mouseMoveEvent(self, event):
        if self.start_pos and not self.is_maximized:
            self.window().move(self.window().pos() + event.pos() - self.start_pos)

    def minimize_window(self):
        self.window().showMinimized()

    def maximize_window(self):
        self.window().showFullScreen()
        self.btn_maximize.hide()
        self.btn_restore.show()
        self.is_maximized = True

    def restore_window(self):
        self.window().showNormal()
        self.btn_maximize.show()
        self.btn_restore.hide()
        self.is_maximized = False

    def close_window(self):
        self.window().close()
