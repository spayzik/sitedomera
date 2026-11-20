<?php
declare(strict_types=1);

namespace Dekoray\Leads;

use DOMDocument;
use RuntimeException;

const SITE_ORIGIN = 'https://xn--80ahdrdyo.xn--p1ai';
const SITE_HOST = 'xn--80ahdrdyo.xn--p1ai';

function insidePath(string $path, string $directory): bool
{
    return $path === $directory || str_starts_with($path, rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR);
}

function readObject(string $path, int $limit = 131_072): array
{
    $raw = @file_get_contents($path, false, null, 0, $limit + 1);
    if ($raw === false || strlen($raw) > $limit) {
        throw new RuntimeException('configuration_unavailable');
    }
    $value = json_decode($raw, false, 16, JSON_THROW_ON_ERROR);
    if (!$value instanceof \stdClass) {
        throw new RuntimeException('configuration_invalid');
    }
    return (array) $value;
}

function loadConfig(string $private, string $webroot): array
{
    foreach (['curl', 'pdo_sqlite', 'mbstring', 'intl', 'dom'] as $extension) {
        if (PHP_VERSION_ID < 80300 || !extension_loaded($extension)) {
            throw new RuntimeException('hosting_verification_pending');
        }
    }
    $www = realpath(dirname($webroot));
    $path = realpath($private);
    $root = realpath($webroot);
    if (!$path || !$root || !$www || insidePath($path, $www) || insidePath($root, $path)) {
        throw new RuntimeException('private_directory_invalid');
    }
    $configPath = $path . '/config.json';
    $state = $path . '/state';
    if (is_link($configPath) || is_link($state) || !is_dir($state) || !is_writable($state) ||
        (DIRECTORY_SEPARATOR === '/' && ((fileperms($path) & 0077) !== 0 ||
            !is_file($configPath) || (fileperms($configPath) & 0077) !== 0 || (fileperms($state) & 0077) !== 0))) {
        throw new RuntimeException('private_permissions_invalid');
    }
    $raw = readObject($configPath);
    $ledger = $state . '/leads.sqlite';
    foreach ([$ledger, $ledger . '-journal', $ledger . '-wal', $ledger . '-shm'] as $file) {
        if (is_link($file) || (file_exists($file) && (!is_file($file) ||
            (DIRECTORY_SEPARATOR === '/' && (fileperms($file) & 0077) !== 0)))) {
            throw new RuntimeException('ledger_path_invalid');
        }
    }
    $regexFields = [
        'token' => '/^[!-~]{20,300}$/D', 'organizationId' => UUID, 'intakeStateId' => UUID,
        'consentVersion' => VERSION, 'consentPath' => DOCUMENT_PATH,
        'hashKey' => '/^[a-f0-9]{64}$/iD', 'consentSha256' => '/^[a-f0-9]{64}$/iD',
    ];
    $config = [];
    foreach ($regexFields as $key => $pattern) {
        $value = $raw[$key] ?? null;
        if (!is_string($value) || preg_match($pattern, $value) !== 1) {
            throw new RuntimeException('configuration_invalid');
        }
        $config[$key] = $value;
    }
    $days = $raw['retentionDays'] ?? null;
    if (!is_int($days) || $days < 1 || $days > 365) {
        throw new RuntimeException('retention_invalid');
    }
    $catalog = [];
    $claimed = [];
    $known = readObject(__DIR__ . '/catalog-contract.json');
    $map = $raw['catalog'] ?? new \stdClass();
    if (!$map instanceof \stdClass) {
        throw new RuntimeException('catalog_mapping_invalid');
    }
    foreach ((array) $map as $id => $item) {
        $crmId = is_string($item->id ?? null) ? strtolower($item->id) : '';
        $uomId = is_string($item->uomId ?? null) ? strtolower($item->uomId) : '';
        if (!$item instanceof \stdClass || !isset($known[$id]) ||
            !in_array($item->type ?? null, ['product', 'variant', 'bundle'], true) ||
            preg_match(UUID, $crmId) !== 1 || isset($claimed[$crmId]) ||
            preg_match(UUID, $uomId) !== 1 || ($item->unit ?? null) !== $known[$id]->unit ||
            ($item->priceMinor ?? null) !== $known[$id]->priceMinor) {
            throw new RuntimeException('catalog_mapping_invalid');
        }
        $catalog[$id] = ['type' => $item->type, 'id' => $crmId, 'priceMinor' => $item->priceMinor,
            'uomId' => $uomId, 'unit' => $item->unit];
        $claimed[$crmId] = true;
    }
    return $config + [
        'origin' => SITE_ORIGIN, 'catalog' => $catalog, 'enableGeneralLeads' => true,
        'retentionDays' => $days, 'ledgerPath' => $ledger,
        'enabled' => ($raw['enabled'] ?? false) === true && ($raw['crmSafetyVerified'] ?? false) === true,
    ];
}

function verifyConsent(array $config, string $webroot): void
{
    $path = realpath($webroot . $config['consentPath']);
    if (!$path || !insidePath($path, $webroot)) {
        throw new RuntimeException('consent_unavailable');
    }
    $html = @file_get_contents($path, false, null, 0, 131_073);
    if (!is_string($html) || strlen($html) > 131_072 ||
        !hash_equals(strtolower($config['consentSha256']), hash('sha256', $html))) {
        throw new RuntimeException('consent_unavailable');
    }
    $page = new DOMDocument();
    if (!@$page->loadHTML($html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) {
        throw new RuntimeException('consent_unavailable');
    }
    $versions = [];
    foreach ($page->getElementsByTagName('meta') as $tag) {
        if ($tag->getAttribute('name') === 'dekoray-consent-version') {
            $versions[] = $tag->getAttribute('content');
        }
    }
    if ($versions !== [$config['consentVersion']]) {
        throw new RuntimeException('consent_unavailable');
    }
}
