<?php
declare(strict_types=1);

namespace Dekoray\Leads;

use JsonException;
use Throwable;

const JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR;

function reply(int $status, ?array $payload = null): void
{
    http_response_code($status);
    if ($payload !== null) {
        echo json_encode($payload, JSON_FLAGS);
    }
}

function leadHeaders(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('Vary: Origin');
    header('X-Content-Type-Options: nosniff');
}

function readLeadBody(): mixed
{
    $length = $_SERVER['CONTENT_LENGTH'] ?? '';
    if ($length !== '' && (!preg_match('/^[0-9]+$/D', $length) || (int) $length > MAX_BODY_BYTES)) {
        throw new LeadError(413, 'body_too_large');
    }
    $body = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
    if (!is_string($body)) {
        throw new LeadError(400, 'invalid_request');
    }
    if (strlen($body) > MAX_BODY_BYTES) {
        throw new LeadError(413, 'body_too_large');
    }
    try {
        return json_decode($body, false, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new LeadError(400, 'invalid_json');
    }
}

function serveLead(array $config, Ledger $ledger, MoySklad $crm, callable $log): void
{
    leadHeaders();
    $operation = null;
    try {
        if (($_SERVER['REQUEST_URI'] ?? '') !== '/api/lead') {
            throw new LeadError(404, 'not_found');
        }
        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
        if ($origin !== null && $origin !== $config['origin']) {
            throw new LeadError(403, 'origin_denied');
        }
        $method = $_SERVER['REQUEST_METHOD'] ?? '';
        if ($origin === $config['origin']) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Idempotency-Key');
        }
        if ($method === 'OPTIONS') {
            if ($origin === null) {
                throw new LeadError(403, 'origin_denied');
            }
            reply(204);
            return;
        }
        if ($method === 'GET') {
            reply(200, ['status' => 'ready', 'consentPath' => $config['consentPath'], 'consentVersion' => $config['consentVersion'],
                'cart' => $config['catalog'] !== [], 'intents' => LEAD_INTENTS]);
            return;
        }
        if ($method !== 'POST') {
            header('Allow: GET, POST, OPTIONS');
            throw new LeadError(405, 'method_not_allowed');
        }
        if ($origin !== $config['origin'] ||
            (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && $_SERVER['HTTP_SEC_FETCH_SITE'] !== 'same-origin')) {
            throw new LeadError(403, 'origin_denied');
        }
        if (!preg_match('~^application/json(?:\s*;.*)?$~iD', $_SERVER['CONTENT_TYPE'] ?? '')) {
            throw new LeadError(415, 'json_required');
        }
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $ledger->consumeRate(filter_var($ip, FILTER_VALIDATE_IP) ? $ip : 'unknown');
        $key = $_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '';
        if (!preg_match(UUID, $key)) {
            throw new LeadError(400, 'idempotency_key_required');
        }
        $lead = validateLead(readLeadBody(), $config);
        $context = [
            'organizationId' => $config['organizationId'], 'intakeStateId' => $config['intakeStateId'],
            'items' => array_map(static fn (array $item): array => $config['catalog'][$item['id']], $lead['items']),
        ];
        $fingerprint = digest($config['hashKey'], 'payload', json_encode([$lead, $context], JSON_FLAGS));
        $operation = $ledger->reserve($key, $fingerprint, $config['consentVersion']);
        if ($operation['receiptId'] !== null) {
            reply(200, ['status' => 'accepted', 'requestId' => $operation['receiptId']]);
            return;
        }
        $requestId = $crm->submit($lead, $operation);
        $ledger->finish($operation, $requestId);
        $log('accepted');
        reply(201, ['status' => 'accepted', 'requestId' => $requestId]);
    } catch (Throwable $error) {
        if (($operation['lease'] ?? 0) > 0) {
            try {
                $ledger->release($operation);
            } catch (Throwable) {
                $log('ledger_release_failed');
            }
        }
        if ($error instanceof LeadError && $error->status < 500) {
            if ($error->status === 429) {
                header('Retry-After: 60');
            }
            reply($error->status, ['error' => $error->errorCode]);
            return;
        }
        $log($error instanceof LeadError ? $error->errorCode : 'request_failed');
        reply(503, ['error' => 'temporarily_unavailable']);
    }
}
