param([Parameter(Mandatory)][string]$OutputPath)

$ErrorActionPreference = 'Stop'
$archive = [IO.Path]::GetFullPath($OutputPath)
if (Test-Path -LiteralPath $archive) { throw 'Release archive already exists' }

Push-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$previousEpoch = $env:SOURCE_DATE_EPOCH
try {
    if (!$env:SOURCE_DATE_EPOCH) {
        $env:SOURCE_DATE_EPOCH = git log -1 --format='%ct'
        if ($LASTEXITCODE) { throw 'Supply SOURCE_DATE_EPOCH outside a Git checkout' }
    }
    $releaseStamp = [DateTimeOffset]::FromUnixTimeSeconds([long]$env:SOURCE_DATE_EPOCH)
    if ($releaseStamp.Year -lt 1980 -or $releaseStamp.Year -gt 2107) { throw 'Release timestamp is out of range for ZIP' }
    node scripts/build-profile.mjs production
    if ($LASTEXITCODE) { throw 'Production build failed verification' }
    $dist = (Resolve-Path 'dist').Path
    $files = [ordered]@{}
    foreach ($file in (Get-ChildItem -LiteralPath $dist -Recurse -File -Force | Sort-Object FullName)) {
        $relative = [IO.Path]::GetRelativePath($dist, $file.FullName).Replace('\', '/')
        if (!$relative.StartsWith('generated/')) { $files['web/' + $relative] = $file.FullName }
    }

    $php = (Resolve-Path 'server/leads-php').Path
    $files['api-entry/lead.php'] = Join-Path $php 'entry.php'
    foreach ($name in @('bootstrap.php','config.php','config.example.json','http.php','ledger.php','moysklad.php','preflight.php','retry.php','validation.php')) {
        $files['private-runtime/' + $name] = Join-Path $php $name
    }
    $files['api-entry/payment.php'] = Join-Path $php 'payment-entry.php'
    foreach ($file in (Get-ChildItem -LiteralPath $php -Filter 'payment-*.php' -File | Sort-Object Name)) {
        if ($file.Name -ne 'payment-entry.php') { $files['private-runtime/' + $file.Name] = $file.FullName }
    }
    $files['api-entry/commerce.php'] = (Resolve-Path 'server/inventory/commerce-entry.php').Path
    $files['host-settings/apache.htaccess'] = Join-Path $php 'release.htaccess'
    $files['host-settings/php.ini.snippet'] = Join-Path $php 'release-php.ini'
    $catalog = node --input-type=module -e "import {products} from './src/data/products.ts'; process.stdout.write(JSON.stringify(Object.fromEntries(products.map(p=>[p.id,{sku:p.sku ?? null,unit:p.unit,priceMinor:p.priceRub*100,kind:p.kind,widthMm:p.dimensions.widthMm ?? null,lengthMm:p.dimensions.lengthMm}]))))"
    if ($LASTEXITCODE -or !$catalog) { throw 'Cannot generate private catalogue contract' }
    $catalogBytes = [Text.Encoding]::UTF8.GetBytes($catalog)
    $catalogEntry = 'private-runtime/catalog-contract.json'
    $expected = @{}
    $pendingArchive = $archive + '.' + [Guid]::NewGuid().ToString('N') + '.pending'
    $zip = [IO.Compression.ZipFile]::Open($pendingArchive, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($name in $files.Keys) {
            $expected[$name] = (Get-FileHash -LiteralPath $files[$name]).Hash
            $entry = $zip.CreateEntry($name, [IO.Compression.CompressionLevel]::Optimal)
            $entry.LastWriteTime = $releaseStamp
            $source = [IO.File]::OpenRead($files[$name])
            try {
                $stream = $entry.Open()
                try { $source.CopyTo($stream) } finally { $stream.Dispose() }
            } finally { $source.Dispose() }
        }
        $expected[$catalogEntry] = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($catalogBytes))
        $entry = $zip.CreateEntry($catalogEntry)
        $entry.LastWriteTime = $releaseStamp
        $stream = $entry.Open()
        try { $stream.Write($catalogBytes, 0, $catalogBytes.Length) } finally { $stream.Dispose() }
    } finally { $zip.Dispose() }

    $zip = [IO.Compression.ZipFile]::OpenRead($pendingArchive)
    try {
        if ($zip.Entries.Count -ne $expected.Count) { throw 'Archive file count mismatch' }
        foreach ($entry in $zip.Entries) {
            $stream = $entry.Open()
            try { $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) }
            finally { $stream.Dispose() }
            if ($expected[$entry.FullName] -ne $hash) { throw ('Archive digest mismatch ' + $entry.FullName) }
        }
    } finally { $zip.Dispose() }
    [IO.File]::Move($pendingArchive, $archive)
    'Verified {0} entries. SHA-256 {1}' -f $expected.Count, (Get-FileHash -LiteralPath $archive).Hash.ToLowerInvariant()
} finally {
    if ($pendingArchive -and [IO.File]::Exists($pendingArchive)) { [IO.File]::Delete($pendingArchive) }
    $env:SOURCE_DATE_EPOCH = $previousEpoch
    Pop-Location
}
