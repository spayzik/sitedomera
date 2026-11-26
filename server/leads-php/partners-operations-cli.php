<?php
declare(strict_types=1);

use Dekoray\Partners\PartnerStore;
use function Dekoray\Partners\loadPartnerConfig;
use function Dekoray\Partners\partnerFinanceQuery;
use function Dekoray\Partners\partnerReconcileSales;
use function Dekoray\Leads\readObject;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
ini_set('display_errors', '0');
ini_set('zend.exception_ignore_args', '1');
umask(0077);
require_once __DIR__ . '/partner-bootstrap.php';

try {
    $command = $argv[1] ?? '';
    $webroot = realpath($argv[2] ?? '');
    if (!$webroot || ($command === 'reconcile' ? $argc !== 3 : ($command !== 'offline' || $argc !== 5))) {
        throw new RuntimeException('usage');
    }
    $private = realpath(__DIR__);
    if ($private !== dirname($webroot, 2) . DIRECTORY_SEPARATOR . 'dekoray-leads') {
        throw new RuntimeException('private_directory_invalid');
    }
    $config = loadPartnerConfig($private, $webroot);
    new PartnerStore($config);
    $db = new PDO('sqlite:' . $config['database'], options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->exec('PRAGMA busy_timeout=2500; PRAGMA synchronous=FULL');
    $payment = $config['payment'];
    if (!$payment) throw new RuntimeException('payment_ledger_unavailable');
    $payments = new PDO('sqlite:' . $payment, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $payments->exec('PRAGMA query_only=ON; PRAGMA busy_timeout=2500');
    if ($command === 'reconcile') {
        $policyFile = $private . '/partner-sales-policy.json';
        if (!is_file($policyFile) || is_link($policyFile) ||
            (DIRECTORY_SEPARATOR === '/' && (fileperms($policyFile) & 0077) !== 0)) {
            throw new RuntimeException('finance_policy_unavailable');
        }
        $rules = readObject($policyFile)['rules'] ?? null;
        if (!is_array($rules)) throw new RuntimeException('finance_policy_invalid');
        fwrite(STDOUT, json_encode(partnerReconcileSales($db, $payments, array_map(static fn ($rule) => is_object($rule) ? (array) $rule : null, $rules))) . PHP_EOL);
        exit;
    }
    $from = filter_var($argv[3], FILTER_VALIDATE_INT);
    $to = filter_var($argv[4], FILTER_VALIDATE_INT);
    if (!$from || !$to || $from >= $to || $from < time() - 21 * 86400 || $to > time()) {
        throw new RuntimeException('invalid_export_interval');
    }
    $confirmed = partnerFinanceQuery($db, "SELECT r.id,r.resolved_at,m.attribution FROM partner_referrals r
        JOIN partner_marketing m ON m.entity_id=r.id AND m.entity_type='referral'
        WHERE r.status='confirmed' AND r.resolved_at>=? AND r.resolved_at<? ORDER BY r.resolved_at,r.id", [$from, $to]);
    fputcsv(STDOUT, ['ClientID', 'yclid', 'Target', 'DateTime'], escape: '');
    $write = static function (string $json, string $target, int $time): void {
        $data = Dekoray\Partners\partnerMarketingAttribution(json_decode($json, false, 8, JSON_THROW_ON_ERROR));
        $clientId = $data['clientId'] ?? '';
        $yclid = $data['yclid'] ?? '';
        if ($clientId !== '' || $yclid !== '') fputcsv(STDOUT, [$clientId, $yclid, $target, $time], escape: '');
    };
    foreach ($confirmed as $row) $write($row['attribution'], 'referral_lead_confirmed', (int) $row['resolved_at']);
    $orders = partnerFinanceQuery($db, "SELECT po.id,m.attribution FROM partner_orders po
        JOIN partner_referrals r ON r.id=po.referral_id AND r.partner_id=po.partner_id
        JOIN partner_marketing m ON m.entity_id=r.id AND m.entity_type='referral'
        WHERE r.status='confirmed' ORDER BY po.id");
    foreach ($orders as $row) {
        $sale = partnerFinanceQuery($payments, "SELECT paid_at FROM payment_orders
            WHERE id=? AND provider_id IS NOT NULL AND status IN ('paid','partially_refunded')", [$row['id']])->fetchColumn();
        $at = is_int($sale) ? intdiv($sale, 1000) : 0;
        if ($from <= $at && $at < $to) $write($row['attribution'], 'partner_sale_confirmed', $at);
    }
} catch (Throwable) {
    fwrite(STDERR, "Partner finance operation unavailable. Verify the private configuration and input." . PHP_EOL);
    exit(1);
}
