<?php
declare(strict_types=1);

// Publish as api/partners.php behind the exact /api/partners rewrite.
ini_set('display_errors', '0');
ini_set('zend.exception_ignore_args', '1');
umask(0077);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_URI'] ?? '') !== '/api/partners') {
    http_response_code(404);
    echo '{"error":"not_found"}';
    return;
}
try {
    $webroot = realpath(__DIR__ . '/..');
    $expected = $webroot ? dirname($webroot, 2) . DIRECTORY_SEPARATOR . 'dekoray-leads' : '';
    $private = $expected !== '' ? realpath($expected) : false;
    if (!$private || $private !== $expected || is_link($expected) ||
        (DIRECTORY_SEPARATOR === '/' && (fileperms($private) & 0077) !== 0)) {
        throw new RuntimeException('private_directory_invalid');
    }
    foreach (['bootstrap.php','validation.php','config.php','ledger.php','moysklad.php','http.php',
        'partner-bootstrap.php','partner-config.php','partner-store.php','partner-http.php','reconcile-partner-sales.php'] as $file) {
        $module = $private . '/' . $file;
        if (!is_file($module) || is_link($module) ||
            (DIRECTORY_SEPARATOR === '/' && (fileperms($module) & 0022) !== 0)) {
            throw new RuntimeException('private_runtime_invalid');
        }
    }
    require $private . '/partner-bootstrap.php';
    $config = Dekoray\Partners\loadPartnerConfig($private, $webroot);
    $host = parse_url($config['origin'], PHP_URL_HOST);
    $hostPort = parse_url($config['origin'], PHP_URL_PORT);
    if ($hostPort !== null) {
        $host .= ':' . $hostPort;
    }
    $allowedScheme = $config['localTest']
        ? PHP_SAPI === 'cli-server' && ($_SERVER['REMOTE_ADDR'] ?? '') === '127.0.0.1'
        : ($_SERVER['HTTPS'] ?? '') === 'on';
    if (!$allowedScheme || ($_SERVER['HTTP_HOST'] ?? '') !== $host) {
        http_response_code(403);
        echo '{"error":"origin_denied"}';
        return;
    }
    Dekoray\Partners\servePartners($config, new Dekoray\Partners\PartnerStore($config));
} catch (Throwable) {
    http_response_code(503);
    echo '{"error":"partners_unavailable"}';
}
