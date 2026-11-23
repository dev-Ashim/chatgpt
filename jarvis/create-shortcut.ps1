# Puts a "Jarvis" icon on your desktop. Run once:
#   powershell -ExecutionPolicy Bypass -File create-shortcut.ps1
# Add -Startup to also launch Jarvis when Windows starts.
param([switch]$Startup)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$shell = New-Object -ComObject WScript.Shell

function New-JarvisShortcut($folder) {
    $lnk = $shell.CreateShortcut((Join-Path $folder 'Jarvis.lnk'))
    $lnk.TargetPath = Join-Path $here 'start-jarvis.bat'
    $lnk.WorkingDirectory = $here
    $lnk.WindowStyle = 7  # minimized
    $lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,277"
    $lnk.Description = 'Start Jarvis voice assistant'
    $lnk.Save()
    Write-Output "Created $($lnk.FullName)"
}

New-JarvisShortcut ([Environment]::GetFolderPath('Desktop'))
if ($Startup) { New-JarvisShortcut ([Environment]::GetFolderPath('Startup')) }
