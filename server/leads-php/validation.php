<?php
declare(strict_types=1);

namespace Dekoray\Leads;

use Collator;
use Normalizer;
use RuntimeException;
use stdClass;

const UUID = '~\A[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\z~i';
const VERSION = '~\A[a-z0-9][a-z0-9._-]{0,63}\z~i';
const DOCUMENT_PATH = '~\A/(?:[a-z0-9_-]+/)*[a-z0-9_-]+\.html\z~i';
const MAX_BODY_BYTES = 16 * 1024;
const LEAD_INTENTS = ['consultation', 'selection', 'calculation', 'samples', 'order', 'installation', 'delivery', 'wholesale', 'designer', 'feedback'];

// Match the frontend's String.trim() and UTF-16 length limits.
const LEAD_WHITESPACE = '\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}';
const UNSUPPORTED_CONTROLS = '~[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]~';

final class LeadError extends RuntimeException
{
    public function __construct(public readonly int $status, public readonly string $errorCode)
    {
        parent::__construct($errorCode);
    }
}

function hasOnlyFields(mixed $value, array $fields): bool
{
    return $value instanceof stdClass && array_diff(array_keys(get_object_vars($value)), $fields) === [];
}

function trimLeadText(string $value): string
{
    $spaces = '[' . LEAD_WHITESPACE . ']';
    return preg_replace('~\A' . $spaces . '+|' . $spaces . '+\z~u', '', $value)
        ?? throw new LeadError(422, 'invalid_request');
}

function normalizeLeadText(string $value): string
{
    $normalized = Normalizer::normalize(trimLeadText($value), Normalizer::FORM_C);
    if ($normalized === false) {
        throw new LeadError(422, 'invalid_request');
    }
    return $normalized;
}

function leadTextLength(string $value): int
{
    return intdiv(strlen(mb_convert_encoding($value, 'UTF-16LE', 'UTF-8')), 2);
}

function normalizePhone(mixed $value): ?string
{
    if (!is_string($value) || leadTextLength($value) > 32) {
        return null;
    }
    $trimmed = trimLeadText($value);
    if (!preg_match('~\A\+?[0-9 ()-]+\z~', $trimmed)) {
        return null;
    }
    $digits = preg_replace('~[^0-9]~', '', $trimmed);
    if (str_starts_with($trimmed, '+')) {
        return preg_match('~\A[1-9][0-9]{9,14}\z~', $digits) ? '+' . $digits : null;
    }
    if (strlen($digits) === 10) {
        return '+7' . $digits;
    }
    return preg_match('~\A[78][0-9]{10}\z~', $digits) ? '+7' . substr($digits, 1) : null;
}

function validateLead(mixed $raw, array $config): array
{
    $commonFields = ['name', 'phone', 'email', 'comment', 'consent', 'website'];
    $inquiry = $raw instanceof stdClass && property_exists($raw, 'intent');
    $fields = array_merge($commonFields, $inquiry ? ['intent', 'context', 'items', 'calculation'] : ['items']);
    if (!hasOnlyFields($raw, $fields) || ($raw->website ?? null) !== '' ||
        !is_string($raw->name ?? null) || !is_string($raw->comment ?? null) || !is_string($raw->email ?? null)) {
        throw new LeadError(422, 'invalid_request');
    }
    if ($inquiry) {
        if (($config['enableGeneralLeads'] ?? false) !== true || !in_array($raw->intent, LEAD_INTENTS, true) ||
            (property_exists($raw, 'context') && !is_string($raw->context))) {
            throw new LeadError(422, 'invalid_request');
        }
    } elseif (!is_array($raw->items ?? null) || count($raw->items) < 1 || count($raw->items) > 45) {
        throw new LeadError(422, 'invalid_request');
    }

    $consent = $raw->consent ?? null;
    $version = $config['consentVersion'];
    if (!hasOnlyFields($consent, ['accepted', 'version']) || ($consent->accepted ?? null) !== true ||
        ($consent->version ?? null) !== $version) {
        throw new LeadError(422, 'consent_required');
    }

    $name = normalizeLeadText($raw->name);
    $phone = normalizePhone($raw->phone ?? null);
    $email = mb_strtolower(trimLeadText($raw->email), 'UTF-8');
    $comment = normalizeLeadText($raw->comment);
    $emailPart = '[^@' . LEAD_WHITESPACE . ']+';
    if (leadTextLength($name) < 2 || leadTextLength($name) > 80 || !preg_match("~\A[\p{L}\p{M} .’'-]+\z~u", $name) ||
        !preg_match('~\p{L}.*\p{L}~u', $name) || $phone === null || leadTextLength($email) > 254 ||
        ($email !== '' && !preg_match('~\A' . $emailPart . '@' . $emailPart . '\.' . $emailPart . '\z~u', $email)) ||
        leadTextLength($comment) > 1000 || preg_match(UNSUPPORTED_CONTROLS, $comment)) {
        throw new LeadError(422, 'invalid_contact');
    }

    if ($inquiry) {
        $context = normalizeLeadText($raw->context ?? '');
        if (leadTextLength($context) > 500 || preg_match(UNSUPPORTED_CONTROLS, $context)) {
            throw new LeadError(422, 'invalid_context');
        }
        $facts = $config['catalogFacts'] ?? [];
        $items = property_exists($raw, 'items')
            ? validateLeadItems($raw->items, $facts)
            : [];
        if ($raw->intent === 'order' && $items === []) {
            throw new LeadError(422, 'invalid_items');
        }
        $result = [
            'name' => $name, 'phone' => $phone, 'email' => $email, 'comment' => $comment,
            'version' => $version, 'items' => $items, 'intent' => $raw->intent, 'context' => $context,
        ];
        if (property_exists($raw, 'calculation')) {
            if ($raw->intent !== 'calculation') {
                throw new LeadError(422, 'invalid_calculation');
            }
            $result['calculation'] = validateCalculation($raw->calculation, $facts);
        }
        return $result;
    }

    $items = validateLeadItems($raw->items, $config['catalog']);
    return ['name' => $name, 'phone' => $phone, 'email' => $email, 'comment' => $comment, 'items' => $items, 'version' => $version];
}

function validateLeadItems(mixed $input, array $catalog): array
{
    if (!is_array($input) || count($input) < 1 || count($input) > 45) {
        throw new LeadError(422, 'invalid_items');
    }
    $seen = [];
    $items = [];
    foreach ($input as $item) {
        $id = $item->id ?? null;
        $qty = $item->qty ?? null;
        // JSON-decoded 1.0 and 1e0 both represent an integer to the Node backend.
        $integerQuantity = is_int($qty) || (is_float($qty) && floor($qty) === $qty);
        if (!hasOnlyFields($item, ['id', 'qty']) || !is_string($id) || isset($seen[$id]) ||
            !$integerQuantity || $qty < 1 || $qty > 9999 || !array_key_exists($id, $catalog)) {
            throw new LeadError(422, 'invalid_items');
        }
        $seen[$id] = true;
        $items[] = ['id' => $id, 'qty' => (int) $qty];
    }
    $collator = new Collator('en');
    usort($items, static fn (array $a, array $b): int => $collator->compare($a['id'], $b['id']));

    return $items;
}

function calculationNumber(mixed $value, int $maximum): float
{
    if ((!is_int($value) && !is_float($value)) || !is_finite($value) || $value < 0 || $value > $maximum) {
        throw new LeadError(422, 'invalid_calculation');
    }
    return (float) $value;
}

function roundUpSheets(float $sheets): int
{
    $nearest = round($sheets);
    return (int) ($nearest > 0 && abs($sheets - $nearest) <= 4 * PHP_FLOAT_EPSILON * max(1, $sheets)
        ? $nearest : ceil($sheets));
}

function validateCalculation(mixed $input, array $catalog): array
{
    if (!is_array($input) || count($input) < 1 || count($input) > 10) {
        throw new LeadError(422, 'invalid_calculation');
    }
    $groups = [];
    foreach ($input as $group) {
        $id = $group->id ?? null;
        $item = is_string($id) ? ($catalog[$id] ?? []) : [];
        $width = ($item['widthMm'] ?? 0) / 1000;
        $height = ($item['lengthMm'] ?? 0) / 1000;
        if (!hasOnlyFields($group, ['id', 'walls', 'openings', 'reserve', 'method']) ||
            !in_array($item['kind'] ?? null, ['panel', 'flexible_stone'], true) || $width <= 0 || $height <= 0 ||
            !in_array($group->method ?? null, ['area', 'vertical'], true) ||
            !is_array($group->walls ?? null) || count($group->walls) < 1 || count($group->walls) > 20) {
            throw new LeadError(422, 'invalid_calculation');
        }
        $reserve = calculationNumber($group->reserve ?? null, 100);
        $openings = calculationNumber($group->openings ?? null, 10_000);
        $vertical = $group->method === 'vertical';
        if ($vertical && $openings > 0) {
            throw new LeadError(422, 'invalid_calculation');
        }
        $area = 0.0;
        $pieces = 0;
        $walls = [];
        foreach ($group->walls as $wall) {
            if (!hasOnlyFields($wall, ['length', 'height'])) {
                throw new LeadError(422, 'invalid_calculation');
            }
            $wallWidth = calculationNumber($wall->length ?? null, 10_000);
            $wallHeight = calculationNumber($wall->height ?? null, 10_000);
            $area += $wallWidth * $wallHeight;
            $pieces += roundUpSheets($wallWidth / $width) * roundUpSheets($wallHeight / $height);
            $walls[] = ['length' => $wallWidth, 'height' => $wallHeight];
        }
        $area = max(0, $area - $openings);
        $base = $vertical ? $pieces : $area / ($width * $height);
        $quantity = roundUpSheets($base * (1 + $reserve / 100));
        if ($quantity < 1 || $quantity > 9999) {
            throw new LeadError(422, 'invalid_calculation');
        }
        $groups[] = ['id' => $id, 'walls' => $walls, 'area' => $area, 'openings' => $openings,
            'reserve' => $reserve, 'method' => $group->method, 'qty' => $quantity, 'priceMinor' => $item['priceMinor']];
    }
    return $groups;
}
