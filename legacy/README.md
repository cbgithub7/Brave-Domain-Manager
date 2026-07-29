# Brave Domain Manager

The **Brave Domain Manager** is a simple GUI application built using Python and Tkinter for managing domain blocklist entries in the Windows registry for the Brave browser. It provides an easy-to-use interface for adding, removing, and searching for domain entries, along with checking the installation status of the Brave browser.

## Features

- **Add Domain:** Allows users to add domain entries to the blocklist in the Windows registry.
- **Remove Domain:** Enables users to remove existing domain entries from the blocklist.
- **Search Domain:** Provides a search functionality to filter existing domains based on user input.
- **Refresh List:** Allows users to refresh the list of existing domains.
- **Check Brave Installation:** Displays the installation status of the Brave browser on the system.

## Requirements

- Python 3.x
- Tkinter (Python GUI library)
- Powershell (for executing scripts to manage the Windows registry)

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/your_username/brave-domain-manager.git
    ```

2. Navigate to the project directory:

    ```bash
    cd brave-domain-manager
    ```

3. Install dependencies:

    ```bash
    pip install -r requirements.txt
    ```

## Usage

> [!IMPORTANT]
> This application needs to be run in a terminal with administrative privileges as it modifies the Windows registry. Additionally, antivirus software may trigger warnings or alerts due to registry modifications. Consider temporarily disabling antivirus software while using the application or adding an exception for domain_manager_gui.py in your antivirus settings.

1. Run the application:

    ```bash
    python domain_manager_gui.py
    ```

2. Use the interface to perform actions such as adding, removing, or searching for domain entries.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
