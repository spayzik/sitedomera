<?php
declare(strict_types=1);

namespace Dekoray\Payments;

use Closure;
use Dekoray\Leads\LeadError;
use Throwable;
use const Dekoray\Leads\JSON_FLAGS;
use const Dekoray\Leads\UUID;

function paymentAmount(int $minor): array
{
    return ['value' => sprintf('%d.%02d', intdiv($minor, 100), $minor % 100), 'currency' => 'RUB'];
}

function providerAmount(mixed $value): int
{
    if (!is_array($value) || ($value['currency'] ?? null) !== 'RUB' ||
        !is_string($value['value'] ?? null) || !preg_match('~\A([0-9]{1,8})\.([0-9]{2})\z~', $value['value'], $matches)) {
        throw new LeadError(503, 'provider_mismatch');
    }
    return (int) $matches[1] * 100 + (int) $matches[2];
}

final class YooKassa
{
    private const BASE = 'https://api.yookassa.ru/v3';
    private const MAX_RESPONSE_BYTES = 64 * 1024;
    private readonly Closure $transport;

    /** Test-only transport overrides performed in-process by the contract harness. */
    public function __construct(private readonly array $config, ?callable $transport = null)
    {
        $this->transport = $transport === null ? $this->curl(...) : Closure::fromCallable($transport);
    }

    public function create(string $key, array $body): array
    {
        // Check the authenticated shop before the first external write, even with a test-prefixed key.
        $shop = $this->call('GET', '/me');
        if (($shop['account_id'] ?? null) !== $this->config['shopId'] ||
            ($shop['test'] ?? null) !== ($this->config['mode'] === 'sandbox') || ($shop['status'] ?? null) !== 'enabled' ||
            ($this->config['mode'] === 'production' &&
                ($shop['fiscalization']['enabled'] ?? $shop['fiscalization_enabled'] ?? false) !== true)) {
            throw new LeadError(503, 'provider_mismatch');
        }
        return $this->call('POST', '/payments', $body, $key);
    }

    public function payment(string $id): array
    {
        return $this->read('/payments/', $id);
    }

    public function refund(string $id): array
    {
        return $this->read('/refunds/', $id);
    }

    private function read(string $resource, string $id): array
    {
        if (preg_match(UUID, $id) !== 1) {
            throw new LeadError(400, 'invalid_request');
        }
        $result = $this->call('GET', $resource . $id);
        if (($result['id'] ?? null) !== $id) {
            throw new LeadError(503, 'provider_mismatch');
        }
        return $result;
    }

    private function call(string $method, string $path, ?array $body = null, ?string $key = null): array
    {
        try {
            $result = ($this->transport)($method, $path, $body, $key);
            if (!is_array($result) || array_is_list($result)) {
                throw new \RuntimeException('invalid_response');
            }
            return $result;
        } catch (Throwable) {
            throw new LeadError(503, 'provider_unavailable');
        }
    }

    private function curl(string $method, string $path, ?array $body, ?string $key): array
    {
        $handle = curl_init(self::BASE . $path);
        if ($handle === false) {
            throw new \RuntimeException('transport_unavailable');
        }
        $buffer = '';
        $headers = ['Accept: application/json'];
        if ($key !== null) {
            $headers[] = 'Idempotence-Key: ' . $key;
            $headers[] = 'Content-Type: application/json';
        }
        try {
            curl_setopt_array($handle, [
                CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
                CURLOPT_USERNAME => $this->config['shopId'], CURLOPT_PASSWORD => $this->config['secret'],
                CURLOPT_HTTPHEADER => $headers, CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_CONNECTTIMEOUT_MS => 1000, CURLOPT_TIMEOUT_MS => 3500,
                CURLOPT_WRITEFUNCTION => static function ($handle, string $data) use (&$buffer): int {
                    if (strlen($buffer) + strlen($data) > self::MAX_RESPONSE_BYTES) {
                        return 0;
                    }
                    $buffer .= $data;
                    return strlen($data);
                },
            ]);
            if ($body !== null) {
                curl_setopt($handle, CURLOPT_POSTFIELDS, json_encode($body, JSON_FLAGS));
            }
            if (curl_exec($handle) === false || !in_array(curl_getinfo($handle, CURLINFO_RESPONSE_CODE), [200, 201], true)) {
                throw new \RuntimeException('transport_failed');
            }
            return json_decode($buffer, true, 32, JSON_THROW_ON_ERROR);
        } finally {
            curl_close($handle);
        }
    }
}
