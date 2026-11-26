<?php
declare(strict_types=1);

namespace Dekoray\Partners;

use PDO;
use RuntimeException;
use Throwable;

function partnerFinanceSchema(PDO $db): void
{
    $db->exec(<<<'SQL'
        CREATE TABLE IF NOT EXISTS partner_commissions (
            order_id TEXT PRIMARY KEY, partner_id TEXT NOT NULL, amount_minor INTEGER NOT NULL,
            paid_minor INTEGER NOT NULL DEFAULT 0, policy_version TEXT NOT NULL, rate_bps INTEGER NOT NULL,
            base_kind TEXT NOT NULL, available_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS partner_commission_events (
            id INTEGER PRIMARY KEY, order_id TEXT NOT NULL, partner_id TEXT NOT NULL,
            delta_minor INTEGER NOT NULL, refund_minor INTEGER NOT NULL, created_at INTEGER NOT NULL,
            UNIQUE (order_id, refund_minor)
        );
        CREATE TABLE IF NOT EXISTS partner_payouts (
            id INTEGER PRIMARY KEY, order_id TEXT NOT NULL, partner_id TEXT NOT NULL,
            reference TEXT NOT NULL, amount_minor INTEGER NOT NULL, actor_id TEXT NOT NULL, created_at INTEGER NOT NULL,
            UNIQUE (order_id, reference)
        );
        CREATE INDEX IF NOT EXISTS partner_commissions_owner ON partner_commissions(partner_id);
        CREATE INDEX IF NOT EXISTS partner_payouts_owner ON partner_payouts(partner_id);
        SQL);
}

function partnerFinanceQuery(PDO $db, string $sql, array $params = []): \PDOStatement
{
    $statement = $db->prepare($sql);
    $statement->execute($params);
    return $statement;
}

function partnerFinanceAtomic(PDO $db, callable $operation): mixed
{
    $db->exec('BEGIN IMMEDIATE');
    try {
        $result = $operation();
        $db->exec('COMMIT');
        return $result;
    } catch (Throwable $error) {
        $db->exec('ROLLBACK');
        throw $error;
    }
}

function partnerFinanceView(PDO $db, string $partnerId): array
{
    partnerFinanceSchema($db);
    $where = $partnerId === '' ? '' : ' WHERE partner_id = ?';
    $params = $partnerId === '' ? [] : [$partnerId];
    return [
        'accruals' => partnerFinanceQuery($db, 'SELECT order_id, partner_id, amount_minor, paid_minor, policy_version, available_at, updated_at
            FROM partner_commissions' . $where . ' ORDER BY updated_at DESC LIMIT 250', $params)->fetchAll(PDO::FETCH_ASSOC),
        'adjustments' => partnerFinanceQuery($db, 'SELECT order_id, delta_minor, created_at FROM partner_commission_events
            ' . $where . ' ORDER BY id DESC LIMIT 250', $params)->fetchAll(PDO::FETCH_ASSOC),
        'payouts' => partnerFinanceQuery($db, 'SELECT order_id, reference, amount_minor, created_at FROM partner_payouts
            ' . $where . ' ORDER BY id DESC LIMIT 250', $params)->fetchAll(PDO::FETCH_ASSOC),
    ];
}

function partnerRecordPayout(PDO $db, string $orderId, string $reference, string $actorId, ?int $confirmedAmount = null): array
{
    if (!preg_match('/^[a-zA-Z0-9._-]{5,80}$/D', $reference) || $confirmedAmount === null || $confirmedAmount <= 0) {
        throw new \Dekoray\Leads\LeadError(422, 'invalid_payout_reference');
    }
    partnerFinanceSchema($db);
    return partnerFinanceAtomic($db, function () use ($db, $orderId, $reference, $actorId, $confirmedAmount): array {
        $existing = partnerFinanceQuery($db, 'SELECT amount_minor FROM partner_payouts WHERE order_id = ? AND reference = ?',
            [$orderId, $reference])->fetchColumn();
        if ($existing !== false) {
            if ((int) $existing !== $confirmedAmount) throw new \Dekoray\Leads\LeadError(409, 'payout_reference_conflict');
            return ['recordedMinor' => $confirmedAmount];
        }
        $row = partnerFinanceQuery($db, 'SELECT * FROM partner_commissions WHERE order_id = ?', [$orderId])->fetch(PDO::FETCH_ASSOC);
        $amount = $row ? (int) $row['amount_minor'] - (int) $row['paid_minor'] : 0;
        if ($amount <= 0 || $confirmedAmount > $amount || (int) $row['available_at'] > time()) throw new \Dekoray\Leads\LeadError(409, 'payout_not_available');
        // This records a confirmed transfer made outside the application.
        partnerFinanceQuery($db, 'INSERT INTO partner_payouts (order_id, partner_id, reference, amount_minor, actor_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)', [$orderId, $row['partner_id'], $reference, $confirmedAmount, $actorId, time()]);
        partnerFinanceQuery($db, 'UPDATE partner_commissions SET paid_minor = paid_minor + ?, updated_at = ? WHERE order_id = ?',
            [$confirmedAmount, time(), $orderId]);
        return ['recordedMinor' => $confirmedAmount];
    });
}

function partnerSalePolicy(array $rules, string $program, int $saleAt): ?array
{
    $matching = [];
    foreach ($rules as $rule) {
        if (!is_array($rule) || !preg_match('/^[a-zA-Z0-9._-]{1,48}$/D', (string) ($rule['version'] ?? '')) ||
            !is_int($rule['from'] ?? null) || !is_int($rule['to'] ?? null) || $rule['from'] >= $rule['to'] ||
            !is_int($rule['rateBps'] ?? null) || $rule['rateBps'] < 1 || $rule['rateBps'] > 10000 ||
            !in_array($rule['base'] ?? null, ['order_total', 'goods_less_all_refunds'], true) ||
            !is_array($rule['programs'] ?? null) || !is_int($rule['holdDays'] ?? null) ||
            $rule['holdDays'] < 0 || $rule['holdDays'] > 365) throw new RuntimeException('invalid_finance_policy');
        if (($rule['approved'] ?? false) === true && in_array($program, $rule['programs'], true) &&
            $rule['from'] <= $saleAt && $saleAt < $rule['to']) $matching[] = $rule;
    }
    if (count($matching) > 1) throw new RuntimeException('ambiguous_finance_policy');
    return $matching[0] ?? null;
}

function partnerReconcileSales(PDO $db, PDO $payments, array $rules): array
{
    partnerFinanceSchema($db);
    $links = partnerFinanceQuery($db, "SELECT po.id, po.partner_id, p.program FROM partner_orders po
        JOIN partners p ON p.id=po.partner_id JOIN partner_referrals pr ON pr.id=po.referral_id
        WHERE pr.status='confirmed' AND pr.partner_id=po.partner_id")->fetchAll(PDO::FETCH_ASSOC);
    $result = ['reconciled' => 0, 'policyPending' => 0, 'noSale' => 0];
    foreach (partnerFinanceQuery($db, 'SELECT id FROM partner_orders WHERE referral_id IS NULL') as $direct) {
        $status = partnerFinanceQuery($payments, "SELECT status FROM payment_orders WHERE id=? AND provider_id IS NOT NULL
            AND status IN ('pending','canceled','paid','partially_refunded','refunded')", [$direct['id']])->fetchColumn();
        if ($status === false) continue;
        $rank = ['linked' => 0, 'pending' => 1, 'canceled' => 2, 'paid' => 3, 'partially_refunded' => 4, 'refunded' => 5];
        partnerFinanceAtomic($db, function () use ($db, $direct, $status, $rank): void {
            $current = partnerFinanceQuery($db, 'SELECT status FROM partner_orders WHERE id=? AND referral_id IS NULL', [$direct['id']])->fetchColumn();
            if (isset($rank[$current]) && $rank[$status] > $rank[$current]) {
                partnerFinanceQuery($db, 'UPDATE partner_orders SET status=? WHERE id=?', [$status, $direct['id']]);
            }
        });
    }
    foreach ($links as $link) {
        $sale = partnerFinanceQuery($payments, 'SELECT status, paid_at, quote, refunded_minor, provider_id FROM payment_orders
            WHERE id=?', [$link['id']])->fetch(PDO::FETCH_ASSOC);
        if (!$sale || !$sale['paid_at'] || !$sale['provider_id'] ||
            !in_array($sale['status'], ['paid', 'partially_refunded', 'refunded'], true)) {
            $result['noSale']++;
            continue;
        }
        $quote = json_decode($sale['quote'], true, 32, JSON_THROW_ON_ERROR);
        $total = $quote['totalMinor'] ?? null;
        $delivery = $quote['delivery']['priceMinor'] ?? null;
        $refund = $sale['refunded_minor'];
        if (!is_int($total) || $total < 1 || $total > 35000000 || !is_int($delivery) || $delivery < 0 ||
            $delivery > $total || !is_int($refund) || $refund < 0 || $refund > $total) {
            throw new RuntimeException('invalid_verified_sale');
        }
        $changed = partnerFinanceAtomic($db, function () use ($db, $link, $total, $delivery, $refund, $sale, $rules): ?bool {
            $id = $link['id'];
            $locked = partnerFinanceQuery($db, "SELECT 1 FROM partner_orders po JOIN partner_referrals pr ON pr.id=po.referral_id
                WHERE po.id=? AND po.partner_id=? AND pr.partner_id=po.partner_id AND pr.status='confirmed'",
                [$id, $link['partner_id']])->fetchColumn();
            if (!$locked) return false;
            $row = partnerFinanceQuery($db, 'SELECT * FROM partner_commissions WHERE order_id=?', [$id])->fetch(PDO::FETCH_ASSOC);
            if ($row && $row['partner_id'] !== $link['partner_id']) throw new RuntimeException('order_partner_conflict');
            $policy = $row ? ['version' => $row['policy_version'], 'rateBps' => (int) $row['rate_bps'], 'base' => $row['base_kind']]
                : partnerSalePolicy($rules, $link['program'], intdiv((int) $sale['paid_at'], 1000));
            if (!$policy) {
                partnerFinanceQuery($db, 'UPDATE partner_orders SET status=? WHERE id=?', [$sale['status'], $id]);
                return null;
            }
            $previousRefund = partnerFinanceQuery($db, 'SELECT MAX(refund_minor) FROM partner_commission_events WHERE order_id=?',
                [$id])->fetchColumn();
            // An older read may finish after a newer refund was already recorded.
            if ($previousRefund !== null && $previousRefund !== false && $refund <= (int) $previousRefund) return false;
            partnerFinanceQuery($db, 'UPDATE partner_orders SET status=? WHERE id=?', [$sale['status'], $id]);
            $base = $policy['base'] === 'order_total' ? $total : $total - $delivery;
            $amount = intdiv(max(0, $base - $refund) * $policy['rateBps'], 10000);
            $now = time();
            partnerFinanceQuery($db, 'INSERT INTO partner_commissions (order_id,partner_id,amount_minor,policy_version,rate_bps,base_kind,available_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET amount_minor=excluded.amount_minor,updated_at=excluded.updated_at',
                [$id, $link['partner_id'], $amount, $policy['version'], $policy['rateBps'], $policy['base'], (int) ($row['available_at'] ?? (intdiv((int) $sale['paid_at'], 1000) + $policy['holdDays'] * 86400)), $now]);
            partnerFinanceQuery($db, 'INSERT INTO partner_commission_events (order_id,partner_id,delta_minor,refund_minor,created_at)
                VALUES (?,?,?,?,?)', [$id, $link['partner_id'], $amount - (int) ($row['amount_minor'] ?? 0), $refund, $now]);
            return true;
        });
        if ($changed === null) $result['policyPending']++;
        elseif ($changed) $result['reconciled']++;
    }
    return $result;
}



function partnerMarketingAttribution(mixed $value): ?array
{
    return \Dekoray\Leads\validateMarketingAttribution($value);
}
