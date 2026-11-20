<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

ini_set('display_errors', '0');
ini_set('zend.exception_ignore_args', '1');
require __DIR__ . '/bootstrap.php';
try {
    $config = Dekoray\Leads\loadConfig(__DIR__, $argv[1] ?? '');
    $provider = new Dekoray\Leads\MoySklad($config);
    echo json_encode(['access' => $provider->accessPreflight(), 'mapping' => $provider->preflight()], JSON_THROW_ON_ERROR) . PHP_EOL;
} catch (Throwable) {
    fwrite(STDERR, "read_only_preflight_unavailable\n");
    exit(1);
}
