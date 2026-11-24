<?php
declare(strict_types=1);

// Install as webroot/api/commerce.php. The published state is outside webroot.
ini_set('display_errors', '0');

$request = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$targets = ['/yml.xml' => 'search', '/yml-direct.xml' => 'direct', '/generated/commerce.json' => 'status'];
$target = $targets[$request ?? ''] ?? null;
if ($target === null) {
    http_response_code(404);
    return;
}
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method !== 'GET' && $method !== 'HEAD') {
    header('Allow: GET, HEAD');
    http_response_code(405);
    return;
}

$webroot = dirname(__DIR__);
$parent = realpath(dirname($webroot, 2));
$private = $parent === false ? null : $parent . DIRECTORY_SEPARATOR . 'dekoray-leads';
$stateFile = $private . DIRECTORY_SEPARATOR . 'commerce-state.json';
$state = null;
if ($private !== null && realpath($private) === $private && is_file($stateFile) && !is_link($stateFile) &&
    (DIRECTORY_SEPARATOR !== '/' || ((fileperms($private) | fileperms($stateFile)) & 0077) === 0)) {
    $raw = @file_get_contents($stateFile, false, null, 0, 524288);
    $state = is_string($raw) ? json_decode($raw, true, 10) : null;
}

$updatedAt = is_array($state) ? ($state['updatedAt'] ?? null) : null;
$stamp = is_string($updatedAt) ? DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s.v\Z', $updatedAt, new DateTimeZone('UTC')) : false;
$now = time();
$valid = is_array($state) && ($state['version'] ?? null) === 1 &&
    $stamp && $stamp->format('Y-m-d\TH:i:s.v\Z') === $updatedAt &&
    $stamp->getTimestamp() <= $now + 120 && $stamp->getTimestamp() + 2700 > $now &&
    is_array($state['saleable'] ?? null) && array_is_list($state['saleable']) &&
    is_string($state['search'] ?? null) && is_string($state['direct'] ?? null) &&
    is_string($state['inventoryDigest'] ?? null) &&
    $state['inventoryDigest'] === @hash_file('sha256', $webroot . '/generated/inventory.json') &&
    is_string($state['catalogDigest'] ?? null) &&
    $state['catalogDigest'] === @hash_file('sha256', $webroot . '/yml-direct.xml');

if ($target === 'status') {
    header('Content-Type: application/json; charset=utf-8');
    if ($method === 'GET') echo json_encode($valid ? ['updatedAt' => $updatedAt, 'saleable' => $state['saleable']] : null);
    return;
}

header('Content-Type: application/xml; charset=utf-8');
$body = $valid ? $state[$target] : @file_get_contents($webroot . ($target === 'search' ? '/yml.xml' : '/yml-direct.xml'));
if (!is_string($body)) {
    http_response_code(503);
    return;
}
if ($method === 'GET') echo $body;
