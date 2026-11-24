<?php
declare(strict_types=1);

require dirname(__DIR__) . '/payment-bootstrap.php';

use Dekoray\Leads\LeadError;
use Dekoray\Leads\MoySklad;
use Dekoray\Payments\PaymentLedger;
use Dekoray\Payments\PaymentService;
use Dekoray\Payments\YooKassa;

function expect(bool $condition): void
{
    if (!$condition) {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 1);
        throw new RuntimeException('Expectation failed at ' . $trace[0]['line']);
    }
}

function rejects(callable $operation, string $code): void
{
    try {
        $operation();
    } catch (LeadError $error) {
        expect($error->errorCode === $code);
        return;
    }
    throw new RuntimeException('Expected rejection: ' . $code);
}

$scenario = $argv[1];
$statePath = $argv[2] . '/test.sqlite';
$config = [
    'mode' => 'sandbox', 'shopId' => '123456', 'key' => str_repeat('5', 64),
    'returnUrl' => 'https://spayzik.github.io/dekoray-preview/usloviya-priobreteniya/#oplata',
    'catalogFacts' => ['panel-1' => ['name' => 'Образец', 'sku' => 'TEST', 'priceMinor' => 700000]],
    'vatBySku' => ['TEST' => 1], 'receiptScheme' => 'full_payment',
    'deliveryMethods' => ['pickup' => ['label' => 'Самовывоз', 'priceMinor' => 0, 'vatCode' => 1],
        'courier' => ['label' => 'Курьер', 'priceMinor' => 25000, 'vatCode' => 1]],
];
$proposal = (object) [
    'mode' => 'instant', 'crmOrderId' => '12345678-1234-1234-1234-123456789abc',
    'items' => [(object) ['id' => 'panel-1', 'quantity' => 2]], 'deliveryId' => 'courier',
    'receiptEmail' => 'dekoray@example.test', 'expiresAt' => time() + 600,
];
$ledger = new PaymentLedger($statePath, $config['key']);
$providerId = 'dcd3bd11-498a-4b30-84a9-0f5d2bb04924';
$refundId = '6731cbd7-ebec-42f7-9af2-a59938b695bf';
$refundAmount = '100.00';
$providerStatus = 'pending';
$refundStatus = 'pending';
$providerAmount = '14250.00';
$postCount = 0;
$readCount = 0;
$remoteCreates = [];
$lose = false;
$getFail = false;
$transport = static function (string $method, string $path, ?array $body, ?string $key) use (
    $config, $providerId, $refundId, &$refundAmount, &$providerStatus, &$refundStatus, &$providerAmount,
    &$postCount, &$readCount, &$remoteCreates, &$lose, &$getFail
): array {
    if ($path === '/me') {
        expect($method === 'GET' && $body === null && $key === null);
        return ['account_id' => $config['shopId'], 'test' => true, 'status' => 'enabled'];
    }
    if ($method === 'POST') {
        expect($path === '/payments' && is_string($key));
        $postCount++;
        expect($body['capture'] === true && $body['amount'] === ['value' => '14250.00', 'currency' => 'RUB']);
        expect($body['confirmation']['return_url'] === $config['returnUrl']);
        expect($body['receipt']['customer'] === ['email' => 'dekoray@example.test']);
        expect($body['receipt']['items'][0]['amount']['value'] === '7000.00');
        expect($body['receipt']['items'][0]['quantity'] === '2.000');
        expect($body['receipt']['items'][1]['amount']['value'] === '250.00');
        expect(count($body['receipt']['items']) === 2);
        expect($body['receipt']['items'][0]['payment_mode'] === 'full_payment');
        expect(($remoteCreates[$key] ?? $body) === $body);
        $remoteCreates[$key] = $body;
        if ($lose) {
            throw new RuntimeException('simulated upstream response loss');
        }
    } else {
        $readCount++;
        if ($getFail) {
            throw new RuntimeException('simulated upstream GET outage');
        }
    }
    if ($path === '/refunds/' . $refundId) {
        return ['id' => $refundId, 'payment_id' => $providerId, 'status' => $refundStatus,
            'amount' => ['value' => $refundAmount, 'currency' => 'RUB']];
    }
    expect($path === '/payments' || $path === '/payments/' . $providerId);
    $order = reset($remoteCreates);
    expect(is_array($order));
    return [
        'id' => $providerId, 'status' => $providerStatus, 'paid' => $providerStatus === 'succeeded',
        'amount' => ['value' => $providerAmount, 'currency' => 'RUB'],
        'metadata' => $order['metadata'], 'test' => true, 'recipient' => ['account_id' => $config['shopId']],
        'confirmation' => ['type' => 'redirect', 'confirmation_url' => 'https://yoomoney.ru/checkout/example'],
        'refunded_amount' => ['value' => $refundStatus === 'succeeded' ? $refundAmount : '0.00', 'currency' => 'RUB'],
        'receipt_registration' => 'succeeded',
    ];
};
$checkout = new PaymentService($config, $ledger, new YooKassa($config, $transport));
$callback = static function (string $event, array $object): stdClass {
    return (object) ['type' => 'notification', 'event' => $event, 'object' => (object) $object];
};

if ($scenario === 'configuration') {
    $base = ['enabled' => true, 'mode' => 'sandbox', 'shopId' => '123456',
        'secretKey' => 'test_' . str_repeat('x', 36), 'siteHost' => 'payments.example.test',
        'holdPolicyVerified' => true, 'fiscalizationVerified' => true, 'receiptScheme' => 'full_payment',
        'sellerName' => 'Тестовый продавец', 'sellerInn' => '7707083893', 'key' => $config['key'],
        'vatBySku' => (object) $config['vatBySku'],
        'deliveryMethods' => (object) array_map(static fn (array $method): object => (object) $method, $config['deliveryMethods']),
    ];
    expect(Dekoray\Payments\parsePaymentConfig($base, 'payments.example.test')['mode'] === 'sandbox');
    rejects(fn () => Dekoray\Payments\parsePaymentConfig(['enabled' => false] + $base, 'payments.example.test'), 'checkout_unavailable');
    rejects(fn () => Dekoray\Payments\parsePaymentConfig(['secretKey' => 'live_' . str_repeat('x', 36)] + $base, 'payments.example.test'), 'checkout_unavailable');
    rejects(fn () => Dekoray\Payments\parsePaymentConfig($base, Dekoray\Leads\SITE_HOST), 'checkout_unavailable');
    rejects(fn () => Dekoray\Payments\parsePaymentConfig(['sellerInn' => '7707083899'] + $base, 'payments.example.test'), 'checkout_unavailable');
    rejects(fn () => Dekoray\Payments\parsePaymentConfig(['receiptScheme' => 'full_prepayment'] + $base, 'payments.example.test'), 'checkout_unavailable');
} elseif ($scenario === 'crm_read_only') {
    $org = '11111111-1111-1111-1111-111111111111';
    $state = '22222222-2222-2222-2222-222222222222';
    $currency = '33333333-3333-3333-3333-333333333333';
    $product = '44444444-4444-4444-4444-444444444444';
    $service = '55555555-5555-5555-5555-555555555555';
    $base = 'https://api.moysklad.ru/api/remap/1.2/entity';
    $meta = static fn (string $type, string $id, ?string $path = null): array =>
        ['meta' => ['href' => $base . '/' . ($path ?? $type) . '/' . $id, 'type' => $type]];
    $reserved = 2;
    $amount = 1425000;
    $calls = [];
    $crm = new MoySklad(['organizationId' => $org], static function ($url, $method, $body) use (&$calls, $base, $meta, $org,
        $state, $currency, $proposal, $product, $service, &$reserved, &$amount): array {
        expect($method === 'GET' && $body === null);
        $calls[] = $url;
        $id = $proposal->crmOrderId;
        expect(str_starts_with($url, $base . '/customerorder/' . $id));
        $data = $url === $base . '/customerorder/' . $id
            ? ['meta' => ['type' => 'customerorder'], 'id' => $id, 'applicable' => true,
                'organization' => $meta('organization', $org), 'state' => $meta('state', $state, 'customerorder/metadata/states'),
                'rate' => ['currency' => $meta('currency', $currency), 'value' => 1], 'sum' => $amount, 'payedSum' => 0, 'shippedSum' => 0]
            : ['meta' => ['size' => 2], 'rows' => [
                ['assortment' => $meta('product', $product), 'quantity' => 2, 'reserve' => $reserved, 'shipped' => 0, 'price' => 700000, 'discount' => 0],
                ['assortment' => $meta('service', $service), 'quantity' => 1, 'price' => 25000, 'discount' => 0],
            ]];
        return ['status' => 200, 'body' => json_encode($data, JSON_THROW_ON_ERROR)];
    });
    $expected = [['type' => 'product', 'id' => $product, 'quantity' => 2, 'priceMinor' => 700000, 'reserved' => true],
        ['type' => 'service', 'id' => $service, 'quantity' => 1, 'priceMinor' => 25000, 'reserved' => false]];
    $crm->verifyReservedSale($proposal->crmOrderId, $state, $currency, 1425000, $expected);
    expect(count($calls) === 2);
    $reserved = 1;
    rejects(fn () => $crm->verifyReservedSale($proposal->crmOrderId, $state, $currency, 1425000, $expected), 'order_not_ready');
    $reserved = 2;
    $amount++;
    rejects(fn () => $crm->verifyReservedSale($proposal->crmOrderId, $state, $currency, 1425000, $expected), 'order_not_ready');
} else {
    if ($scenario === 'price_and_delivery') {
        $tampered = clone $proposal;
        $tampered->items = [(object) ['id' => 'panel-1', 'quantity' => 2, 'priceMinor' => 1]];
        rejects(fn () => $checkout->issue($tampered), 'invalid_quote');
        $tampered = clone $proposal;
        $tampered->receiptEmail = 'private@example.test';
        rejects(fn () => $checkout->issue($tampered), 'invalid_quote');
        $proposal->mode = 'manager';
    }

    $issued = $checkout->issue($proposal);
    $token = $issued['token'];
    expect(preg_match('/^[a-f0-9]{64}$/D', $token) === 1);
    expect(strlen($issued['orderId']) === 36);

    if ($scenario === 'approved_quote') {
        $view = $checkout->respond($token, 'quote');
        expect($view['status'] === 'awaiting_payment' && $view['totalMinor'] === 1425000 && $view['delivery']['id'] === 'courier');
        expect($view['orderId'] === $issued['orderId'] && $view['items'][0]['quantity'] === 2 && $view['items'][0]['priceMinor'] === 700000);
        expect(!str_contains(json_encode($view), 'example.test') && $postCount === 0 && $readCount === 0);
        rejects(fn () => $checkout->respond(str_repeat('0', 64), 'quote'), 'order_not_found');
        rejects(fn () => $checkout->issue($proposal), 'order_already_issued');
        $start = $checkout->respond($token, 'start', 'courier');
        expect($start['status'] === 'pending' && str_starts_with($start['confirmationUrl'], 'https://yoomoney.ru/'));
        expect($checkout->respond($token, 'start', 'courier')['status'] === 'pending' && $postCount === 1);
        expect(!str_contains(file_get_contents($statePath), 'dekoray@example.test'));
    } elseif ($scenario === 'price_and_delivery') {
        rejects(fn () => $checkout->respond($token, 'start', 'pickup'), 'delivery_mismatch');
        expect($postCount === 0);
        expect($checkout->respond($token, 'start', 'courier')['status'] === 'pending');
    } elseif ($scenario === 'lost_response') {
        $lose = true;
        rejects(fn () => $checkout->respond($token, 'start', 'courier'), 'provider_unavailable');
        $lose = false;
        $restarted = new PaymentService($config, new PaymentLedger($statePath, $config['key']), new YooKassa($config, $transport));
        expect($restarted->respond($token, 'start', 'courier')['status'] === 'pending');
        expect($postCount === 2 && count($remoteCreates) === 1);
    } elseif ($scenario === 'expired_attempt') {
        (new PDO('sqlite:' . $statePath))->exec('UPDATE payment_orders SET expires_at = 1');
        rejects(fn () => $checkout->respond($token, 'start', 'courier'), 'quote_expired');
        expect($postCount === 0);
    } elseif ($scenario === 'verified_refund') {
        expect($checkout->respond($token, 'start', 'courier')['status'] === 'pending');
        expect($checkout->notify($callback('payment.succeeded', ['id' => $providerId, 'status' => 'succeeded'])) === false);
        expect($checkout->respond($token, 'quote')['status'] === 'pending');
        $providerStatus = 'succeeded';
        $providerAmount = '1.00';
        rejects(fn () => $checkout->respond($token, 'status'), 'provider_mismatch');
        expect($checkout->respond($token, 'quote')['status'] === 'pending');
        $providerAmount = '14250.00';
        expect($checkout->notify($callback('payment.succeeded', ['id' => $providerId])) === true);
        $paid = $checkout->respond($token, 'status');
        expect($paid['status'] === 'paid' && $paid['paidAt'] > 1000000000000 && $paid['totalMinor'] === 1425000);
        expect($checkout->notify($callback('payment.succeeded', ['id' => $providerId])) === true);
        expect($checkout->respond($token, 'status')['paidAt'] === $paid['paidAt']);
        expect($checkout->notify($callback('refund.succeeded', ['id' => $refundId, 'payment_id' => $providerId])) === false);
        $refundStatus = 'succeeded';
        expect($checkout->notify($callback('refund.succeeded', ['id' => $refundId, 'payment_id' => $providerId])) === true);
        expect($checkout->respond($token, 'status')['status'] === 'partially_refunded');
        $refundAmount = '14250.00';
        expect($checkout->notify($callback('refund.succeeded', ['id' => $refundId, 'payment_id' => $providerId])) === true);
        expect($checkout->respond($token, 'status')['status'] === 'refunded');
        expect($postCount === 1);
    } elseif ($scenario === 'canceled') {
        $checkout->respond($token, 'start', 'courier');
        $providerStatus = 'canceled';
        expect($checkout->notify($callback('payment.canceled', ['id' => $providerId])) === true);
        expect($checkout->respond($token, 'status')['status'] === 'canceled');
        expect($checkout->respond($token, 'start', 'courier')['status'] === 'canceled' && $postCount === 1);
    } elseif ($scenario === 'webhook_recovery') {
        expect($checkout->notify($callback('payment.succeeded', ['id' => $providerId,
            'metadata' => (object) ['order_id' => $issued['orderId']]])) === false);
        expect($readCount === 0);
        $lose = true;
        rejects(fn () => $checkout->respond($token, 'start', 'courier'), 'provider_unavailable');
        $providerStatus = 'succeeded';
        $getFail = true;
        $notice = $callback('payment.succeeded', ['id' => $providerId, 'metadata' => (object) ['order_id' => $issued['orderId']]]);
        rejects(fn () => $checkout->notify($notice), 'provider_unavailable');
        $getFail = false;
        expect($checkout->notify($notice) === true);
        expect($checkout->respond($token, 'status')['status'] === 'paid' && $postCount === 1);
    }
}

echo json_encode(['result' => 'pass', 'scenario' => $scenario], JSON_THROW_ON_ERROR);
