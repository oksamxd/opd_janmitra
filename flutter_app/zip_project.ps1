# ZIP Project Script
$root = Get-Location
$zipPath = Join-Path $root "janmitra_api_project.zip"
$excludeList = @("node_modules", ".git", "build", ".dart_tool", ".next", "dist", ".gemini", ".antigravity", "janmitra_api_project.zip")

Write-Host "Collecting files for zipping, excluding: $($excludeList -join ', ')..."

# Filter items manually to handle nesting correctly
$items = Get-ChildItem -Path $root -Recurse | Where-Object {
    $path = $_.FullName
    $shouldExclude = $false
    foreach ($ex in $excludeList) {
        if ($path -like "*\$ex*" -or $path.EndsWith("\$ex")) {
            $shouldExclude = $true
            break
        }
    }
    return -not $shouldExclude
}

if ($items.Count -eq 0) {
    Write-Error "No files found to zip!"
    exit 1
}

Write-Host "Zipping $($items.Count) items to $zipPath..."
$items | Compress-Archive -DestinationPath $zipPath -Force

Write-Host "Done! ZIP created at: $zipPath"
