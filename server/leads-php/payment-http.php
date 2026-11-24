<?php
declare(strict_types=1);

namespace Dekoray\Payments;

use Dekoray\Leads\LeadError;
use Dekoray\Leads\MoySklad;
use Throwable;
use function Dekoray\Leads\hasOnlyFields;
use function Dekoray\Leads\leadHeaders;
use function Dekoray\Leads\readLeadBody;
use function Dekoray\Leads\reply;

function paymentHeaders(): void
{
    leadHeaders();
    header('Referrer-Policy: no-referrer');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
}

function paymentService(array $config, PaymentLedger $ledger): PaymentService
{
    return new PaymentService($config, $ledger, new YooKassa($config),
        isset($config['crm']) ? new MoySklad($config['crm']) : null);
}

function servePayment(array $config, PaymentLedger $ledger, PaymentService $service): void
{
    paymentHeaders();
    try {
        $path = $_SERVER['REQUEST_URI'] ?? '';
        $method = $_SERVER['REQUEST_METHOD'] ?? '';
        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
        $webhook = $path === PAYMENT_WEBHOOK;
        if (!$webhook && $path !== PAYMENT_PATH) {
            throw new LeadError(404, 'not_found');
        }
        if (($webhook && $origin !== null) || (!$webhook && $origin !== null && $origin !== $config['origin'])) {
            throw new LeadError(403, 'origin_denied');
        }
        if (!$webhook && $origin === $config['origin']) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
        }
        if (!$webhook && $method === 'OPTIONS' && $origin === $config['origin']) {
            reply(204);
            return;
        }
        if (!$webhook && $method === 'GET') {
            reply(200, ['status' => 'ready', 'mode' => $config['mode']]);
            return;
        }
        if ($method !== 'POST') {
            header('Allow: ' . ($webhook ? 'POST' : 'GET, POST, OPTIONS'));
            throw new LeadError(405, 'method_not_allowed');
        }
        if (!$webhook && ($origin !== $config['origin'] ||
            ($config['mode'] === 'production' && isset($_SERVER['HTTP_SEC_FETCH_SITE']) && $_SERVER['HTTP_SEC_FETCH_SITE'] !== 'same-origin'))) {
            throw new LeadError(403, 'origin_denied');
        }
        if (!preg_match('~\Aapplication/json(?:\s*;.*)?\z~i', $_SERVER['CONTENT_TYPE'] ?? '')) {
            throw new LeadError(415, 'json_required');
        }
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $ledger->consumeRate($webhook ? 'notify' : 'browser', filter_var($ip, FILTER_VALIDATE_IP) ? $ip : 'unknown');
        if ($webhook) {
            $service->notify(readLeadBody());
            reply(200);
            return;
        }
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('~\ABearer ([a-f0-9]{64})\z~', $authorization, $token)) {
            throw new LeadError(401, 'payment_access_required');
        }
        $body = readLeadBody();
        if (!hasOnlyFields($body, ['action', 'deliveryId']) ||
            !in_array($body->action ?? null, ['quote', 'start', 'status'], true) ||
            (isset($body->deliveryId) && (!is_string($body->deliveryId) || !preg_match(DELIVERY_ID, $body->deliveryId)))) {
            throw new LeadError(422, 'invalid_request');
        }
        reply(200, $service->respond($token[1], $body->action, $body->deliveryId ?? null));
    } catch (Throwable $error) {
        if ($error instanceof LeadError && $error->status < 500) {
            if ($error->status === 429) {
                header('Retry-After: 60');
            }
            reply($error->status, ['error' => $error->errorCode]);
            return;
        }
        error_log('[dekoray-payments] ' . ($error instanceof LeadError ? $error->errorCode : 'request_failed'));
        reply(503, ['error' => 'checkout_unavailable']);
    }
}
