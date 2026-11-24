<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
ini_set('display_errors', '0');
ini_set('zend.exception_ignore_args', '1');
umask(0077);
require __DIR__ . '/payment-bootstrap.php';

try {
    if ($argc !== 4 || !in_array($argv[1], ['issue', 'reconcile'], true) || !is_dir($argv[2])) {
        throw new RuntimeException('usage');
    }
    $config = Dekoray\Payments\loadPaymentConfig(__DIR__, $argv[2], $argv[3]);
    $ledger = new Dekoray\Payments\PaymentLedger($config['ledgerPath'], $config['key']);
    $service = Dekoray\Payments\paymentService($config, $ledger);
    if ($argv[1] === 'issue') {
        // A private, validated order arrives on stdin so contact and order never appear in process args.
        $input = stream_get_contents(STDIN, 16385);
        if (!is_string($input) || strlen($input) > 16384) {
            throw new Dekoray\Leads\LeadError(422, 'invalid_quote');
        }
        $issued = $service->issue(json_decode($input, false, 32, JSON_THROW_ON_ERROR));
        $link = $config['returnUrl'] . '=' . $issued['token'];
        unset($issued['token']);
        $result = $issued + ['url' => $link];
    } else {
        $result = $service->reconcile();
    }
    fwrite(STDOUT, json_encode($result, Dekoray\Leads\JSON_FLAGS) . PHP_EOL);
    if ($argv[1] === 'reconcile' && ($result['unavailable'] > 0 || $result['receiptAttention'] > 0)) {
        exit(3);
    }
} catch (Throwable $error) {
    $code = $error instanceof Dekoray\Leads\LeadError ? $error->errorCode : 'checkout_unavailable';
    fwrite(STDERR, '[dekoray-payments] ' . $code . PHP_EOL);
    exit(1);
}
