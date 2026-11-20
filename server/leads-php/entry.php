<?php
declare(strict_types=1);

// Public entry: place only this file in webroot/api/lead.php.
ini_set('display_errors', '0');
ini_set('zend.exception_ignore_args', '1');
umask(0077);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Vary: Origin');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_URI'] ?? '') !== '/api/lead') {
    http_response_code(404);
    echo '{"error":"not_found"}';
    return;
}

if (strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'xn--80ahdrdyo.xn--p1ai' ||
    ($_SERVER['HTTPS'] ?? '') !== 'on') {
    http_response_code(403);
    echo '{"error":"origin_denied"}';
    return;
}

try {
    $webroot = realpath(__DIR__ . '/..');
    $private = realpath(dirname($webroot, 2) . '/dekoray-leads');
    if (!$private || $private !== dirname($webroot, 2) . DIRECTORY_SEPARATOR . 'dekoray-leads') {
        throw new RuntimeException('private_directory_invalid');
    }
    require $private . '/bootstrap.php';
    $config = Dekoray\Leads\loadConfig($private, $webroot);
    if (!$config['enabled']) {
        throw new RuntimeException('intake_disabled');
    }
    Dekoray\Leads\verifyConsent($config, $webroot);
    Dekoray\Leads\serveLead(
        $config, new Dekoray\Leads\Ledger($config['ledgerPath'], $config['hashKey'], $config['retentionDays']),
        new Dekoray\Leads\MoySklad($config), static fn (string $code) => error_log('[dekoray-leads] ' . $code),
    );
} catch (Throwable) {
    error_log('[dekoray-leads] intake_unavailable');
    http_response_code(503);
    echo '{"error":"temporarily_unavailable"}';
}
