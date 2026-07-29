# domain_manager_gui.py

# Standard library imports
import sys
import os
import configparser
import logging

# PyQt5 imports
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit, QListWidget, QFileDialog,
    QSizePolicy, QDesktopWidget, QAbstractItemView, QTabWidget,
    QMessageBox, QDialog
)
from PyQt5.QtCore import (
    Qt, QSize, QEventLoop, QEvent, QUrl, QTimer, QProcess, pyqtSlot
)
from PyQt5.QtWebEngineWidgets import QWebEngineView

# Third-party imports
from qtwidgets import AnimatedToggle
from fuzzywuzzy import fuzz

# Local imports
from theme_manager import theme_manager
from custom_title_bar import CustomTitleBar
from custom_prompt import CustomPrompt
import domain_manager_functions as dm_functions
from settings_tab import SettingsTab
from font_scaler_thread import FontScalerThread

# Constants
APP_NAME = "Brave Domain Manager"
APP_ICON_PATH = "icons/Brave_domain_blocker.ico"
DOC_URL = "https://cbgithub7.github.io/Brave-Domain-Manager/"
CONFIG_FILE = 'config.ini'
FILE_FORMATS = [
    ("Text Files", "*.txt"),
    ("CSV Files", "*.csv"),
    ("JSON Files", "*.json"),
    ("All Files", "*.*")
]
SEARCH_THRESHOLD = 70
MAX_BUTTON_WIDTH = 126

# Initialize logging
logging.basicConfig(filename='domain_manager_gui.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logging.info('Session started')

class DomainManagerGUI(QMainWindow):
    #max_button_width = 0

    def __init__(self):
        super().__init__()

        self.cached_domains = []
        self.file_cached_domains = []
        self.current_list = 'existing'
        self.show_prompt = {
            'Logging': True,
            'Theme': True
        }
        self.settings_tab = None
        self.original_font_sizes = {}
        self.is_initializing = True

        self.add_entry = QLineEdit()
        self.filepath_entry = QLineEdit()

        #self.button_texts = [
            #"Submit", "Browse", "Open", "Add to Registry", 
            #"Remove from Registry", "Clear List", "Delete Selected", "Refresh List"
        #]
        #self.max_button_width = self.calculate_max_button_width(self.button_texts)

        self.initialize_ui()

    def closeEvent(self, event):
        logging.info('Session ended')
        super().closeEvent(event)

    def initialize_ui(self):
        self.setup_window()
        self.setup_layout()
        self.load_preferences()
        self.settings_tab.font_scale_changed.connect(self.start_font_scaling_thread)
        self.apply_font_scaling()
        theme_manager.apply_theme(self, "main", title_bar=self.title_bar)
        self.store_original_font_sizes()
        self.display_brave_status()
        self.display_registry_path()
        self.refresh_existing_domains()
        QTimer.singleShot(0, self.check_logging_prompt) 
        self.is_initializing = False

    def check_logging_prompt(self):
        if self.show_prompt['Logging']:
            self.prompt_for_logging()

    def setup_window(self):
        self.setWindowFlags(Qt.FramelessWindowHint)

        screen = QDesktopWidget().screenGeometry()
        window_width, window_height = int(screen.width() * 0.62), int(screen.height() * 0.60)
        self.resize(QSize(window_width, window_height))

        # Set minimum and maximum size constraints based on screen resolution percentages
        min_width = int(screen.width() * 0.4)  # 40% of screen width
        min_height = int(screen.height() * 0.4)  # 40% of screen height
        max_width = screen.width()  # 100% of screen width
        max_height = screen.height()  # 100% of screen height

        self.setMinimumSize(min_width, min_height)
        self.setMaximumSize(max_width, max_height)

    def setup_layout(self):
        self.title_bar = CustomTitleBar(self, app_icon_path=APP_ICON_PATH, title=APP_NAME)

        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QVBoxLayout(self.central_widget)

        self.main_layout.addWidget(self.title_bar)
        self.resizeEvent = self.update_title_bar_geometry

        self.tab_widget = QTabWidget()
        self.main_layout.addWidget(self.tab_widget)

        self.setup_tabs()
        self.add_lower_frame()

    def update_title_bar_geometry(self, event):
        self.title_bar.update_geometry()
        super().resizeEvent(event)

    def setup_tabs(self):
        self.setup_main_tab()
        self.setup_settings_tab()
        self.setup_doc_tab()

    def setup_main_tab(self):
        self.domain_tab = QWidget()
        layout = QVBoxLayout(self.domain_tab)

        self.upper_frame = QWidget()
        self.upper_layout = QHBoxLayout(self.upper_frame)

        self.left_frame = self.create_left_frame()
        self.right_frame = self.create_right_frame()

        self.left_frame.setMaximumWidth(int(self.width() * 0.25))
        self.right_frame.setMaximumWidth(int(self.width() * 0.75))

        self.upper_layout.addWidget(self.left_frame)
        self.upper_layout.addWidget(self.right_frame)
        layout.addWidget(self.upper_frame)

        self.feedback_text = QTextEdit()
        self.feedback_text.setReadOnly(True)
        layout.addWidget(self.feedback_text)

        self.tab_widget.addTab(self.domain_tab, "Domain Management")

    def create_left_frame(self):
        left_frame = QWidget()
        left_layout = QVBoxLayout(left_frame)
        left_layout.setAlignment(Qt.AlignTop)
        left_frame.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)

        self.add_widgets_to_left_frame(left_layout)
        return left_frame

    def add_widgets_to_left_frame(self, layout):
        self.add_label_and_entry(layout, "Add Domain:", self.on_submit_button_click)
        self.add_label_and_entry(layout, "Add from File:", self.on_open_button_click, browse=True)

        self.file_format_text = QLabel(
            "Supported File Formats:\nText File (.txt): One domain per line.\nCSV File (.csv): One domain per row.\nJSON File (.json): Array of domain strings."
        )
        layout.addWidget(self.file_format_text)

    def add_label_and_entry(self, layout, label_text, submit_callback, browse=False):
        layout.addWidget(QLabel(label_text))
        entry = QLineEdit()
        entry.setPlaceholderText("Enter a domain manually" if not browse else "Enter file path or browse to select")
        entry.returnPressed.connect(submit_callback)
        layout.addWidget(entry)

        if not browse:
            self.add_entry = entry  # Keep reference to the add_entry field
            button_layout = QHBoxLayout()
            button_layout.addWidget(self.create_button("Submit", submit_callback), alignment=Qt.AlignCenter)
            layout.addLayout(button_layout)
        else:
            self.filepath_entry = entry  # Keep reference to the filepath_entry field
            button_layout = QHBoxLayout()
            button_layout.addWidget(self.create_button("Browse", self.on_file_browse_button_click), alignment=Qt.AlignCenter)
            button_layout.addWidget(self.create_button("Open", submit_callback), alignment=Qt.AlignCenter)
            layout.addLayout(button_layout)

    def create_right_frame(self):
        right_frame = QWidget()
        right_layout = QVBoxLayout(right_frame)
        right_layout.setAlignment(Qt.AlignTop)
        right_frame.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)

        self.search_label = QLabel("Search Domains: (Click either list to search)   Use Enter shortcut to perform a search.")
        right_layout.addWidget(self.search_label)

        self.search_entry = QLineEdit()
        self.search_entry.textChanged.connect(self.search_domains)
        self.search_entry.returnPressed.connect(self.search_domains)
        right_layout.addWidget(self.search_entry)

        self.add_domain_lists(right_layout)
        return right_frame

    def add_domain_lists(self, layout):
        lists_layout = QHBoxLayout()  # Create a horizontal layout for the lists

        file_domains_layout = QVBoxLayout()
        self.file_domains_list = self.create_domain_list("Domains from File:", 'file')
        file_domains_layout.addWidget(self.file_domains_list)
        
        file_buttons_layout = QHBoxLayout()
        file_buttons_layout.addWidget(self.create_button("Add Domain(s)", lambda: self.process_domains_from_list("Add")))
        file_buttons_layout.addWidget(self.create_button("Remove Domain(s)", lambda: self.process_domains_from_list("Remove")))
        file_buttons_layout.addWidget(self.create_button("Clear List", self.on_clear_button_click))
        file_domains_layout.addLayout(file_buttons_layout)
        
        lists_layout.addLayout(file_domains_layout)

        existing_domains_layout = QVBoxLayout()
        self.existing_domains_list = self.create_domain_list("Blocked Domains:", 'existing')
        existing_domains_layout.addWidget(self.existing_domains_list)
        
        existing_buttons_layout = QHBoxLayout()
        existing_buttons_layout.addWidget(self.create_button("Delete Selected", self.on_delete_selected_button_click))
        existing_buttons_layout.addWidget(self.create_button("Refresh List", self.on_refresh_button_click))
        existing_domains_layout.addLayout(existing_buttons_layout)
        
        lists_layout.addLayout(existing_domains_layout)

        layout.addLayout(lists_layout)

    def create_domain_list(self, label_text, list_type):
        layout = QVBoxLayout()
        layout.addWidget(QLabel(label_text))
        domain_list = QListWidget()
        domain_list.setSelectionMode(QAbstractItemView.ExtendedSelection)
        domain_list.itemSelectionChanged.connect(lambda: self.set_current_list(list_type))
        domain_list.installEventFilter(self)
        layout.addWidget(domain_list)
        return domain_list
    
    def reset_list(self, list_type):
        if list_type == 'existing':
            domain_list_widget = self.existing_domains_list
            cached_domains = self.cached_domains
        elif list_type == 'file':
            domain_list_widget = self.file_domains_list
            cached_domains = [domain for _, domain_list in self.file_cached_domains for domain in domain_list]
        else:
            return

        domain_list_widget.clear()
        domain_list_widget.addItems(cached_domains)

    def setup_settings_tab(self):
        self.settings_tab = SettingsTab(CONFIG_FILE, self)
        self.tab_widget.addTab(self.settings_tab, "Settings")
        self.tab_widget.currentChanged.connect(self.on_tab_changed)

    def on_tab_changed(self, index):
        current_widget = self.tab_widget.widget(index)
        if isinstance(current_widget, SettingsTab):
            current_widget.load_preferences()  # Reload preferences when switching to the settings tab
            self.apply_font_scaling()

    def setup_doc_tab(self):
        self.doc_tab = QWidget()
        layout = QVBoxLayout(self.doc_tab)
        self.webview = QWebEngineView()
        self.webview.load(QUrl(DOC_URL))
        layout.addWidget(self.webview)
        self.tab_widget.addTab(self.doc_tab, "Documentation")

    def add_lower_frame(self):
        lower_frame = QWidget()
        lower_layout = QHBoxLayout(lower_frame)
        lower_layout.setContentsMargins(0, 0, 0, 0)
        lower_frame.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)

        self.current_domain_label = QLabel("Brave Domain Manager is ready. Add or remove domains to block.")
        lower_layout.addWidget(self.current_domain_label)

        self.theme_toggle_switch = AnimatedToggle(
            checked_color="#FFB000", 
            pulse_checked_color="#00000000", 
            pulse_unchecked_color="#00000000"
        )
        self.theme_toggle_switch.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Fixed)
        self.theme_toggle_switch.setFixedSize(int(45 * self.logicalDpiX() / 96), int(32 * self.logicalDpiY() / 96))
        self.theme_toggle_switch.toggled.connect(self.on_theme_toggle)

        spacer = QWidget()
        spacer.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        lower_layout.addWidget(spacer)
        lower_layout.addWidget(self.theme_toggle_switch)

        self.main_layout.addWidget(lower_frame)

    def prompt_for_logging(self):
        config = configparser.ConfigParser()
        config.read(CONFIG_FILE)
        logging_enabled = config.getboolean('Logging', 'logging', fallback=False)
        
        if logging_enabled:
            prompt = CustomPrompt(
                title='Logging Enabled',
                message='Logging is currently enabled. Would you like to disable it?',
                notice='Disabling logging will restart the application.',
            )
        else:
            prompt = CustomPrompt(
                title='Enable Logging',
                message='Would you like to enable logging?',
                notice='Enabling logging will restart the application.',
            )
        theme_manager.apply_theme(prompt, "prompt")
        result = prompt.exec_()
        self.handle_prompt_result('Logging', result, prompt.get_checkbox_state(), logging_enabled)

    def restart_application(self):
        QApplication.exit()
        QProcess.startDetached(sys.executable, sys.argv)

    def prompt_for_theme(self):
        prompt = CustomPrompt(
            title='Set Default Theme',
            message=f'Would you like to make the {"dark" if theme_manager.theme else "light"} theme your default theme?',
            notice='You can change this later in the Settings tab.',
        )
        theme_manager.apply_theme(prompt, "prompt")
        result = prompt.exec_()
        self.handle_prompt_result('Theme', result, prompt.get_checkbox_state())

    def handle_prompt_result(self, section, result, dont_show_again, logging_enabled=False):
        if dont_show_again:
            dm_functions.save_preference(CONFIG_FILE, section, 'show_prompt', False)
            self.show_prompt[section] = False
        if result == QDialog.Accepted:
            if section == 'Logging':
                if logging_enabled:
                    dm_functions.save_preference(CONFIG_FILE, 'Logging', 'logging', False)
                else:
                    dm_functions.save_preference(CONFIG_FILE, 'Logging', 'logging', True)
                    dm_functions.save_preference(CONFIG_FILE, 'Logging', 'restart_for_logging', True)
                self.restart_application()
            elif section == 'Theme':
                dm_functions.save_preference(CONFIG_FILE, 'Theme', 'theme', theme_manager.theme)

    def on_theme_toggle(self, state):
        if self.is_initializing:
            return

        theme_manager.theme = state
        theme_manager.apply_theme(self, "main", title_bar=self.title_bar)

        if self.show_prompt['Theme']:
            self.prompt_for_theme()

    #def calculate_max_button_width(self, button_texts):
        #padding = 20
        #return max(QPushButton(text).fontMetrics().boundingRect(text).width() + padding for text in button_texts)

    def create_button(self, text, callback):
        button = QPushButton(text)
        button.clicked.connect(callback)
        #button.setFixedWidth(self.max_button_width)
        button.setFixedWidth(MAX_BUTTON_WIDTH)
        button.setSizePolicy(QSizePolicy.Maximum, QSizePolicy.Maximum)
        return button

    def eventFilter(self, source, event):
        if event.type() == QEvent.KeyPress and event.key() == Qt.Key_Return:
            if source in (self.file_domains_list, self.existing_domains_list, self.search_entry):
                self.search_domains()
                return True
        return super().eventFilter(source, event)

    def on_submit_button_click(self):
        domain = self.add_entry.text()
        if not domain:
            self.update_feedback("Please enter a domain.")
            return

        try:
            cleaned_domain = dm_functions.clean_domain(domain)
            result = dm_functions.add_domain(cleaned_domain)
            self.update_feedback(result)
            self.refresh_existing_domains()
            self.update_current_domain(cleaned_domain, "Add", single_domain=True)

            self.highlight_domains_in_list([cleaned_domain])
            self.add_entry.clear()
            self.add_entry.setFocus()
        except ValueError as e:
            self.update_feedback(f"Invalid domain format: {e}")

    def highlight_domains_in_list(self, domains):
        for domain in domains:
            items = self.existing_domains_list.findItems(domain, Qt.MatchExactly)
            if items:
                item = items[0]
                item.setSelected(True)
                self.existing_domains_list.scrollToItem(item, QAbstractItemView.PositionAtTop)

    def on_delete_selected_button_click(self):
        selected_items = self.existing_domains_list.selectedItems()
        if not selected_items:
            self.update_feedback("No domains selected for deletion.")
            return

        single_domain = len(selected_items) == 1
        for item in selected_items:
            domain = item.text()
            result = dm_functions.remove_domain(domain)
            self.update_feedback(result)
            self.update_current_domain(domain, "Remove", single_domain=single_domain)
            QEventLoop().processEvents()

        self.refresh_existing_domains()
        self.update_current_domain(domain, "Remove", final_message=True, single_domain=single_domain)

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Delete:
            self.on_delete_key_press()

    def on_delete_key_press(self):
        if self.existing_domains_list.hasFocus():
            selected_items = self.existing_domains_list.selectedItems()
            if selected_items:
                self.on_delete_selected_button_click()

    def on_clear_button_click(self):
        if not self.file_domains_list.count():
            self.update_feedback("The list is already empty.")
            return

        self.file_domains_list.clear()
        self.file_cached_domains.clear()
        self.update_feedback("The list has been cleared.")

    def on_refresh_button_click(self):
        self.refresh_existing_domains()
        self.update_feedback("List refreshed.")

    def on_file_browse_button_click(self):
        filters = ";;".join([f"{name} ({ext})" for name, ext in FILE_FORMATS])
        file_path, _ = QFileDialog.getOpenFileName(self, "Select File", "", filters, initialFilter="All Files (*.*)")
        if file_path:
            self.filepath_entry.setText(file_path)

    def on_open_button_click(self):
        file_path = self.filepath_entry.text()
        if not file_path:
            self.update_feedback("Please enter a file path or use the Browse button to select a file.")
            return

        file_name = os.path.basename(file_path)
        self.populate_file_domains_list(file_path, file_name)

    def load_preferences(self):
        preferences = dm_functions.load_preferences(CONFIG_FILE, {
            'Theme': {'theme': 'False', 'show_prompt': 'True'},
            'Logging': {'logging': 'False', 'show_prompt': 'True', 'restart_for_logging': 'False'}
        })
        theme_manager.theme = preferences['Theme']['theme'] == 'True'
        self.show_prompt['Theme'] = preferences['Theme']['show_prompt'] == 'True'
        self.theme_toggle_switch.setChecked(theme_manager.theme)

        logging_enabled = preferences['Logging']['logging'] == 'True'
        self.show_prompt['Logging'] = preferences['Logging']['show_prompt'] == 'True'
        self.settings_tab.logging_enabled_checkbox.setChecked(logging_enabled)

        if preferences['Logging']['restart_for_logging'] == 'True':
            self.show_prompt['Logging'] = False
            dm_functions.save_preference(CONFIG_FILE, 'Logging', 'restart_for_logging', 'False')

    def store_original_font_sizes(self, widget=None):
        if widget is None:
            widget = self
        self.original_font_sizes[widget] = widget.font().pointSizeF()
        for child in widget.findChildren(QWidget):
            self.store_original_font_sizes(child)
    
    def apply_font_scaling(self, scale_factor=None):
        if scale_factor is None:
            config = configparser.ConfigParser()
            config.read(CONFIG_FILE)
            scale_factor = int(config.get('Font', 'scale', fallback="100%").strip('%')) / 100
        self.start_font_scaling_thread(scale_factor * 100)

    @pyqtSlot(int)
    def start_font_scaling_thread(self, value):
        scale_factor = value / 100
        self.font_scaler_thread = FontScalerThread(self, scale_factor, self.original_font_sizes)
        self.font_scaler_thread.update_font_signal.connect(self.update_widget_font)
        self.font_scaler_thread.start()

    @pyqtSlot(QWidget, float)
    def update_widget_font(self, widget, new_point_size):
        font = widget.font()
        old_point_size = font.pointSizeF()
        font.setPointSizeF(new_point_size)
        widget.setFont(font)

        if isinstance(widget, QPushButton):
            original_text = widget.property('original_text')
            if original_text is None:
                original_text = widget.text()
                widget.setProperty('original_text', original_text)
            
            # Determine if text needs to be elided based on the new font size
            if new_point_size >= self.original_font_sizes.get(widget, old_point_size):
                # Font size is sufficient, restore original text
                widget.setText(original_text)
            else:
                # Font size is too small, elide the text
                elided_text = self.elide_text(original_text, widget.fontMetrics(), widget.width())
                widget.setText(elided_text)

        # Ensure the widget's style is updated
        widget.updateGeometry()
        widget.update()

    def elide_text(self, text, font_metrics, width):
        if font_metrics.horizontalAdvance(text) <= width:
            return text
        ellipsis = '...'
        ellipsis_width = font_metrics.horizontalAdvance(ellipsis)
        for i in range(1, len(text)):
            truncated_text = font_metrics.elidedText(text, Qt.ElideRight, width - ellipsis_width * i)
            if font_metrics.horizontalAdvance(truncated_text + ellipsis) <= width:
                return truncated_text + ellipsis
        return ''

    def populate_file_domains_list(self, file_path, file_name):
        if not file_path:
            self.update_feedback("Please provide a file path.")
            return

        processing_function = dm_functions.get_processing_function(file_path)
        if not processing_function:
            self.update_feedback("Unsupported file format. Please use .txt, .csv, or .json.")
            return

        self.file_domains_list.clear()
        self.file_cached_domains.clear()

        domains = []
        try:
            for _, domain in processing_function(file_path):
                try:
                    cleaned_domain = dm_functions.clean_domain(domain)
                    self.file_domains_list.addItem(cleaned_domain)
                    domains.append(cleaned_domain)
                except ValueError as e:
                    self.update_feedback(f"Skipping invalid domain: {e}")

            self.file_cached_domains.append((file_name, domains))
            self.update_feedback(f"Loaded domains from {file_path}")
        except Exception as e:
            self.update_feedback(str(e))

    def process_domains_from_list(self, action_type):
        selected_items = self.file_domains_list.selectedItems()

        if not self.file_cached_domains:
            self.update_feedback(f"No domains to {action_type.lower()}.")
            return

        file_name = self.file_cached_domains[0][0]
        domains, message = self.get_domains_and_message(selected_items, file_name, action_type)

        reply = QMessageBox.question(self, 'Confirmation', message, QMessageBox.Yes | QMessageBox.No, QMessageBox.No)
        if reply == QMessageBox.Yes:
            added_domains = []
            for domain in domains:
                result = self.perform_domain_action(domain, action_type)
                self.update_feedback(result)
                self.update_current_domain(domain, action_type, file_name=file_name)
                if action_type == "Add":
                    added_domains.append(domain)
                QEventLoop().processEvents()

            self.refresh_existing_domains()
            self.update_current_domain("", action_type, final_message=True, file_name=file_name)
            
            if action_type == "Add":
                self.highlight_domains_in_list(added_domains)

    def get_domains_and_message(self, selected_items, file_name, action_type):
        if selected_items:
            domains = [item.text() for item in selected_items]
            message = f"Do you want to {action_type.lower()} the selected domains?"
        else:
            domains = self.file_cached_domains[0][1]
            message = f"Do you want to {action_type.lower()} all domains from {file_name}?"
        return domains, message

    def perform_domain_action(self, domain, action_type):
        if action_type == "Add":
            return dm_functions.add_domain(domain)
        elif action_type == "Remove":
            return dm_functions.remove_domain(domain)
        return f"Unsupported action type: {action_type}"

    def update_current_domain(self, domain, action_type, final_message=False, single_domain=False, file_name=None):
        if len(domain) > 100:
            domain = domain[:97] + "..."

        message = self.create_action_message(domain, action_type, file_name)
        self.current_domain_label.setText(message)

        if final_message:
            success_message = self.create_success_message(domain, action_type, single_domain, file_name)
            self.current_domain_label.setText(success_message)

    def create_action_message(self, domain, action_type, file_name):
        if action_type == "Add":
            return f"Adding {domain} from {file_name} to the block list." if file_name else f"Adding {domain} to the block list."
        elif action_type == "Remove":
            return f"Removing {domain} from {file_name} from the block list." if file_name else f"Removing {domain} from the block list."
        return f"{action_type} {domain}"

    def create_success_message(self, domain, action_type, single_domain, file_name):
        if action_type == "Add":
            return f"The domain {domain} has been successfully added to the block list." if single_domain else f"All domains from {file_name} have been successfully added to the block list."
        elif action_type == "Remove":
            return f"The domain {domain} has been successfully removed from the block list." if single_domain else f"All domains from {file_name} have been successfully removed from the block list."
        return "Operation completed successfully."

    def update_feedback(self, message):
        self.feedback_text.append(message)
        self.feedback_text.verticalScrollBar().setValue(self.feedback_text.verticalScrollBar().maximum())
        logging.info(message)

    def display_brave_status(self):
        result = dm_functions.check_brave_installation()
        self.update_feedback("Brave is installed on this system." if result else "Brave is not installed on this system.")

    def display_registry_path(self):
        path_result = dm_functions.check_registry_path()
        self.update_feedback(path_result)

    def refresh_existing_domains(self):
        self.existing_domains_list.clear()
        self.cached_domains = dm_functions.fetch_existing_domains()
        if isinstance(self.cached_domains, list):
            self.existing_domains_list.addItems(self.cached_domains)
        else:
            self.update_feedback(self.cached_domains)

    def search_domains(self):
        search_text = self.search_entry.text()
        domain_list_widget, cached_domains = self.get_current_list_and_cache()
        self.perform_search(search_text, domain_list_widget, cached_domains)

    def set_current_list(self, list_type):
        if list_type == 'existing':
            self.reset_list('file')
        elif list_type == 'file':
            self.reset_list('existing')
        self.current_list = list_type

    def get_current_list_and_cache(self):
        if self.current_list == 'existing':
            return self.existing_domains_list, self.cached_domains
        elif self.current_list == 'file':
            return self.file_domains_list, [domain for _, domain_list in self.file_cached_domains for domain in domain_list]
        return None, None

    def perform_search(self, search_text, domain_list_widget, cached_domains):
        domain_list_widget.clear()
        if not search_text:
            domain_list_widget.addItems(cached_domains) if isinstance(cached_domains, list) else self.update_feedback(cached_domains)
            return

        if isinstance(cached_domains, list):
            for domain in cached_domains:
                if fuzz.partial_ratio(search_text.lower(), domain.lower()) >= SEARCH_THRESHOLD:
                    domain_list_widget.addItem(domain)
        else:
            self.update_feedback(cached_domains)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    gui = DomainManagerGUI()
    gui.show()
    logging.info('Application started')
    sys.exit(app.exec_())
