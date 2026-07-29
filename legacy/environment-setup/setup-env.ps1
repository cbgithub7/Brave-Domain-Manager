# Define the name for the virtual environment
$venvName = "venv"

# Create the virtual environment
Write-Host "Creating virtual environment..."
python -m venv $venvName

# Activate the virtual environment (assuming Windows)
$venvPath = ".\$venvName\Scripts\Activate.ps1"
. $venvPath

# Confirm if the virtual environment is activated successfully
if ($null -ne $env:VIRTUAL_ENV) {
    Write-Host "Virtual environment activated successfully." -ForegroundColor Green
} else {
    Write-Host "Failed to activate virtual environment. Installation may not proceed as expected." -ForegroundColor Red
    Exit 1
}

# Define the URL for get-pip.py
$pipUrl = "https://bootstrap.pypa.io/get-pip.py"

# Define the destination path for saving get-pip.py within the virtual environment
$pipDestination = ".\$venvName\get-pip.py"

# Download get-pip.py
try {
    Write-Host "Downloading get-pip.py..."
    Invoke-WebRequest -Uri $pipUrl -OutFile $pipDestination -ErrorAction Stop
    Write-Host "Successfully downloaded get-pip.py." -ForegroundColor Green
} catch {
    Write-Host "Failed to download get-pip.py: $($_)" -ForegroundColor Red
    Exit 1
}

# Install pip using get-pip.py within the virtual environment
try {
    Write-Host "Installing pip..."
    & .\$venvName\Scripts\python.exe $pipDestination
    Write-Host "Successfully installed pip." -ForegroundColor Green
} catch {
    Write-Host "Failed to install pip: $($_)" -ForegroundColor Red
    Exit 1
}

# Install requirements from requirements.txt located in the environment-setup folder
$requirementsFile = ".\environment-setup\requirements.txt"
Write-Host "Checking if requirements.txt exists at $requirementsFile"
if (Test-Path $requirementsFile) {
    Write-Host "requirements.txt found. Installing requirements..."

    try {
        & .\$venvName\Scripts\pip.exe install -r $requirementsFile
        Write-Host "Successfully installed all requirements from requirements.txt." -ForegroundColor Green
    } catch {
        Write-Host "Failed to install some packages from requirements.txt: $($_)" -ForegroundColor Red
    }
} else {
    Write-Host "requirements.txt not found in environment-setup folder. Skipping requirements installation." -ForegroundColor Red
}
