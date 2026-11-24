<?php
declare(strict_types=1);

// Public entry for /api/payment and /api/payment/webhook. Install as api/payment.php.
ini_set('display_errors', '0');
ini_set('zend.exception_ignore_args', '1');
umask(0077);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('Vary: Origin');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('X-Content-Type-Options: nosniff');

if (!in_array($_SERVER['REQUEST_URI'] ?? '', ['/api/payment', '/api/payment/webhook'], true)) {
    http_response_code(404);
    echo '{"error":"not_found"}';
    return;
}
if (($_SERVER['HTTPS'] ?? '') !== 'on') {
    http_response_code(403);
    echo '{"error":"origin_denied"}';
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
    foreach (['bootstrap.php', 'config.php', 'validation.php', 'moysklad.php', 'ledger.php', 'http.php',
        'payment-bootstrap.php', 'payment-config.php', 'payment-ledger.php', 'payment-yookassa.php',
        'payment-service.php', 'payment-http.php'] as $file) {
        $module = $private . '/' . $file;
        if (!is_file($module) || is_link($module) ||
            (DIRECTORY_SEPARATOR === '/' && (fileperms($module) & 0022) !== 0)) {
            throw new RuntimeException('private_runtime_invalid');
        }
    }
    require $private . '/payment-bootstrap.php';
    $config = Dekoray\Payments\loadPaymentConfig($private, $webroot, strtolower($_SERVER['HTTP_HOST'] ?? ''));
    $ledger = new Dekoray\Payments\PaymentLedger($config['ledgerPath'], $config['key']);
    Dekoray\Payments\servePayment($config, $ledger, Dekoray\Payments\paymentService($config, $ledger));
} catch (Throwable) {
    http_response_code(503);
    echo '{"error":"checkout_unavailable"}';
}
