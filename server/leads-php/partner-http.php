<?php
declare(strict_types=1);

namespace Dekoray\Partners;

use Dekoray\Leads\LeadError;
use Throwable;
use function Dekoray\Leads\hasOnlyFields;
use function Dekoray\Leads\leadHeaders;
use function Dekoray\Leads\readLeadBody;
use function Dekoray\Leads\reply;
use const Dekoray\Leads\UUID;
use const Dekoray\Leads\UNSUPPORTED_CONTROLS;

function partnerId(mixed $value): string
{
    if (!is_string($value) || !preg_match(UUID, $value)) {
        throw new LeadError(422, 'invalid_request');
    }
    return strtolower($value);
}

function partnerText(mixed $value, int $minimum, int $maximum): string
{
    if (!is_string($value) || strlen($value) > 4 * $maximum + 8 || !mb_check_encoding($value, 'UTF-8') ||
        preg_match(UNSUPPORTED_CONTROLS, $value)) {
        throw new LeadError(422, 'invalid_request');
    }
    $result = trim($value);
    $length = mb_strlen($result, 'UTF-8');
    if ($length < $minimum || $length > $maximum) {
        throw new LeadError(422, 'invalid_request');
    }
    return $result;
}

function partnerEmail(mixed $value): string
{
    $email = strtolower(partnerText($value, 3, 254));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new LeadError(422, 'invalid_request');
    }
    return $email;
}

function partnerProgram(mixed $value): string
{
    if (!in_array($value, PARTNER_PROGRAMS, true)) {
        throw new LeadError(422, 'invalid_request');
    }
    return $value;
}

function partnerArea(mixed $value): int|float|null
{
    if ($value === null) {
        return null;
    }
    if ((!is_int($value) && !is_float($value)) || !is_finite($value) || $value <= 0 || $value > 100000) {
        throw new LeadError(422, 'invalid_request');
    }
    return $value;
}

function validatePartnerCsv(string $content): void
{
    // Only a flat comma-delimited dialect is supported. Reject spreadsheet formulas
    // in every cell instead of relying on escaping by the browser or delimiter heuristics.
    if (str_contains($content, ';') || str_contains($content, "\t")) {
        throw new LeadError(422, 'unsafe_document');
    }
    foreach (preg_split('~\r\n|\r|\n~', $content) as $line) {
        foreach (str_getcsv($line, ',', '"', '') as $cell) {
            if (is_string($cell) && preg_match('~\A[\p{Z}\p{Cf}"]*[=+@\-]~uD', $cell)) {
                throw new LeadError(422, 'unsafe_document');
            }
        }
    }
}

function partnerHeaders(): void
{
    leadHeaders();
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    header('Referrer-Policy: no-referrer');
}

function partnerState(array $config, PartnerStore $store, string $token): array
{
    $session = $store->session($token);
    if (!$session) {
        throw new LeadError(403, 'csrf_invalid');
    }
    $id = $session['user_id'];
    $user = $id === null ? null : ['id' => $id, 'email' => $session['email'], 'role' => $session['role']];
    $result = ['available' => true, 'user' => $user, 'csrf' => $store->csrf($token),
        'consentPath' => $config['consentPath'], 'consentVersion' => $config['consentVersion']];
    return match ($session['role']) {
        'partner' => $result + ['account' => $store->account($session['partner_id'])],
        'manager', 'admin' => $result + ['manager' => $store->manager()],
        default => $result,
    };
}

function servePartners(array $config, PartnerStore $store): void
{
    partnerHeaders();
    try {
        $method = $_SERVER['REQUEST_METHOD'] ?? '';
        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
        $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? null;
        if (($origin !== null && $origin !== $config['origin']) ||
            ($site !== null && !in_array($site, ['same-origin','none'], true))) {
            throw new LeadError(403, 'origin_denied');
        }
        $cookie = $config['localTest'] ? 'dek_partner_test' : '__Host-dek_partner';
        $setToken = static function (string $value) use ($config, $cookie): void {
            if (!setcookie($cookie, $value, ['path' => '/', 'secure' => !$config['localTest'],
                'httponly' => true, 'samesite' => 'Strict'])) {
                throw partnerUnavailable();
            }
        };
        $token = (string) ($_COOKIE[$cookie] ?? '');
        $session = $store->session($token);
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        if ($method === 'GET') {
            if (!$session) {
                $store->limit('session', $ip, 30);
                $token = $store->issueSession();
                $setToken($token);
            }
            reply(200, partnerState($config, $store, $token));
            return;
        }
        if ($method !== 'POST') {
            header('Allow: GET, POST');
            throw new LeadError(405, 'method_not_allowed');
        }
        if ($origin !== $config['origin']) {
            throw new LeadError(403, 'origin_denied');
        }
        if (!preg_match('~\Aapplication/json(?:\s*;[^\r\n]*)?\z~iD', $_SERVER['CONTENT_TYPE'] ?? '')) {
            throw new LeadError(415, 'json_required');
        }
        if (!$session || !hash_equals($store->csrf($token), $_SERVER['HTTP_X_PARTNER_CSRF'] ?? '')) {
            throw new LeadError(403, 'csrf_invalid');
        }
        $store->limit('write', $ip, 60);
        $body = readLeadBody();
        $name = $body->action ?? null;
        if (!is_string($name)) {
            throw new LeadError(422, 'invalid_request');
        }
        $contract = [
            'apply' => ['public','program','name','email','details','items','area','code','consent','attribution'],
            'login' => ['public','email','password'],
            'logout' => ['public'],
            'project_create' => ['partner','name','area','items'],
            'request_create' => ['partner','program','name','details','items','area'],
            'request_return' => ['partner','id','details'],
            'referral_create' => ['public','code','clientEmail','details','consent','attribution'],
            'application_review' => ['staff','id','status','conditions'],
            'conditions_set' => ['staff','partnerId','version','text','level','effectiveAt'],
            'document_set' => ['staff','partnerId','title','format','content'],
            'request_review' => ['staff','id','status'],
            'referral_review' => ['staff','id','status'],
            'order_link' => ['staff','id','referralId','requestId','identityVerified'],
            'payout_record' => ['staff','id','reference','amountMinor'],
            'counterparty_link' => ['staff','id','crmCounterpartyId','identityVerified'],
            'partner_status_set' => ['admin','id','status'],
        ];
        $allowed = $contract[$name] ?? null;
        if ($allowed === null || !hasOnlyFields($body, ['action', ...array_slice($allowed, 1)])) {
            throw new LeadError(422, 'invalid_request');
        }
        $role = $session['role'];
        $access = array_shift($allowed);
        if ($access !== 'public' && $role === null) {
            throw new LeadError(401, 'authentication_required');
        }
        if (($access === 'partner' && $role !== 'partner') ||
            ($access === 'staff' && !in_array($role, ['manager','admin'], true)) ||
            ($access === 'admin' && $role !== 'admin')) {
            throw new LeadError(403, 'forbidden');
        }
        if ($name === 'login') {
            $store->limit('login_ip', $ip, 18, 3600);
            $token = $store->login($token, $body->email ?? null, $body->password ?? null);
            $setToken($token);
            reply(200, partnerState($config, $store, $token));
            return;
        }
        if ($name === 'logout') {
            $store->revoke($token);
            $token = $store->issueSession();
            $setToken($token);
            reply(200, partnerState($config, $store, $token));
            return;
        }
        if ($name === 'apply' || $name === 'referral_create') {
            $store->limit('intake', $ip, 10, 3600);
        }
        $partnerId = $session['partner_id'];
        $actor = $session['user_id'];
        $result = match ($name) {
            'apply' => $store->apply($body),
            'project_create' => $store->createProject($body, $partnerId),
            'request_create' => $store->createRequest($body, $partnerId),
            'request_return' => $store->requestReturn($body, $partnerId),
            'referral_create' => $store->createReferral($body, $partnerId),
            'application_review' => $store->reviewApplication($body, $actor),
            'conditions_set' => $store->assignConditions($body, $actor),
            'document_set' => $store->saveDocument($body, $actor),
            'request_review' => $store->requestReview($body, $actor),
            'referral_review' => $store->reviewReferral($body, $actor),
            'order_link' => $store->linkOrder($body, $actor),
            'payout_record' => $store->recordPayout($body, $actor),
            'partner_status_set' => $store->setPartnerStatus($body, $actor),
            'counterparty_link' => $store->linkCounterparty($body, $actor),
        };
        $created = in_array($name, ['apply','project_create','request_create','referral_create','document_set'], true) &&
            ($result['duplicate'] ?? false) !== true;
        reply($created ? 201 : 200, $result);
    } catch (Throwable $error) {
        if ($error instanceof LeadError) {
            if ($error->status === 429) {
                header('Retry-After: 60');
            }
            reply($error->status, ['error' => $error->errorCode]);
            return;
        }
        error_log('[dekoray-partners] request_failed');
        reply(503, ['error' => 'partners_unavailable']);
    }
}
