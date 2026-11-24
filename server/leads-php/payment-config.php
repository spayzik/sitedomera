<?php
declare(strict_types=1);

namespace Dekoray\Payments;

use Dekoray\Leads\LeadError;
use function Dekoray\Leads\insidePath;
use function Dekoray\Leads\loadConfig;
use function Dekoray\Leads\readObject;
use const Dekoray\Leads\SITE_HOST;
use const Dekoray\Leads\SITE_ORIGIN;
use const Dekoray\Leads\UUID;

const PREVIEW_ORIGIN = 'https://spayzik.github.io';
const PAYMENT_PATH = '/api/payment';
const PAYMENT_WEBHOOK = '/api/payment/webhook';
const RETURN_PATH = '/usloviya-priobreteniya/#oplata';
const PAYMENT_TOKEN = '~\A[a-f0-9]{64}\z~';
const DELIVERY_ID = '~\A[a-z0-9][a-z0-9-]{0,31}\z~';
const TEST_EMAIL = 'dekoray@example.test';
const MAX_TOTAL_MINOR = 350_000_00;

function checkoutUnavailable(): LeadError
{
    return new LeadError(503, 'checkout_unavailable');
}

function validInn(string $inn): bool
{
    $weights = match (strlen($inn)) {
        10 => [[2, 4, 10, 3, 5, 9, 4, 6, 8]],
        12 => [[7, 2, 4, 10, 3, 5, 9, 4, 6, 8], [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]],
        default => [],
    };
    if ($weights === [] || !ctype_digit($inn) || $inn[0] === '0' && $inn[1] === '0') {
        return false;
    }
    foreach ($weights as $factors) {
        $sum = 0;
        foreach ($factors as $index => $factor) {
            $sum += (int) $inn[$index] * $factor;
        }
        if (($sum % 11) % 10 !== (int) $inn[count($factors)]) {
            return false;
        }
    }
    return true;
}

function parsePaymentConfig(array $raw, string $host): array
{
    $mode = $raw['mode'] ?? null;
    $sandbox = $mode === 'sandbox';
    $shopId = $raw['shopId'] ?? '';
    $secret = $raw['secretKey'] ?? '';
    $key = $raw['key'] ?? '';
    $sellerInn = $raw['sellerInn'] ?? '';
    $sellerName = $raw['sellerName'] ?? '';
    if (($raw['enabled'] ?? false) !== true || !in_array($mode, ['production', 'sandbox'], true) ||
        ($raw['siteHost'] ?? '') !== $host ||
        ($sandbox ? ($host === SITE_HOST || !preg_match('~\A(?=.{1,253}\z)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\z~', $host)) : $host !== SITE_HOST) ||
        !is_string($shopId) || preg_match('~\A[0-9]{1,16}\z~', $shopId) !== 1 ||
        !is_string($secret) || preg_match($sandbox ? '~\Atest_[A-Za-z0-9_-]{20,120}\z~' : '~\Alive_[A-Za-z0-9_-]{20,120}\z~', $secret) !== 1 ||
        !is_string($key) || preg_match(PAYMENT_TOKEN, $key) !== 1 ||
        ($raw['holdPolicyVerified'] ?? false) !== true || ($raw['fiscalizationVerified'] ?? false) !== true ||
        ($raw['receiptScheme'] ?? '') !== 'full_payment' ||
        !is_string($sellerInn) || !validInn($sellerInn) || !validPaymentPublicText($sellerName, 140)) {
        throw checkoutUnavailable();
    }

    $vatBySku = $raw['vatBySku'] ?? null;
    $methods = $raw['deliveryMethods'] ?? null;
    if (!$vatBySku instanceof \stdClass || !$methods instanceof \stdClass || (array) $methods === []) {
        throw checkoutUnavailable();
    }
    foreach ((array) $vatBySku as $sku => $code) {
        if ($sku === '' || !validVatCode($code)) {
            throw checkoutUnavailable();
        }
    }

    $deliveryMethods = [];
    foreach ((array) $methods as $id => $method) {
        if (!preg_match(DELIVERY_ID, $id) || !$method instanceof \stdClass ||
            !validPaymentPublicText($method->label ?? null, 80) || !is_int($method->priceMinor ?? null) ||
            $method->priceMinor < 0 || $method->priceMinor > MAX_TOTAL_MINOR ||
            !validVatCode($method->vatCode ?? null)) {
            throw checkoutUnavailable();
        }
        $deliveryMethods[$id] = ['label' => $method->label, 'priceMinor' => $method->priceMinor, 'vatCode' => $method->vatCode];
        if (!$sandbox && $method->priceMinor > 0) {
            if (!is_string($method->crmServiceId ?? null) || !preg_match(UUID, $method->crmServiceId)) {
                throw checkoutUnavailable();
            }
            $deliveryMethods[$id]['crmServiceId'] = strtolower($method->crmServiceId);
        }
    }
    $origin = $sandbox ? PREVIEW_ORIGIN : SITE_ORIGIN;
    $config = compact('mode', 'shopId', 'secret', 'key', 'origin', 'deliveryMethods');
    $config['returnUrl'] = $origin . ($sandbox ? '/dekoray-preview' : '') . RETURN_PATH;
    $config['vatBySku'] = (array) $vatBySku;
    $config['receiptScheme'] = $raw['receiptScheme'];
    if (!$sandbox) {
        $config['saleStateId'] = $raw['saleStateId'] ?? '';
        $config['rubCurrencyId'] = $raw['rubCurrencyId'] ?? '';
        $config['moySkladReadToken'] = $raw['moySkladReadToken'] ?? '';
        if (!is_string($config['saleStateId']) || preg_match(UUID, $config['saleStateId']) !== 1 ||
            !is_string($config['rubCurrencyId']) || preg_match(UUID, $config['rubCurrencyId']) !== 1 ||
            !is_string($config['moySkladReadToken']) || preg_match('~\A[!-~]{20,300}\z~', $config['moySkladReadToken']) !== 1) {
            throw checkoutUnavailable();
        }
    }
    return $config;
}

function validPaymentPublicText(mixed $value, int $limit): bool
{
    return is_string($value) && $value === trim($value) && $value !== '' && strlen($value) <= $limit * 4 &&
        mb_strlen($value, 'UTF-8') <= $limit && preg_match('~[\x00-\x1F\x7F<>]~', $value) === 0;
}

function validVatCode(mixed $value): bool
{
    return is_int($value) && $value >= 1 && $value <= 12;
}

function loadPaymentConfig(string $private, string $webroot, string $host): array
{
    $root = realpath($webroot);
    $directory = realpath($private);
    if (PHP_VERSION_ID < 80300 || !$root || !$directory || !extension_loaded('curl') ||
        !extension_loaded('pdo_sqlite') || !extension_loaded('openssl') || !extension_loaded('mbstring') ||
        insidePath($directory, dirname($root)) || insidePath($root, $directory)) {
        throw checkoutUnavailable();
    }
    $staging = $host !== SITE_HOST;
    $name = $staging ? 'sandbox' : 'production';
    $paths = [
        'config' => $directory . '/payments-' . $name . '.json',
        'state' => $directory . '/state',
        'ledger' => $directory . '/state/payments-' . $name . '.sqlite',
    ];
    foreach ([$directory, $paths['config'], $paths['state'], $paths['ledger'], $paths['ledger'] . '-wal',
        $paths['ledger'] . '-shm', $paths['ledger'] . '-journal'] as $path) {
        if (is_link($path) || (DIRECTORY_SEPARATOR === '/' && file_exists($path) && (fileperms($path) & 0077) !== 0)) {
            throw checkoutUnavailable();
        }
    }
    if (!is_file($paths['config']) || !is_dir($paths['state']) || !is_writable($paths['state']) ||
        (file_exists($paths['ledger']) && !is_file($paths['ledger']))) {
        throw checkoutUnavailable();
    }
    $config = parsePaymentConfig(readObject($paths['config']), $host);
    $config['ledgerPath'] = $paths['ledger'];
    if ($staging) {
        $config['catalogFacts'] = array_map(static fn (object $item): array => (array) $item, readObject($directory . '/catalog-contract.json'));
        return $config;
    }
    // Reuse the existing confirmed product, organization, unit and price mappings.
    // Lead intake can stay disabled. Checkout needs only read-only credentials.
    $crm = loadConfig($directory, $root);
    if (hash_equals($crm['token'], $config['moySkladReadToken']) ||
        strtolower($crm['intakeStateId']) === strtolower($config['saleStateId']) || $crm['catalog'] === []) {
        throw checkoutUnavailable();
    }
    $config['catalogFacts'] = $crm['catalogFacts'];
    $config['crm'] = ['organizationId' => $crm['organizationId'], 'catalog' => $crm['catalog'],
        'token' => $config['moySkladReadToken']];
    unset($config['moySkladReadToken']);
    return $config;
}
