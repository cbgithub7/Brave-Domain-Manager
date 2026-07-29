# Global variables to store user action history
$global:userActionHistory = @()
$global:undoStack = @()
$global:redoStack = @()

# Function to add an action to the user action history
function Add-UserAction {
    param (
        [string]$action,
        [string[]]$parameters,
        [string]$result
    )
    $userAction = @{
        Action = $action
        Parameters = $parameters
        Result = $result
    }
    $global:userActionHistory += $userAction
}

# Function to undo the last action
function Undo-Action {
    if ($userActionHistory.Count -gt 0) {
        $lastAction = $userActionHistory[-1]
        $action = $lastAction.Action
        $parameters = $lastAction.Parameters

        # Remove the last action from the history
        $global:userActionHistory = $userActionHistory[0..($userActionHistory.Count - 2)]

        # Add the action to the redo stack
        $global:redoStack += $lastAction

        # Undo the action
        if ($action -eq "Add-DomainToRegistry") {
            Remove-DomainFromRegistry -indexToRemove $parameters[0]
        } elseif ($action -eq "Add-DomainsFromFileToRegistry") {
            Remove-DomainsFromFileFromRegistry -filePath $parameters[0]
        } elseif ($action -eq "Remove-DomainFromRegistry") {
            Add-DomainToRegistry -domainToAdd $parameters[0]
        }

        Write-Output "Undo: $action"
    } else {
        Write-Output "No actions to undo."
    }
}

# Function to redo the last undone action
function Redo-Action {
    if ($redoStack.Count -gt 0) {
        $lastRedo = $global:redoStack[-1]
        $action = $lastRedo.Action
        $parameters = $lastRedo.Parameters

        # Remove the last redo from the redo stack
        $global:redoStack = $redoStack[0..($redoStack.Count - 2)]

        # Add the redo action back to the user action history
        $global:userActionHistory += $lastRedo

        # Redo the action
        if ($action -eq "Add-DomainToRegistry") {
            Add-DomainToRegistry -domainToAdd $parameters[0]
        } elseif ($action -eq "Add-DomainsFromFileToRegistry") {
            Add-DomainsFromFileToRegistry -filePath $parameters[0]
        } elseif ($action -eq "Remove-DomainFromRegistry") {
            Remove-DomainFromRegistry -indexToRemove $parameters[0]
        }

        Write-Output "Redo: $action"
    } else {
        Write-Output "No actions to redo."
    }
}

# Function to check if the registry path exists
function Test-RegistryPath {
    $path = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist"
    if (Test-Path $path) {
        $output = "Registry path found: $path"
    } else {
        $output = "Registry path not found. You can add the directory to the registry by adding a domain using the interface."
    }
    Write-Output $output
}

# Function to fetch existing domain strings from the registry
function Get-ExistingDomainsFromRegistry {
    param (
        [string]$outputFormat = "values"  # Default output format is "values"
    )
    try {
        $path = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist"
        $domainProperties = Get-ItemProperty -Path $path

        $domainInfo = @()
        foreach ($property in $domainProperties.PSObject.Properties) {
            if ($property.Name -ne "PSPath" -and $property.Name -ne "PSParentPath" -and $property.Name -ne "PSChildName" -and $property.Name -ne "PSDrive" -and $property.Name -ne "PSProvider") {
                $domainInfo += @{
                    Name = $property.Name
                    Value = $property.Value
                }
            }
        }

        if ($outputFormat -eq "names") {
            # Return domain names with TLD
            $jsonOutput = $domainInfo.Name | ConvertTo-Json -Compress
            Write-Output $jsonOutput
        } elseif ($outputFormat -eq "values") {
            # Return domain values
            $jsonOutput = $domainInfo.Value | ConvertTo-Json -Compress
            Write-Output $jsonOutput
        } elseif ($outputFormat -eq "namesAndValues") {
            # Return both names and values
            $jsonOutput = $domainInfo | ConvertTo-Json -Compress
            Write-Output $jsonOutput
        } else {
            Write-Output "Invalid output format specified."
        }
    } catch {
        Write-Output "Failed to fetch existing domain strings from the registry: $_"
    }
}

# Function to get the next available name for a new registry entry using modified binary search
function Get-NextAvailableName {
    $path = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist"
    $existingNames = Get-ItemProperty -Path $path | ForEach-Object { $_.PSObject.Properties.Name } | Where-Object { $_ -ne "(Default)" -and $_ -match '^\d+$' }

    if ($existingNames) {
        # Convert names to integers and sort them
        $existingIndexes = $existingNames | ForEach-Object { [int]$_ } | Sort-Object

        # Modified binary search algorithm to find the lowest available name
        $left = 0
        $right = $existingIndexes.Count - 1

        while ($left -le $right) {
            $mid = [math]::floor(($left + $right) / 2)

            if ($existingIndexes[$mid] -eq $mid + 1) {
                $left = $mid + 1
            } else {
                $right = $mid - 1
            }
        }

        $nextName = $left + 1
        return $nextName.ToString()
    } else {
        Write-Output "No existing names found, starting from 1"
        return "1"  # Start from 1 if no existing names found
    }
}

# Function to add domain string to the registry
function Add-DomainToRegistry {
    param (
        [string]$domainToAdd
    )

    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "This script needs to be run with administrative privileges to modify the registry. Please run the script as an administrator."
        return
    }

    if ($domainToAdd) {
        try {
            $path = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist"

            # Check if the registry path exists, create it if it doesn't
            if (-not (Test-Path $path)) {
                New-Item -Path $path -Force | Out-Null
            }

            # Fetch existing domains
            $existingDomainsJson = Get-ExistingDomainsFromRegistry -outputFormat "values"
            $existingDomains = $existingDomainsJson | ConvertFrom-Json

            # Check if domain already exists
            if ($existingDomains -contains $domainToAdd) {
                Write-Host "Domain '$domainToAdd' already exists in the registry."
                return
            }

            # Generate next available name
            $newValueName = Get-NextAvailableName
            Write-Host "Adding domain '$domainToAdd' to the registry..."

            # Create a new registry property under the newly created key
            New-ItemProperty -Path $path -Name $newValueName -PropertyType String -Value $domainToAdd -Force

            $existingDomainsJson = Get-ExistingDomainsFromRegistry
            $existingDomains = $existingDomainsJson | ConvertFrom-Json

            if ($existingDomains -contains $domainToAdd) {
                Write-Host "Domain '$domainToAdd' added successfully to the registry."
            }
        } catch {
            Write-Host "Failed to add domain '$domainToAdd' to the registry: $_"
        }
    }
}

# Function to remove domain string from the registry
function Remove-DomainFromRegistry {
    param (
        [string]$indexToRemove
    )
    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "This script needs to be run with administrative privileges to modify the registry. Please run the script as an administrator."
        return
    }
    if ($indexToRemove) {
        try {
            $path = "HKLM:\SOFTWARE\Policies\BraveSoftware\Brave\URLBlocklist"
            $existingDomainsJson = Get-ExistingDomainsFromRegistry -outputFormat "namesAndValues"
            $existingDomains = $existingDomainsJson | ConvertFrom-Json

            # Find the domain to remove by index
            $domainToRemove = $existingDomains | Where-Object { $_.Value -eq $indexToRemove }

            if ($domainToRemove) {
                Remove-ItemProperty -Path $path -Name $domainToRemove.Name -ErrorAction Stop
                return "Domain '$($domainToRemove.Value)' removed successfully from the registry."
            } else {
                return "Domain '$indexToRemove' not found in registry for removal."
            }
        } catch {
            return "Failed to remove domain at index '$indexToRemove' from the registry: $_"
        }
    } else {
        return "No index provided to remove domain."
    }
}

# Function to add domains from a file to the registry
function Add-DomainsFromFileToRegistry {
    param (
        [string]$filePath
    )

    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "This script needs to be run with administrative privileges to modify the registry. Please run the script as an administrator."
        return
    }

    if (-not (Test-Path $filePath)) {
        Write-Host "File '$filePath' not found."
        return
    }

    try {
        $domains = Get-Content $filePath
        foreach ($domain in $domains) {
            Add-DomainToRegistry $domain
        }
    } catch {
        Write-Host "Failed to add domains from file '$filePath' to the registry: $_"
    }
}

# Function to remove domains from a file from the registry
function Remove-DomainsFromFileFromRegistry {
    param (
        [string]$filePath
    )

    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "This script needs to be run with administrative privileges to modify the registry. Please run the script as an administrator."
        return
    }

    if (-not (Test-Path $filePath)) {
        Write-Host "File '$filePath' not found."
        return
    }

    try {
        $domains = Get-Content $filePath
        foreach ($domain in $domains) {
            Remove-DomainFromRegistry $domain
        }
    } catch {
        Write-Host "Failed to remove domains from file '$filePath' from the registry: $_"
    }
}

# Function to check if Brave is installed
function Test-BraveInstallation {
    $braveRegistryPath = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
    $braveKey = Get-ChildItem $braveRegistryPath | Where-Object { $_.GetValue("DisplayName") -eq "Brave" }

    if ($null -ne $braveKey) {
        return $true
    } else {
        return $false
    }
}

# Main script logic
$action = $args[0]

switch ($action) {
    "1" {
        # Fetch existing domain strings from the registry
        $jsonResult = Get-ExistingDomainsFromRegistry
        Write-Output $jsonResult
    }
    "2" {
        # Add domain string to the registry
        $domainToAdd = $args[1]
        Add-DomainToRegistry $domainToAdd
    }
    "3" {
        # Remove domain string from the registry
        $indexToRemove = $args[1]
        Remove-DomainFromRegistry $indexToRemove
    }
    "4" {
        # Check if Brave is installed
        $braveInstalled = Test-BraveInstallation
        if ($braveInstalled) {
            Write-Output "Brave is installed on this system."
        } else {
            Write-Output "Brave is not installed on this system."
        }
    }
    "5" {
        # Check if the registry path exists
        $registryPathCheckResult = Test-RegistryPath
        Write-Output $registryPathCheckResult
    }
    "6" {
        # Add domains from a file to the registry
        $filePath = $args[1]
        Add-DomainsFromFileToRegistry $filePath
    }
    "7" {
        # Remove domains from a file from the registry
        $filePath = $args[1]
        Remove-DomainsFromFileFromRegistry $filePath
    }
    default {
        return "Invalid action parameter. Please provide a valid action: 1 (Fetch), 2 (Add), 3 (Remove), 4 (Check Brave installation), or 5 (Check registry path)."
    }
}
