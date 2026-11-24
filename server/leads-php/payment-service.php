<?php
declare(strict_types=1);

namespace Dekoray\Payments;

use Dekoray\Leads\LeadError;
use Dekoray\Leads\MoySklad;
use stdClass;
use Throwable;
use function Dekoray\Leads\hasOnlyFields;
use function Dekoray\Leads\syncId;
use const Dekoray\Leads\UUID;

final class PaymentService
{
    public function __construct(private readonly array $config, private readonly PaymentLedger $ledger,
        private readonly YooKassa $provider, private readonly ?MoySklad $crm = null)
    {
    }

    /** Called only by a private issuer after the order, items and delivery have been confirmed. */
    public function issue(mixed $request): array
    {
        $now = time();
        if (!hasOnlyFields($request, ['mode', 'crmOrderId', 'items', 'deliveryId', 'receiptEmail', 'expiresAt']) ||
            !in_array($request->mode ?? null, ['instant', 'manager'], true) ||
            !is_string($request->crmOrderId ?? null) || preg_match(UUID, $request->crmOrderId) !== 1 ||
            !is_array($request->items ?? null) || count($request->items) < 1 || count($request->items) > 45 ||
            !is_string($request->deliveryId ?? null) || !isset($this->config['deliveryMethods'][$request->deliveryId]) ||
            !is_string($request->receiptEmail ?? null) || strlen($request->receiptEmail) > 254 ||
            !filter_var($request->receiptEmail, FILTER_VALIDATE_EMAIL) ||
            ($this->config['mode'] === 'sandbox' && $request->receiptEmail !== TEST_EMAIL) ||
            !is_int($request->expiresAt ?? null) || $request->expiresAt <= $now || $request->expiresAt > $now + 1800) {
            throw new LeadError(422, 'invalid_quote');
        }
        $items = [];
        $delivery = ['id' => $request->deliveryId] + $this->config['deliveryMethods'][$request->deliveryId];
        $total = $delivery['priceMinor'];
        foreach ($request->items as $item) {
            if (!hasOnlyFields($item, ['id', 'quantity']) || !is_string($item->id ?? null) ||
                !preg_match('~\A[a-z0-9-]{1,80}\z~', $item->id) || isset($items[$item->id]) ||
                !is_int($item->quantity ?? null) || $item->quantity < 1 || $item->quantity > 500) {
                throw new LeadError(422, 'invalid_quote');
            }
            $fact = $this->config['catalogFacts'][$item->id] ?? [];
            $sku = $fact['sku'] ?? $item->id;
            $price = $fact['priceMinor'] ?? 0;
            $vat = $this->config['vatBySku'][$sku] ?? null;
            $name = $fact['name'] ?? $sku;
            if (!is_int($price) || $price < 1 || $price > MAX_TOTAL_MINOR || !validVatCode($vat) ||
                !validPaymentPublicText($name, 120)) {
                throw new LeadError(422, 'invalid_quote');
            }
            $items[$item->id] = ['id' => $item->id, 'quantity' => $item->quantity, 'name' => $name, 'priceMinor' => $price,
                'vatCode' => $vat];
            $total += $price * $item->quantity;
        }
        if ($total < 100 || $total > MAX_TOTAL_MINOR) {
            throw new LeadError(422, 'invalid_quote');
        }
        $quote = ['mode' => $request->mode, 'items' => array_values($items), 'delivery' => $delivery, 'totalMinor' => $total];
        $crmOrderId = strtolower($request->crmOrderId);
        $this->verifySupply($crmOrderId, $quote);
        $token = bin2hex(random_bytes(32));
        $id = syncId($this->config['key'], 'payment-order', $token);
        $this->ledger->issue($id, $token, $crmOrderId, $this->config['shopId'], $quote, $request->receiptEmail, $request->expiresAt);
        return ['orderId' => $id, 'token' => $token, 'mode' => $request->mode];
    }

    public function respond(string $token, string $action, ?string $deliveryId = null): array
    {
        if (preg_match(PAYMENT_TOKEN, $token) !== 1) {
            throw new LeadError(404, 'order_not_found');
        }
        $row = $this->ledger->byToken($token);
        $quote = $this->quote($row);
        if ($row['provider_id'] === null && $row['expires_at'] <= time() && $row['first_attempt_at'] === null) {
            throw new LeadError(410, 'quote_expired');
        }
        $row = match ($action) {
            'quote' => $row,
            'start' => $this->start($row, $quote, $deliveryId),
            'status' => $row['provider_id'] === null ? $row : $this->refresh($row, $quote),
            default => throw new LeadError(422, 'invalid_request'),
        };
        return $this->view($row, $quote);
    }

    /** Webhook claims are used only to locate a known order. State comes from the authenticated provider API. */
    public function notify(mixed $notice): bool
    {
        $object = $notice->object ?? null;
        $id = $object->id ?? null;
        $event = $notice->event ?? null;
        if (($notice->type ?? null) !== 'notification' || !$object instanceof stdClass ||
            !is_string($id) || preg_match(UUID, $id) !== 1) {
            throw new LeadError(400, 'invalid_notification');
        }
        if ($event === 'refund.succeeded') {
            $paymentId = $object->payment_id ?? null;
            if (!is_string($paymentId) || preg_match(UUID, $paymentId) !== 1) {
                throw new LeadError(400, 'invalid_notification');
            }
            $row = $this->ledger->byProviderId($paymentId);
            if ($row === null) {
                return false;
            }
            $quote = $this->quote($row);
            $refund = $this->provider->refund($id);
            if (($refund['payment_id'] ?? null) !== $paymentId || ($refund['status'] ?? null) !== 'succeeded') {
                return false;
            }
            $minor = providerAmount($refund['amount'] ?? null);
            $verified = $this->verified($row, $quote, $this->provider->payment($paymentId));
            // The authenticated cumulative total handles duplicate and out-of-order partial refunds.
            if ($minor <= 0 || $verified['status'] !== 'paid' || $verified['refund'] < $minor) {
                throw new LeadError(503, 'provider_mismatch');
            }
            $this->ledger->confirm($row, $verified);
            return true;
        }
        if (!in_array($event, ['payment.succeeded', 'payment.canceled'], true)) {
            return false;
        }
        $row = $this->ledger->byProviderId($id);
        $orderId = $object->metadata->order_id ?? null;
        if ($row === null && is_string($orderId) && preg_match(UUID, $orderId) === 1) {
            $row = $this->ledger->attemptedOrder($orderId);
        }
        if ($row === null) {
            return false;
        }
        $quote = $this->quote($row);
        $verified = $this->verified($row, $quote, $this->provider->payment($id));
        $expected = $event === 'payment.succeeded' ? 'paid' : 'canceled';
        if ($verified['status'] !== $expected) {
            return false;
        }
        $this->ledger->confirm($row, $verified);
        return true;
    }

    public function reconcile(): array
    {
        $this->ledger->clearExpiredContact();
        $counts = ['updated' => 0, 'unavailable' => 0, 'receiptAttention' => 0];
        foreach ($this->ledger->pending($this->config['shopId']) as $row) {
            try {
                $current = $this->refresh($row, $this->quote($row));
                $counts['updated']++;
                if ($current['paid_at'] !== null && $current['receipt_registration'] !== 'succeeded') {
                    $counts['receiptAttention']++;
                }
            } catch (Throwable) {
                $counts['unavailable']++;
            }
        }
        return $counts;
    }

    private function start(array $row, array $quote, ?string $deliveryId): array
    {
        if ($deliveryId === null || $deliveryId !== $quote['delivery']['id']) {
            throw new LeadError(422, 'delivery_mismatch');
        }
        if ($row['provider_id'] !== null) {
            return $this->refresh($row, $quote);
        }
        if ($row['expires_at'] <= time()) {
            throw new LeadError(410, 'quote_expired');
        }
        $this->verifySupply($row['crm_order_id'], $quote);
        $attempt = $this->ledger->registerAttempt($row['id']);
        if ($attempt['provider_id'] !== null) {
            return $this->refresh($attempt, $quote);
        }
        $response = $this->provider->create($attempt['idempotency_key'], $this->request($attempt, $quote));
        return $this->ledger->confirm($attempt, $this->verified($attempt, $quote, $response));
    }

    private function refresh(array $row, array $quote): array
    {
        return $this->ledger->confirm($row, $this->verified($row, $quote, $this->provider->payment($row['provider_id'])));
    }

    private function request(array $row, array $quote): array
    {
        $positions = array_map(fn (array $item): array => $this->receiptLine($item, 'commodity'), $quote['items']);
        if ($quote['delivery']['priceMinor'] > 0) {
            $positions[] = $this->receiptLine(['name' => $quote['delivery']['label'], 'quantity' => 1] + $quote['delivery'], 'service');
        }
        return [
            'amount' => paymentAmount($quote['totalMinor']), 'capture' => true,
            'confirmation' => ['type' => 'redirect', 'return_url' => $this->config['returnUrl']],
            'description' => 'ДЕКОРАЙ, заказ ' . $row['id'], 'metadata' => ['order_id' => $row['id']],
            'receipt' => ['customer' => ['email' => $this->ledger->email($row)], 'items' => $positions],
        ];
    }

    private function receiptLine(array $item, string $subject): array
    {
        return ['description' => $item['name'], 'quantity' => $item['quantity'] . '.000',
            'amount' => paymentAmount($item['priceMinor']), 'vat_code' => $item['vatCode'],
            'payment_mode' => $this->config['receiptScheme'], 'payment_subject' => $subject, 'measure' => 'piece'];
    }

    private function verified(array $row, array $quote, array $payment): array
    {
        $id = $payment['id'] ?? null;
        $status = match ($payment['status'] ?? null) {
            'pending', 'waiting_for_capture' => 'pending',
            'succeeded' => ($payment['paid'] ?? null) === true ? 'paid' : null,
            'canceled' => ($payment['paid'] ?? null) === false ? 'canceled' : null,
            default => null,
        };
        $total = providerAmount($payment['amount'] ?? null);
        if (!is_string($id) || preg_match(UUID, $id) !== 1 || $status === null ||
            ($row['provider_id'] !== null && $row['provider_id'] !== $id) ||
            ($payment['test'] ?? null) !== ($this->config['mode'] === 'sandbox') ||
            ($payment['recipient']['account_id'] ?? null) !== $this->config['shopId'] ||
            ($payment['metadata']['order_id'] ?? null) !== $row['id'] || $total !== $quote['totalMinor']) {
            throw new LeadError(503, 'provider_mismatch');
        }
        $refund = array_key_exists('refunded_amount', $payment) ? providerAmount($payment['refunded_amount']) : 0;
        if ($refund < 0 || $refund > $total || ($refund > 0 && $status !== 'paid')) {
            throw new LeadError(503, 'provider_mismatch');
        }
        $confirmationUrl = null;
        if ($status === 'pending' && ($payment['confirmation']['type'] ?? null) === 'redirect') {
            $value = $payment['confirmation']['confirmation_url'] ?? '';
            if (!$this->safeConfirmationUrl($value)) {
                throw new LeadError(503, 'provider_mismatch');
            }
            $confirmationUrl = $value;
        }
        $receipt = $payment['receipt_registration'] ?? null;
        if (!in_array($receipt, ['succeeded', 'pending', 'canceled'], true)) {
            $receipt = null;
        }
        return compact('id', 'status', 'refund', 'total', 'confirmationUrl', 'receipt');
    }

    private function safeConfirmationUrl(mixed $url): bool
    {
        if (!is_string($url) || strlen($url) > 2048 || preg_match('~[\x00-\x20\x7f\x5c]~', $url)) {
            return false;
        }
        $parts = parse_url($url);
        return $parts !== false && ($parts['scheme'] ?? null) === 'https' &&
            in_array(strtolower($parts['host'] ?? ''), ['yoomoney.ru', 'yookassa.ru', 'checkout.yookassa.ru'], true) &&
            !isset($parts['user']) && !isset($parts['pass']) && ($parts['port'] ?? 443) === 443;
    }

    private function quote(array $row): array
    {
        if ($row['shop_id'] !== $this->config['shopId']) {
            throw checkoutUnavailable();
        }
        return json_decode($row['quote'], true, 32, JSON_THROW_ON_ERROR);
    }

    private function view(array $row, array $quote): array
    {
        $result = ['orderId' => $row['id'], 'status' => $row['status'], 'currency' => 'RUB', 'totalMinor' => $quote['totalMinor'],
            'items' => array_map(static fn (array $item): array => array_intersect_key($item, array_flip(['id', 'name', 'quantity', 'priceMinor'])), $quote['items']),
            'delivery' => array_intersect_key($quote['delivery'], array_flip(['id', 'label', 'priceMinor']))];
        if ($row['paid_at'] !== null) {
            $result['paidAt'] = $row['paid_at'];
        }
        if ($row['confirmation_url'] !== null) {
            $result['confirmationUrl'] = $row['confirmation_url'];
        }
        return $result;
    }

    private function verifySupply(string $orderId, array $quote): void
    {
        if ($this->config['mode'] === 'sandbox') {
            return;
        }
        if ($this->crm === null) {
            throw checkoutUnavailable();
        }
        $positions = [];
        foreach ($quote['items'] as $item) {
            $map = $this->config['crm']['catalog'][$item['id']] ?? [];
            if (($map['priceMinor'] ?? null) !== $item['priceMinor']) {
                throw new LeadError(409, 'order_not_ready');
            }
            $positions[] = ['type' => $map['type'], 'id' => $map['id'], 'quantity' => $item['quantity'],
                'priceMinor' => $item['priceMinor'], 'reserved' => true];
        }
        $delivery = $quote['delivery'];
        if ($delivery['priceMinor'] > 0) {
            $positions[] = ['type' => 'service', 'id' => $delivery['crmServiceId'], 'quantity' => 1,
                'priceMinor' => $delivery['priceMinor'], 'reserved' => false];
        }
        $this->crm->verifyReservedSale($orderId, $this->config['saleStateId'], $this->config['rubCurrencyId'], $quote['totalMinor'], $positions);
    }
}
