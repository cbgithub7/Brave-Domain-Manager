# Check for Python installation
$pythonPath = Get-Command python -ErrorAction SilentlyContinue
if ($pythonPath) {
    $pythonVersion = (python --version 2>&1).TrimStart("Python").Trim()
    Write-Host "Python is installed. Version: $pythonVersion"
    
    # Check compatibility with Python 3.10.0
    if ($pythonVersion -eq "3.10.0") {
        Write-Host "Your Python version ($pythonVersion) has been tested with this application."
        # Return 0 to indicate success
        exit 0
    } else {
        Write-Host "Note: This application has been tested with Python 3.10.0, your version may work but hasn't been tested."
    }
} else {
    Write-Host "Python is not installed."
    # Return 1 to indicate failure
    exit 1
}
