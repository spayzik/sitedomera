param([Parameter(Mandatory)][string]$OutputPath)

$ErrorActionPreference = 'Stop'
$archive = [IO.Path]::GetFullPath($OutputPath)
if (Test-Path -LiteralPath $archive) { throw 'Release archive already exists' }

Push-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
try {
    npm run verify:production
    if ($LASTEXITCODE) { throw 'Static release verifier failed' }
    $dist = (Resolve-Path 'dist').Path
    if (!(Get-ChildItem -LiteralPath (Join-Path $dist 'assets') -Filter '*.js' |
        Select-String -SimpleMatch '"/api/lead"' -List)) {
        throw 'Build first with VITE_DEKORAY_LEAD_API=/api/lead'
    }
    $files = [ordered]@{}
    foreach ($file in (Get-ChildItem -LiteralPath $dist -Recurse -File -Force | Sort-Object FullName)) {
        $relative = [IO.Path]::GetRelativePath($dist, $file.FullName).Replace('\', '/')
        if (!$relative.StartsWith('generated/')) { $files['web/' + $relative] = $file.FullName }
    }

    $php = (Resolve-Path 'server/leads-php').Path
    $files['api-entry/lead.php'] = Join-Path $php 'entry.php'
    foreach ($name in @('bootstrap.php','config.php','config.example.json','http.php','ledger.php','moysklad.php','preflight.php','validation.php')) {
        $files['private-runtime/' + $name] = Join-Path $php $name
    }
    $files['host-settings/apache.htaccess'] = Join-Path $php 'release.htaccess'
    $files['host-settings/php.ini.snippet'] = Join-Path $php 'release-php.ini'
    $catalog = node --input-type=module -e "import {products} from './src/data/products.ts'; process.stdout.write(JSON.stringify(Object.fromEntries(products.map(p=>[p.id,{sku:p.sku ?? null,unit:p.unit,priceMinor:p.priceRub*100}]))))"
    if ($LASTEXITCODE -or !$catalog) { throw 'Cannot generate private catalogue contract' }
    $catalogBytes = [Text.Encoding]::UTF8.GetBytes($catalog)
    $catalogEntry = 'private-runtime/catalog-contract.json'
    $expected = @{}
    $zip = [IO.Compression.ZipFile]::Open($archive, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($name in $files.Keys) {
            $expected[$name] = (Get-FileHash -LiteralPath $files[$name]).Hash
            $null = [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $files[$name], $name, [IO.Compression.CompressionLevel]::Optimal)
        }
        $expected[$catalogEntry] = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($catalogBytes))
        $stream = $zip.CreateEntry($catalogEntry).Open()
        try { $stream.Write($catalogBytes, 0, $catalogBytes.Length) } finally { $stream.Dispose() }
    } finally { $zip.Dispose() }

    $zip = [IO.Compression.ZipFile]::OpenRead($archive)
    try {
        if ($zip.Entries.Count -ne $expected.Count) { throw 'Archive file count mismatch' }
        foreach ($entry in $zip.Entries) {
            $stream = $entry.Open()
            try { $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) }
            finally { $stream.Dispose() }
            if ($expected[$entry.FullName] -ne $hash) { throw ('Archive digest mismatch ' + $entry.FullName) }
        }
    } finally { $zip.Dispose() }
    'Verified {0} entries. SHA-256 {1}' -f $expected.Count, (Get-FileHash -LiteralPath $archive).Hash.ToLowerInvariant()
} finally { Pop-Location }
