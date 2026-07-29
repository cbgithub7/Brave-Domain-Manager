# domain_manager_functions.py

# Standard library imports
import subprocess
import json
import re
import csv
import os
import logging
import configparser

# Initialize logging
logging.basicConfig(filename='domain_manager.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logging.info('Domain Manager Functions - Session started')

def execute_powershell_script(action, *args):
    script_path = "Manage-DomainsInRegistry.ps1"
    command = ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", script_path, action] + list(args)
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        logging.error(f"Error executing PowerShell script: {e.stderr.strip()}")
        return f"Error executing PowerShell script: {e.stderr.strip()}"
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        return f"An error occurred: {str(e)}"

def check_registry_path():
    result = execute_powershell_script("5")
    return result

def check_brave_installation():
    result = execute_powershell_script("4")
    if "Brave is not installed" in result:
        return False
    else:
        return True

def fetch_existing_domains():
    result = execute_powershell_script("1")
    try:
        existing_domains = json.loads(result)
        return existing_domains
    except json.decoder.JSONDecodeError as e:
        logging.error(f"Error decoding JSON: {e}\nRaw response: {result}")
        return f"Error decoding JSON: {e}\nRaw response: {result}"

def clean_domain(domain):
    domain_pattern = r"^([a-zA-Z0-9-]+\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$"

    cleaned_domain = re.sub(r'^(https?://)?(www\.)?', '', domain)  # Remove prefixes
    cleaned_domain = re.sub(r'/.+', '', cleaned_domain)  # Remove path info

    if not re.match(domain_pattern, cleaned_domain):
        raise ValueError(f"{domain}. Please use [subdomain].[domain].[TLD] format.")

    return cleaned_domain

def add_domain(domain):
    try:
        result = execute_powershell_script("2", domain)
        logging.info(f"Add domain result: {result.strip()}")
        return result.strip()
    except ValueError as e:
        logging.error(f"Add domain error: {str(e)}")
        return str(e)

def remove_domain(index):
    result = execute_powershell_script("3", index)
    logging.info(f"Remove domain result: {result.strip()}")
    return result.strip()

def process_file(file_path, process_func):
    file_name = os.path.basename(file_path)
    try:
        with open(file_path, "r") as file:
            for item in process_func(file):
                yield file_name, item
    except Exception as e:
        logging.error(f"Error processing file: {e}")
        raise Exception(f"Error processing file: {e}")

def process_text_file(file_path):
    return process_file(file_path, lambda f: (line.strip() for line in f))

def process_csv_file(file_path):
    return process_file(file_path, lambda f: (row[0].strip() for row in csv.reader(f)))

def process_json_file(file_path):
    return process_file(file_path, lambda f: json.load(f))

def get_processing_function(file_path):
    if file_path.endswith(".txt"):
        return process_text_file
    elif file_path.endswith(".csv"):
        return process_csv_file
    elif file_path.endswith(".json"):
        return process_json_file
    return None

def create_default_config(config_file):
    config = configparser.ConfigParser()
    config['Theme'] = {
        'theme': 'False',
        'show_prompt': 'True'
    }
    config['Logging'] = {
        'logging': 'False',
        'show_prompt': 'True',
        'restart_for_logging': 'False'
    }
    with open(config_file, 'w') as configfile:
        config.write(configfile)

def save_preference(config_file, section, key, value):
    config = configparser.ConfigParser()
    config.read(config_file)
    if not config.has_section(section):
        config.add_section(section)
    config[section][key] = str(value)
    with open(config_file, 'w') as configfile:
        config.write(configfile)

def load_preferences(config_file, sections):
    config = configparser.ConfigParser()
    if not os.path.exists(config_file):
        create_default_config(config_file)
    config.read(config_file)

    preferences = {}
    for section, keys in sections.items():
        if not config.has_section(section):
            config.add_section(section)
        preferences[section] = {key: config.get(section, key, fallback=default) for key, default in keys.items()}
    return preferences

def undo_action():
    # Call PowerShell script to perform undo action
    try:
        subprocess.run(["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", "Manage-DomainsInRegistry.ps1", "Undo-Action"], check=True)
    except subprocess.CalledProcessError as e:
        logging.error(f"Error executing undo action: {e}")
        print(f"Error executing undo action: {e}")

def redo_action():
    # Call PowerShell script to perform redo action
    try:
        subprocess.run(["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", "Manage-DomainsInRegistry.ps1", "Redo-Action"], check=True)
    except subprocess.CalledProcessError as e:
        logging.error(f"Error executing redo action: {e}")
        print(f"Error executing redo action: {e}")
