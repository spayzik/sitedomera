<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
ini_set('display_errors', '0');
ini_set('zend.exception_ignore_args', '1');
umask(0077);
require __DIR__ . '/partner-bootstrap.php';

try {
    if ($argc !== 3 || $argv[1] !== 'provision' || !is_dir($argv[2])) {
        throw new RuntimeException('usage');
    }
    $input = stream_get_contents(STDIN, 4097);
    if (!is_string($input) || strlen($input) > 4096) {
        throw new RuntimeException('invalid_request');
    }
    $body = json_decode($input, false, 10, JSON_THROW_ON_ERROR);
    $store = new Dekoray\Partners\PartnerStore(Dekoray\Partners\loadPartnerConfig(__DIR__, $argv[2]));
    $result = $store->provision($body->email ?? null, $body->password ?? null, $body->role ?? null, $body->partnerId ?? null);
    fwrite(STDOUT, json_encode($result, Dekoray\Leads\JSON_FLAGS) . PHP_EOL);
} catch (Throwable $error) {
    fwrite(STDERR, '[dekoray-partners] ' . ($error instanceof Dekoray\Leads\LeadError ? $error->errorCode : 'operation_failed') . PHP_EOL);
    exit(1);
}
