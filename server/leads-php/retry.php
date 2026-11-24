<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
if (($argv[2] ?? '') !== '--deliver') {
    fwrite(STDERR, "delivery_mode_required\n");
    exit(1);
}

ini_set('display_errors', '0');
ini_set('zend.exception_ignore_args', '1');
umask(0077);

require __DIR__ . '/bootstrap.php';
try {
    $webroot = realpath($argv[1] ?? '');
    if ($webroot === false) {
        throw new RuntimeException('hosting_verification_pending');
    }
    $config = Dekoray\Leads\loadConfig(__DIR__, $webroot);
    if (!$config['enabled']) {
        throw new RuntimeException('intake_disabled');
    }
    Dekoray\Leads\verifyConsent($config, $webroot);
    $ledger = new Dekoray\Leads\Ledger($config['ledgerPath'], $config['hashKey'], $config['retentionDays']);
    $provider = new Dekoray\Leads\MoySklad($config);
    $result = Dekoray\Leads\retryPendingLeads($config, $ledger, $provider, static fn (string $code) => error_log('[dekoray-leads] ' . $code));
    echo json_encode($result, JSON_THROW_ON_ERROR) . PHP_EOL;
} catch (Throwable) {
    fwrite(STDERR, "delivery_unavailable\n");
    exit(1);
}
