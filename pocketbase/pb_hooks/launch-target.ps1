param(
    [Parameter(Mandatory = $true)]
    [string]$Target,
    [string]$ArgumentsText = ""
)

$ErrorActionPreference = "Stop"
$expandedTarget = [Environment]::ExpandEnvironmentVariables($Target.Trim())

if ([string]::IsNullOrWhiteSpace($expandedTarget)) {
    throw "Target is empty."
}

$startParameters = @{
    FilePath = $expandedTarget
}

if (-not [string]::IsNullOrWhiteSpace($ArgumentsText)) {
    $startParameters.ArgumentList = $ArgumentsText
}

Start-Process @startParameters
