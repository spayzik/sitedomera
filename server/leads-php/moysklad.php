<?php
declare(strict_types=1);

namespace Dekoray\Leads;

use Closure;
use stdClass;
use Throwable;

final class MoySklad
{
    private const BASE = 'https://api.moysklad.ru/api/remap/1.2/entity';
    private const MAX_RESPONSE_BYTES = 1024 * 1024;
    private const SUBJECTS = [
        'consultation' => 'Консультация по материалам',
        'selection' => 'Подбор материалов',
        'calculation' => 'Расчёт материалов',
        'samples' => 'Запрос образцов',
        'order' => 'Запрос заказа',
        'installation' => 'Монтаж и замер',
        'delivery' => 'Уточнение доставки',
        'wholesale' => 'Оптовые условия',
        'designer' => 'Условия для дизайнеров',
        'feedback' => 'Обратная связь',
    ];

    private readonly Closure $transport;

    /**
     * Only the local test harness can provide a transport. Production always uses the fixed HTTPS origin.
     *
     * @param null|callable(string, string, ?array): array{status: int, body: string} $transport
     */
    public function __construct(private readonly array $config, ?callable $transport = null)
    {
        $this->transport = $transport === null ? $this->curl(...) : Closure::fromCallable($transport);
    }

    /** The ledger's key and consent timestamp are stable across attempts. */
    public function submit(array $lead, array $operation): string
    {
        $orderSyncId = syncId($this->config['hashKey'], 'customerorder', $operation['key']);
        $order = [
            'organization' => self::reference('organization', $this->config['organizationId']),
            'agent' => self::reference('counterparty', $this->config['intakeAgentId']),
            'state' => self::reference('state', $this->config['intakeStateId'], 'customerorder/metadata/states'),
            'syncId' => $orderSyncId,
            'applicable' => false,
            'description' => $this->description($lead, $operation['consentAt']),
        ];
        if (!isset($lead['intent'])) {
            $order['positions'] = [];
            foreach ($lead['items'] as $item) {
                $mapped = $this->config['catalog'][$item['id']];
                $order['positions'][] = [
                    'assortment' => self::reference($mapped['type'], $mapped['id']),
                    'quantity' => $item['qty'],
                    'price' => $mapped['priceMinor'],
                ];
            }
        }

        // The approved account and intake state must have no reserve, payment or fulfillment automations.
        $accepted = $this->request('customerorder', $order);
        if (!self::isEntity($accepted, 'customerorder') || ($accepted->syncId ?? null) !== $orderSyncId
            || ($accepted->applicable ?? null) !== false) {
            throw self::unavailable();
        }
        return $accepted->id;
    }

    /** Read-only access check for a fully configured intake. */
    public function preflight(): array
    {
        $organizationId = $this->config['organizationId'];
        $organization = $this->request('organization/' . $organizationId);
        if (!self::isEntity($organization, 'organization') || $organization->id !== $organizationId
            || ($organization->archived ?? false) === true) {
            throw self::unavailable();
        }

        $agentId = $this->config['intakeAgentId'];
        $agent = $this->request('counterparty/' . $agentId);
        if (!self::isEntity($agent, 'counterparty') || $agent->id !== $agentId ||
            ($agent->archived ?? false) === true) {
            throw new LeadError(503, 'intake_agent_invalid');
        }

        $metadata = $this->request('customerorder/metadata');
        $found = false;
        foreach ($this->rows($metadata, 'states') as $state) {
            if (self::isEntity($state, 'state') && $state->id === $this->config['intakeStateId']) {
                $found = true;
                break;
            }
        }
        if (!$found) {
            throw new LeadError(503, 'intake_state_not_found');
        }

        $seen = [];
        $units = [];
        foreach ($this->config['catalog'] as $mapped) {
            $entity = $this->request($mapped['type'] . '/' . $mapped['id']);
            if (!self::isEntity($entity, $mapped['type']) || $entity->id !== $mapped['id']
                || ($entity->archived ?? false) === true) {
                throw new LeadError(503, 'mapped_product_invalid');
            }
            $sellable = $entity;
            if ($mapped['type'] === 'variant' && !isset($entity->uom)) {
                $parent = self::referenceId($entity->product ?? null, 'product');
                $sellable = $this->request('product/' . $parent);
                if (!self::isEntity($sellable, 'product') || $sellable->id !== $parent ||
                    ($sellable->archived ?? false) === true) {
                    throw new LeadError(503, 'mapped_product_invalid');
                }
            }
            $uomId = self::referenceId($sellable->uom ?? null, 'uom');
            if ($uomId !== $mapped['uomId']) {
                throw new LeadError(503, 'mapped_unit_invalid');
            }
            if (!isset($units[$uomId])) {
                $unit = $this->request('uom/' . $uomId);
                if (!self::isEntity($unit, 'uom') || $unit->id !== $uomId) {
                    throw new LeadError(503, 'mapped_unit_invalid');
                }
                $units[$uomId] = true;
            }
            $seen[$mapped['id']] = true;
        }
        return ['organization' => 'visible', 'intakeState' => 'visible', 'intakeAgent' => 'visible', 'mappedProducts' => count($seen),
            'verifiedUnitReferences' => count($units)];
    }

    private static function referenceId(mixed $reference, string $type): string
    {
        $href = $reference->meta->href ?? null;
        $prefix = self::BASE . '/' . $type . '/';
        $id = is_string($href) && str_starts_with($href, $prefix) ? substr($href, strlen($prefix)) : '';
        if (($reference->meta->type ?? '') !== $type || preg_match(UUID, $id) !== 1) {
            throw new LeadError(503, 'mapped_reference_invalid');
        }
        return $id;
    }

    /** The report exposes visibility and counts, never CRM records or credentials. */
    public function accessPreflight(): array
    {
        $organizations = $this->rows($this->request('organization?limit=1'), 'rows');
        $states = $this->rows($this->request('customerorder/metadata'), 'states');
        $assortment = $this->rows($this->request('assortment?limit=1'), 'rows');
        return [
            'organizationVisible' => count($organizations) > 0,
            'intakeStatesVisible' => count($states),
            'assortmentVisible' => count($assortment) > 0,
            'writeAccess' => 'not_verified',
        ];
    }

    private function description(array $lead, int $consentAt): string
    {
        $lines = ['Запрос с сайта ДЕКОРАЙ. Наличие, цены и условия уточняются менеджером.'];
        if (isset($lead['intent'])) {
            $lines[] = 'Тема: ' . self::SUBJECTS[$lead['intent']];
        }
        if (($lead['context'] ?? '') !== '') {
            $lines[] = 'Контекст клиента: ' . $lead['context'];
        }
        foreach (($lead['intent'] ?? null) === null ? [] : $lead['items'] as $item) {
            $lines[] = 'Материал: ' . $this->itemLabel($item['id']) . ' — ' . $item['qty'];
        }
        $total = 0;
        foreach ($lead['calculation'] ?? [] as $group) {
            $walls = array_map(static fn (array $wall): string => $wall['length'] . ' × ' . $wall['height'], $group['walls']);
            $total += $group['qty'] * $group['priceMinor'];
            $lines[] = 'Расчёт: ' . $this->itemLabel($group['id']) . ' — ' .
                $group['qty'] . ' × ' . self::rubles($group['priceMinor']) .
                '; стены (м): ' . implode(', ', $walls) . '; проёмы: ' . $group['openings'] .
                ' м²; запас: ' . $group['reserve'] . '%; метод: ' .
                ($group['method'] === 'vertical' ? 'вертикальная раскладка' : 'по площади');
        }
        if ($total > 0) {
            $lines[] = 'Предварительная стоимость материалов: ' . self::rubles($total);
        }
        $lines[] = 'Имя для связи: ' . $lead['name'];
        $lines[] = 'Телефон: ' . $lead['phone'];
        if ($lead['email'] !== '') {
            $lines[] = 'Email: ' . $lead['email'];
        }
        if ($lead['comment'] !== '') {
            $lines[] = 'Комментарий: ' . $lead['comment'];
        }
        $timestamp = gmdate('Y-m-d\TH:i:s', intdiv($consentAt, 1000)) . sprintf('.%03dZ', $consentAt % 1000);
        $lines[] = 'Согласие: ' . $lead['version'] . ', ' . $timestamp;
        return implode("\n", $lines);
    }

    private function itemLabel(string $id): string
    {
        return $this->config['catalogFacts'][$id]['sku'] ?? $id;
    }

    private static function rubles(int $minor): string
    {
        return number_format($minor / 100, 2, ',', '') . ' ₽';
    }

    private function request(string $path, ?array $body = null): stdClass
    {
        try {
            $response = ($this->transport)(self::BASE . '/' . $path, $body === null ? 'GET' : 'POST', $body);
        } catch (Throwable) {
            throw self::unavailable();
        }
        $status = $response['status'] ?? null;
        if (!is_int($status) || $status < 100 || $status > 599) {
            throw self::unavailable();
        }
        if ($status < 200 || $status >= 300) {
            throw new LeadError(503, 'upstream_' . $status);
        }
        try {
            $raw = $response['body'] ?? null;
            if (!is_string($raw) || strlen($raw) > self::MAX_RESPONSE_BYTES) {
                throw self::unavailable();
            }
            $decoded = json_decode($raw, false, 64, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            throw self::unavailable();
        }
        if (!$decoded instanceof stdClass) {
            throw self::unavailable();
        }
        return $decoded;
    }

    private function curl(string $url, string $method, ?array $body): array
    {
        $handle = curl_init($url);
        if ($handle === false) {
            throw self::unavailable();
        }
        try {
            $headers = ['Authorization: Bearer ' . $this->config['token'], 'Accept: application/json;charset=utf-8'];
            $data = '';
            $remaining = self::MAX_RESPONSE_BYTES;
            $options = [
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_CONNECTTIMEOUT_MS => 1500,
                CURLOPT_TIMEOUT_MS => 4000,
                CURLOPT_ENCODING => 'gzip',
                CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$data, &$remaining): int {
                    $length = strlen($chunk);
                    if ($length > $remaining) {
                        return 0;
                    }
                    $data .= $chunk;
                    $remaining -= $length;
                    return $length;
                },
            ];
            if ($method === 'POST') {
                $headers[] = 'Content-Type: application/json;charset=utf-8';
                $options[CURLOPT_POST] = true;
                $options[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            }
            $options[CURLOPT_HTTPHEADER] = $headers;
            if (!curl_setopt_array($handle, $options) || curl_exec($handle) === false) {
                throw self::unavailable();
            }
            return ['status' => curl_getinfo($handle, CURLINFO_RESPONSE_CODE), 'body' => $data];
        } finally {
            curl_close($handle);
        }
    }

    private static function reference(string $type, string $id, ?string $path = null): array
    {
        return ['meta' => [
            'href' => self::BASE . '/' . ($path ?? $type) . '/' . $id,
            'type' => $type,
            'mediaType' => 'application/json',
        ]];
    }

    private function rows(stdClass $record, string $key): array
    {
        if (!is_array($record->{$key} ?? null)) {
            throw self::unavailable();
        }
        return $record->{$key};
    }

    private static function isEntity(mixed $value, string $type): bool
    {
        return $value instanceof stdClass && is_string($value->id ?? null)
            && preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iD', $value->id) === 1
            && ($value->meta->type ?? null) === $type;
    }

    private static function unavailable(): LeadError
    {
        return new LeadError(503, 'temporarily_unavailable');
    }
}
