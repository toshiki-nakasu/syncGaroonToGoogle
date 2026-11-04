# Windows PowerShell 5.1 compatible. Keep this file ASCII for its default encoding.
[CmdletBinding()]
param(
    [string]$InstallDirectory = $PSScriptRoot,
    [string]$Token = $(if ($env:GH_TOKEN) { $env:GH_TOKEN } else { $env:GITHUB_TOKEN })
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-ReleasePath {
    param([string]$Name)
    if ([string]::IsNullOrWhiteSpace($Name) -or $Name -match '[\\:<>"|?*]' -or
        $Name.StartsWith('/') -or @($Name.Split('/') | Where-Object { $_ -in @('', '.', '..') }).Count) {
        throw "Invalid release path: $Name"
    }
}

function Read-Release {
    param([string]$Directory)
    $release = Get-Content -LiteralPath (Join-Path $Directory 'release.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($release.repository -notmatch '^[\w.-]+/[\w.-]+$' -or
        $release.tag -notmatch '^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$' -or
        $release.version -ne $release.tag.Substring(1) -or
        $release.asset -ne 'garoon-calendar-sync.zip' -or
        @($release.version.Split('.') | Where-Object { [long]$_ -gt 65535 }).Count -or
        $release.version -eq '0.0.0') {
        throw 'Invalid release metadata.'
    }
    Assert-ReleasePath $release.image
    if ($release.image.Contains('/') -or !$release.image.EndsWith('.png') -or $release.files -isnot [pscustomobject]) {
        throw 'Invalid release file list.'
    }
    $required = @('README.md', 'update.bat', 'update.ps1', 'extension/manifest.json', $release.image)
    $names = @($release.files.PSObject.Properties.Name)
    foreach ($name in $required) {
        if ($names -cnotcontains $name) { throw "Required file is missing: $name" }
    }
    foreach ($property in $release.files.PSObject.Properties) {
        Assert-ReleasePath $property.Name
        if (($property.Name -cnotin $required -and !$property.Name.StartsWith('extension/')) -or
            $property.Value -notmatch '^[a-f0-9]{64}$') {
            throw "Invalid managed file: $($property.Name)"
        }
    }
    return $release
}

function Test-ReleaseFiles {
    param([string]$Directory, $Release)
    foreach ($property in $Release.files.PSObject.Properties) {
        $file = Join-Path $Directory $property.Name
        if (!(Test-Path -LiteralPath $file -PathType Leaf) -or
            (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $property.Value) {
            return $false
        }
    }
    return $true
}

function Invoke-ReleaseRequest {
    param([string]$Uri, [string]$OutFile, [string]$Accept, [string]$AccessToken)
    $headers = @{ Accept = $Accept; 'User-Agent' = 'GaroonCalendarSync-Updater'; 'X-GitHub-Api-Version' = '2022-11-28' }
    if ($AccessToken) { $headers.Authorization = "Bearer $AccessToken" }
    if ($OutFile) {
        Invoke-WebRequest -UseBasicParsing -Uri $Uri -Headers $headers -OutFile $OutFile -TimeoutSec 120 | Out-Null
    } else {
        return Invoke-RestMethod -Uri $Uri -Headers $headers -TimeoutSec 60
    }
}

function Expand-ReleaseArchive {
    param([string]$Archive, [string]$Destination)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        foreach ($entry in $zip.Entries) {
            # Older .NET Framework writes Windows separators into ZIP entries.
            $name = $entry.FullName.Replace('\', '/').TrimEnd('/')
            Assert-ReleasePath $name
            if (!$names.Add($name)) { throw "Duplicate ZIP entry: $name" }
            if (($entry.ExternalAttributes -band 0xF0000000L) -eq 0xA0000000L) { throw 'ZIP links are not supported.' }
        }
        # Use the validated names for extraction on Windows and non-Windows hosts.
        $null = [IO.Directory]::CreateDirectory($Destination)
        foreach ($entry in $zip.Entries) {
            $name = $entry.FullName.Replace('\', '/')
            $target = Join-Path $Destination $name.TrimEnd('/')
            if ($name.EndsWith('/')) {
                $null = [IO.Directory]::CreateDirectory($target)
            } else {
                $null = [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))
                [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target)
            }
        }
    } finally {
        $zip.Dispose()
    }
}

function Get-ReleaseAsset {
    param($Release, [string]$Name, [string]$Repository)
    $assets = @($Release.assets | Where-Object { $_.name -ceq $Name })
    if ($assets.Count -ne 1 -or $assets[0].url -notmatch "^https://api\.github\.com/repos/$([regex]::Escape($Repository))/releases/assets/\d+$") {
        throw "Release asset not found or invalid: $Name"
    }
    return $assets[0].url
}

function Invoke-ExtensionUpdate {
    param([string]$Directory, [string]$AccessToken)
    $directoryPath = [IO.Path]::GetFullPath($Directory)
    $installed = Read-Release $directoryPath
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    $latest = Invoke-ReleaseRequest -Uri "https://api.github.com/repos/$($installed.repository)/releases/latest" -Accept 'application/vnd.github+json' -AccessToken $AccessToken
    if ($latest.draft -or $latest.prerelease -or $latest.tag_name -notmatch '^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$') {
        throw 'The latest release is not a supported stable version.'
    }
    $latestVersion = [version]$latest.tag_name.Substring(1)
    if ($latestVersion -lt [version]$installed.version) {
        Write-Host 'A newer version is already installed. No files were changed.'
        return
    }
    if ($latest.tag_name -eq $installed.tag -and (Test-ReleaseFiles $directoryPath $installed)) {
        Write-Host "Already up to date: $($installed.tag)"
        return
    }
    $temporary = Join-Path ([IO.Path]::GetTempPath()) ('garoon-update-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temporary | Out-Null
    try {
        $archive = Join-Path $temporary $installed.asset
        $checksum = "$archive.sha256"
        Invoke-ReleaseRequest -Uri (Get-ReleaseAsset $latest $installed.asset $installed.repository) -OutFile $archive -Accept 'application/octet-stream' -AccessToken $AccessToken
        Invoke-ReleaseRequest -Uri (Get-ReleaseAsset $latest "$($installed.asset).sha256" $installed.repository) -OutFile $checksum -Accept 'application/octet-stream' -AccessToken $AccessToken
        $checksumText = (Get-Content -LiteralPath $checksum -Raw).Trim()
        if ($checksumText -notmatch '^([a-f0-9]{64})  garoon-calendar-sync\.zip$' -or
            (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Matches[1]) {
            throw 'ZIP checksum validation failed. No files were changed.'
        }
        $expanded = Join-Path $temporary 'expanded'
        Expand-ReleaseArchive $archive $expanded
        $incoming = Read-Release $expanded
        if ($incoming.repository -cne $installed.repository -or $incoming.tag -cne $latest.tag_name -or
            !(Test-ReleaseFiles $expanded $incoming)) {
            throw 'Release contents do not match the published version. No files were changed.'
        }
        $manifest = Get-Content -LiteralPath (Join-Path $expanded 'extension/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($manifest.manifest_version -ne 3 -or $manifest.version -ne $incoming.version) {
            throw 'Invalid extension manifest. No files were changed.'
        }
        $expectedFiles = @($incoming.files.PSObject.Properties.Name) + 'release.json'
        foreach ($file in Get-ChildItem -LiteralPath $expanded -File -Recurse) {
            $relative = $file.FullName.Substring($expanded.Length + 1).Replace('\', '/')
            if ($expectedFiles -cnotcontains $relative) { throw "Unexpected release file: $relative" }
        }
        # Validate everything before removing the old extension. No backup is kept.
        $extension = Join-Path $directoryPath 'extension'
        if (Test-Path -LiteralPath $extension) {
            $links = @(Get-Item -LiteralPath $extension) + @(Get-ChildItem -LiteralPath $extension -Recurse -Force)
            if (@($links | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) {
                throw 'The installation contains links. No files were changed.'
            }
            Remove-Item -LiteralPath $extension -Recurse -Force
        }
        Copy-Item -LiteralPath (Join-Path $expanded 'extension') -Destination $extension -Recurse
        foreach ($name in @('README.md', $incoming.image, 'update.ps1', 'update.bat')) {
            Copy-Item -LiteralPath (Join-Path $expanded $name) -Destination (Join-Path $directoryPath $name) -Force
        }
        # Write the completion marker last. An interrupted update can be retried.
        Copy-Item -LiteralPath (Join-Path $expanded 'release.json') -Destination (Join-Path $directoryPath 'release.json') -Force
        Write-Host "Updated to $($incoming.tag). Open chrome://extensions and reload Garoon Calendar Sync."
    } finally {
        Remove-Item -LiteralPath $temporary -Recurse -Force
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    try {
        Write-Host 'Stop synchronization before updating. No backup will be created.'
        Invoke-ExtensionUpdate -Directory $InstallDirectory -AccessToken $Token
        exit 0
    } catch {
        Write-Host "Update failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host 'Check network access, GH_TOKEN for private repositories, and file permissions. Retry the update or extract the release ZIP again if replacement was interrupted.'
        exit 1
    }
}
