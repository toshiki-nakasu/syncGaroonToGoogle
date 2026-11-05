param([Parameter(Mandatory = $true)][string]$Package)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../release/updater/update.ps1')
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (!$Condition) { throw "Assertion failed: $Message" }
}

function Assert-Throws {
    param([scriptblock]$Action, [string]$Pattern)
    $caught = $false
    try { & $Action } catch {
        $caught = $true
        if ($_.Exception.Message -notmatch $Pattern) { throw }
    }
    Assert-True $caught "Expected error matching $Pattern"
}

$temporary = Join-Path ([IO.Path]::GetTempPath()) ('garoon-updater-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
try {
    $source = Join-Path $temporary 'source'
    Expand-ReleaseArchive ([IO.Path]::GetFullPath($Package)) $source
    $original = Read-Release $source
    Assert-True (Test-ReleaseFiles $source $original) 'Generated ZIP hashes and Unicode filenames'
    Assert-True (Test-Path -LiteralPath (Join-Path $source $original.image)) 'Mapping image'
    $installation = Join-Path $temporary 'installation with spaces'
    Copy-Item -LiteralPath $source -Destination $installation -Recurse
    $old = Read-Release $installation
    # Simulate an installation made before the guides were bundled separately.
    foreach ($name in @('google-calendar-setup.md', 'chrome-extension-usage.md')) {
        $old.files.PSObject.Properties.Remove($name)
        Remove-Item -LiteralPath (Join-Path $installation $name)
    }
    $old.tag = 'v0.0.0'
    $old.version = '0.0.0'
    # Use an older valid version while retaining the actual source hashes.
    $old.tag = 'v0.0.1'
    $old.version = '0.0.1'
    if ($original.version -eq '0.0.1') {
        $original.tag = 'v0.0.2'
        $original.version = '0.0.2'
        $manifestPath = Join-Path $source 'extension/manifest.json'
        $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $manifest.version = $original.version
        $manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
        $original.files.'extension/manifest.json' = (Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
        $original | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $source 'release.json') -Encoding UTF8
    }
    $old | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $installation 'release.json') -Encoding UTF8
    Set-Content -LiteralPath (Join-Path $installation 'extension/obsolete.js') -Value 'old file'
    Set-Content -LiteralPath (Join-Path $installation 'personal.txt') -Value 'keep me'
    $script:archiveFixture = Join-Path $temporary 'release.zip'
    # Reproduce Windows PowerShell 5.1 ZIP entries on every test platform.
    $zip = [IO.Compression.ZipFile]::Open($script:archiveFixture, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in Get-ChildItem -LiteralPath $source -File -Recurse) {
            $name = $file.FullName.Substring($source.Length + 1).Replace('/', '\')
            $null = [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $name)
        }
    } finally {
        $zip.Dispose()
    }
    $script:checksumFixture = "$script:archiveFixture.sha256"
    function Set-FixtureChecksum {
        $digest = (Get-FileHash -LiteralPath $script:archiveFixture -Algorithm SHA256).Hash.ToLowerInvariant()
        Set-Content -LiteralPath $script:checksumFixture -Encoding ASCII -Value "$digest  garoon-calendar-sync.zip"
    }
    Set-FixtureChecksum
    $script:downloadCount = 0
    $script:failNetwork = $false
    $script:latestFixture = [pscustomobject]@{
        tag_name = $original.tag
        draft = $false
        prerelease = $false
        assets = @(
            [pscustomobject]@{ name = 'garoon-calendar-sync.zip'; url = "https://api.github.com/repos/$($original.repository)/releases/assets/1" },
            [pscustomobject]@{ name = 'garoon-calendar-sync.zip.sha256'; url = "https://api.github.com/repos/$($original.repository)/releases/assets/2" }
        )
    }
    # Mock only the HTTP boundary. Exercise real ZIP extraction and replacement.
    function Invoke-ReleaseRequest {
        param([string]$Uri, [string]$OutFile, [string]$Accept, [string]$AccessToken)
        if ($script:failNetwork) { throw 'Test network failure' }
        if (!$OutFile) { return $script:latestFixture }
        $script:downloadCount++
        $fixture = if ($Uri.EndsWith('/1')) { $script:archiveFixture } else { $script:checksumFixture }
        Copy-Item -LiteralPath $fixture -Destination $OutFile
    }

    Invoke-ExtensionUpdate -Directory $installation
    Assert-True (Test-ReleaseFiles $installation $original) 'Normal update and updater self-replacement'
    Assert-True (!(Test-Path -LiteralPath (Join-Path $installation 'extension/obsolete.js'))) 'Remove obsolete files'
    Assert-True (Test-Path -LiteralPath (Join-Path $installation 'personal.txt')) 'Preserve unrelated files'
    Assert-True (!(Test-Path -LiteralPath (Join-Path $installation 'backup'))) 'No backup'
    $downloadsBefore = $script:downloadCount
    Invoke-ExtensionUpdate -Directory $installation
    Assert-True ($script:downloadCount -eq $downloadsBefore) 'Skip a complete same-version install'

    Remove-Item -LiteralPath (Join-Path $installation 'README.md')
    Invoke-ExtensionUpdate -Directory $installation
    Assert-True (Test-ReleaseFiles $installation $original) 'Repair incomplete same-version install'

    Remove-Item -LiteralPath (Join-Path $installation 'google-calendar-setup.md')
    Set-Content -LiteralPath (Join-Path $installation 'chrome-extension-usage.md') -Value 'outdated guide'
    Invoke-ExtensionUpdate -Directory $installation
    Assert-True (Test-ReleaseFiles $installation $original) 'Repair missing and modified guides'

    Set-Content -LiteralPath (Join-Path $installation 'README.md') -Value 'local content'
    $script:failNetwork = $true
    Assert-Throws { Invoke-ExtensionUpdate -Directory $installation } 'network failure'
    Assert-True ((Get-Content -LiteralPath (Join-Path $installation 'README.md') -Raw).Trim() -eq 'local content') 'Network failure preserves install'
    $script:failNetwork = $false

    Set-Content -LiteralPath $script:checksumFixture -Encoding ASCII -Value ('0' * 64 + '  garoon-calendar-sync.zip')
    Assert-Throws { Invoke-ExtensionUpdate -Directory $installation } 'checksum'
    Assert-True ((Read-Release $installation).tag -eq $original.tag) 'Bad checksum preserves metadata'
    Set-FixtureChecksum

    $zip = [IO.Compression.ZipFile]::Open($script:archiveFixture, [IO.Compression.ZipArchiveMode]::Update)
    try { $zip.GetEntry('README.md').Delete() } finally { $zip.Dispose() }
    Set-FixtureChecksum
    Assert-Throws { Invoke-ExtensionUpdate -Directory $installation } 'contents do not match'
    Assert-True ((Get-Content -LiteralPath (Join-Path $installation 'README.md') -Raw).Trim() -eq 'local content') 'Missing archive file preserves install'

    $zip = [IO.Compression.ZipFile]::Open($script:archiveFixture, [IO.Compression.ZipArchiveMode]::Update)
    try { $null = $zip.CreateEntry('../outside.txt') } finally { $zip.Dispose() }
    Set-FixtureChecksum
    Assert-Throws { Invoke-ExtensionUpdate -Directory $installation } 'Invalid release path'
    Assert-True (!(Test-Path -LiteralPath (Join-Path $temporary 'outside.txt'))) 'Reject ZIP traversal'
    Assert-Throws { Assert-ReleasePath 'extension\..\outside.txt' } 'Invalid release path'

    foreach ($entryName in @('..\outside.txt', 'extension\..\..\outside.txt', '\absolute.txt', 'C:\outside.txt')) {
        $invalidArchive = Join-Path $temporary ([guid]::NewGuid().ToString('N') + '.zip')
        $destination = "$invalidArchive.expanded"
        $zip = [IO.Compression.ZipFile]::Open($invalidArchive, [IO.Compression.ZipArchiveMode]::Create)
        try { $null = $zip.CreateEntry($entryName) } finally { $zip.Dispose() }
        Assert-Throws { Expand-ReleaseArchive $invalidArchive $destination } 'Invalid release path'
        Assert-True (!(Test-Path -LiteralPath $destination)) 'Validate all entries before extraction'
    }

    $duplicateArchive = Join-Path $temporary 'duplicate.zip'
    $zip = [IO.Compression.ZipFile]::Open($duplicateArchive, [IO.Compression.ZipArchiveMode]::Create)
    try {
        $null = $zip.CreateEntry('extension/manifest.json')
        $null = $zip.CreateEntry('extension\manifest.json')
    } finally {
        $zip.Dispose()
    }
    Assert-Throws { Expand-ReleaseArchive $duplicateArchive "$duplicateArchive.expanded" } 'Duplicate ZIP entry'

    $script:latestFixture.tag_name = 'v0.0.1'
    if ($original.version -ne '0.0.1') {
        $downloadsBefore = $script:downloadCount
        Invoke-ExtensionUpdate -Directory $installation
        Assert-True ($script:downloadCount -eq $downloadsBefore) 'No automatic downgrade'
    }
    Write-Host 'Updater tests passed.'
} finally {
    Remove-Item -LiteralPath $temporary -Recurse -Force
}
