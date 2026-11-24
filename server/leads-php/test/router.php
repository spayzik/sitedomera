<?php
declare(strict_types=1);

// PHP CLI-server test fixture only. Never include this router in the release.
if (PHP_SAPI !== 'cli-server') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__) . '/bootstrap.php';

$config = json_decode(getenv('DEKORAY_FIXTURE_CONFIG'), true, flags: JSON_THROW_ON_ERROR);
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$retry = !isset($config['testAccess']) && $path === '/__local_retry' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
if ($path !== '/api/lead' && !$retry) {
    if (isset($config['testAccess'])) {
        if ($path !== $config['consentPath'] || ($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
            http_response_code(404);
            return true;
        }
        header('X-Robots-Tag: noindex, nofollow, noarchive');
        header('Cache-Control: no-store');
        header('Vary: Origin');
        if (($_SERVER['HTTP_ORIGIN'] ?? '') === $config['origin']) {
            header('Access-Control-Allow-Origin: ' . $config['origin']);
        }
        $webroot = realpath($_SERVER['DOCUMENT_ROOT']);
        Dekoray\Leads\verifyConsent($config, $webroot);
        header('Content-Type: text/html; charset=utf-8');
        readfile($webroot . $config['consentPath']);
        return true;
    }
    return false;
}
if (isset($config['testAccess'])) {
    header('X-Robots-Tag: noindex, nofollow, noarchive');
}
$transport = static function (string $url, string $method, ?array $body): array {
    $base = getenv('DEKORAY_FIXTURE_CRM');
    if (!preg_match('~^http://127\.0\.0\.1:[0-9]+$~D', $base)) {
        throw new RuntimeException('invalid fixture');
    }
    $uri = parse_url($url, PHP_URL_PATH);
    $query = parse_url($url, PHP_URL_QUERY);
    $handle = curl_init($base . $uri . ($query ? '?' . $query : ''));
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_TIMEOUT_MS => 800, CURLOPT_FOLLOWLOCATION => false,
    ]);
    if ($body !== null) {
        curl_setopt($handle, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($handle, CURLOPT_POSTFIELDS, json_encode($body, JSON_THROW_ON_ERROR));
    }
    $response = curl_exec($handle);
    if (!is_string($response)) {
        throw new RuntimeException('synthetic transport timeout');
    }
    return ['status' => curl_getinfo($handle, CURLINFO_RESPONSE_CODE), 'body' => $response];
};
Dekoray\Leads\verifyConsent($config, realpath($_SERVER['DOCUMENT_ROOT']));
$ledger = new Dekoray\Leads\Ledger($config['ledgerPath'], $config['hashKey'], 90);
$provider = new Dekoray\Leads\MoySklad($config, $transport);
$log = static fn (string $code) => error_log('[fixture] ' . $code);
if ($retry) {
    Dekoray\Leads\leadHeaders();
    Dekoray\Leads\reply(200, Dekoray\Leads\retryPendingLeads($config, $ledger, $provider, $log));
    return true;
}
Dekoray\Leads\serveLead($config, $ledger, $provider, $log);
