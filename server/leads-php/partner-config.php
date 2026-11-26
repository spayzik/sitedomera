<?php
declare(strict_types=1);

namespace Dekoray\Partners;

use Dekoray\Leads\LeadError;
use function Dekoray\Leads\insidePath;
use function Dekoray\Leads\readObject;
use function Dekoray\Leads\verifyConsent;
use const Dekoray\Leads\DOCUMENT_PATH;
use const Dekoray\Leads\SITE_ORIGIN;

const PARTNER_PROGRAMS = ['wholesale', 'dealer', 'designer', 'agent', 'dropshipping_resale', 'dropshipping_referral'];

function partnerUnavailable(): LeadError
{
    return new LeadError(503, 'partners_unavailable');
}

function loadPartnerConfig(string $private, string $webroot): array
{
    $privateRoot = realpath($private);
    $web = realpath($webroot);
    if (PHP_VERSION_ID < 80300 || !extension_loaded('pdo_sqlite') || !extension_loaded('openssl') ||
        !extension_loaded('mbstring') || !$privateRoot || !$web ||
        insidePath($privateRoot, dirname($web)) || insidePath($web, $privateRoot)) {
        throw partnerUnavailable();
    }
    $configPath = $privateRoot . '/partners.json';
    $state = $privateRoot . '/state';
    $database = $state . '/partners.sqlite';
    $catalogPath = $privateRoot . '/catalog-contract.json';
    foreach ([$privateRoot, $configPath, $state, $database, $database . '-wal', $database . '-shm',
        $database . '-journal', $catalogPath] as $path) {
        if (is_link($path) || (DIRECTORY_SEPARATOR === '/' && file_exists($path) &&
            (fileperms($path) & 0077) !== 0)) {
            throw partnerUnavailable();
        }
    }
    if (!is_file($configPath) || !is_dir($state) || !is_writable($state)) {
        throw partnerUnavailable();
    }
    $settings = readObject($configPath);
    $local = ($settings['localTest'] ?? null) === true;
    $origin = $settings['origin'] ?? null;
    if (($settings['enabled'] ?? false) !== true || !is_string($origin) ||
        ($local ? !preg_match('~\Ahttp://127\.0\.0\.1:[0-9]{4,5}\z~D', $origin) : $origin !== SITE_ORIGIN) ||
        !is_string($settings['key'] ?? null) || !preg_match('~\A[a-f0-9]{64}\z~D', $settings['key']) ||
        !is_string($settings['consentVersion'] ?? null) ||
        !preg_match('~\A[A-Za-z0-9._-]{3,80}\z~D', $settings['consentVersion'])) {
        throw partnerUnavailable();
    }
    $attribution = $settings['attribution'] ?? null;
    if ($attribution !== null && (!$attribution instanceof \stdClass ||
        !is_string($attribution->version ?? null) ||
        !preg_match('~\A[A-Za-z0-9._-]{3,80}\z~D', $attribution->version) ||
        !(is_int($attribution->ttlDays ?? null) && $attribution->ttlDays >= 1 && $attribution->ttlDays <= 3650) ||
        !in_array($attribution->priority ?? null, ['first_confirmed', 'manager_conflict'], true))) {
        throw partnerUnavailable();
    }
    $consentPath = $local ? '/privacy/' : ($settings['consentPath'] ?? null);
    if (!$local) {
        $consentSha = $settings['consentSha256'] ?? null;
        if (!extension_loaded('dom') || !is_string($consentPath) || !preg_match(DOCUMENT_PATH, $consentPath) ||
            !is_string($consentSha) || !preg_match('~\A[a-f0-9]{64}\z~D', $consentSha)) {
            throw partnerUnavailable();
        }
        verifyConsent(['consentPath' => $consentPath, 'consentVersion' => $settings['consentVersion'],
            'consentSha256' => $consentSha], $web);
    }
    $catalog = readObject($catalogPath);
    $paymentName = $local ? 'payments-sandbox.sqlite' : 'payments-production.sqlite';
    $payment = $state . '/' . $paymentName;
    foreach ([$payment, $payment . '-wal', $payment . '-shm', $payment . '-journal'] as $path) {
        if (is_link($path) || (DIRECTORY_SEPARATOR === '/' && file_exists($path) &&
            (fileperms($path) & 0077) !== 0)) {
            throw partnerUnavailable();
        }
    }
    return ['origin' => $origin, 'localTest' => $local, 'key' => $settings['key'],
        'consentPath' => $consentPath, 'consentVersion' => $settings['consentVersion'], 'catalog' => $catalog,
        'attribution' => $attribution ? (array) $attribution : null,
        'database' => $database, 'payment' => is_file($payment) ? $payment : null];
}
