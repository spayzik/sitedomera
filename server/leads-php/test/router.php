<?php
declare(strict_types=1);

// PHP CLI-server test fixture only. Never include this router in the release.
if (PHP_SAPI !== 'cli-server') {
    http_response_code(404);
    exit;
}
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) !== '/api/lead') {
    return false;
}
require dirname(__DIR__) . '/bootstrap.php';

$config = json_decode(getenv('DEKORAY_FIXTURE_CONFIG'), true, flags: JSON_THROW_ON_ERROR);
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
Dekoray\Leads\serveLead($config, new Dekoray\Leads\Ledger($config['ledgerPath'], $config['hashKey'], 90),
    new Dekoray\Leads\MoySklad($config, $transport), static fn (string $code) => error_log('[fixture] ' . $code));
