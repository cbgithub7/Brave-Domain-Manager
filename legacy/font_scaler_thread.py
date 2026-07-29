# font_scaler_thread.py

from PyQt5.QtCore import QThread, pyqtSignal
from PyQt5.QtWidgets import QWidget

class FontScalerThread(QThread):
    update_font_signal = pyqtSignal(QWidget, float)

    def __init__(self, main_widget, scale_factor, original_font_sizes):
        super().__init__()
        self.main_widget = main_widget
        self.scale_factor = scale_factor
        self.original_font_sizes = original_font_sizes

    def run(self):
        self.scale_fonts(self.main_widget, self.scale_factor)

    def scale_fonts(self, widget, scale_factor):
        original_font_size = self.original_font_sizes.get(widget, widget.font().pointSizeF())
        new_point_size = max(original_font_size * scale_factor, 1)
        self.update_font_signal.emit(widget, new_point_size)
        for child in widget.findChildren(QWidget):
            self.scale_fonts(child, scale_factor)
