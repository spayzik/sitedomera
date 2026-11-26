<?php
declare(strict_types=1);

namespace Dekoray\Partners;

use Dekoray\Leads\LeadError;
use PDO;
use PDOStatement;
use Throwable;
use function Dekoray\Leads\digest;
use function Dekoray\Leads\hasOnlyFields;
use function Dekoray\Leads\syncId;
use const Dekoray\Leads\JSON_FLAGS;
use const Dekoray\Leads\UUID;

final class PartnerStore
{
    private readonly PDO $db;

    public function __construct(private readonly array $config)
    {
        $this->db = new PDO('sqlite:' . $config['database'], options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $this->db->exec('PRAGMA busy_timeout = 4000; PRAGMA foreign_keys = ON; PRAGMA synchronous = FULL; PRAGMA secure_delete = ON;');
        $this->db->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS partners (
                id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, program TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('active','disabled')), code TEXT UNIQUE NOT NULL,
                crm_counterparty_id TEXT UNIQUE, created_at INTEGER NOT NULL, UNIQUE(email,program)
            );
            CREATE TABLE IF NOT EXISTS partner_applications (
                id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, program TEXT NOT NULL, details TEXT NOT NULL,
                consent_version TEXT NOT NULL, status TEXT NOT NULL, partner_id TEXT REFERENCES partners(id),
                created_at INTEGER NOT NULL, reviewed_at INTEGER, reviewed_by TEXT,
                UNIQUE(email, program)
            );
            CREATE TABLE IF NOT EXISTS partner_users (
                id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, credential TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('partner','manager','admin')), partner_id TEXT UNIQUE REFERENCES partners(id),
                active INTEGER NOT NULL CHECK(active IN (0,1)), created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS partner_sessions (
                token_hash TEXT PRIMARY KEY, user_id TEXT REFERENCES partner_users(id), expires_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS partner_sessions_expiry ON partner_sessions(expires_at);
            CREATE TABLE IF NOT EXISTS partner_rate (
                subject TEXT NOT NULL, window INTEGER NOT NULL, hits INTEGER NOT NULL, PRIMARY KEY(subject,window)
            );
            CREATE TABLE IF NOT EXISTS partner_conditions (
                id TEXT PRIMARY KEY, partner_id TEXT NOT NULL REFERENCES partners(id), version TEXT NOT NULL,
                text TEXT NOT NULL, level TEXT NOT NULL, effective_at INTEGER NOT NULL, created_at INTEGER NOT NULL,
                UNIQUE(partner_id,version), UNIQUE(partner_id,effective_at)
            );
            CREATE TABLE IF NOT EXISTS partner_documents (
                id TEXT PRIMARY KEY, partner_id TEXT NOT NULL REFERENCES partners(id), title TEXT NOT NULL,
                format TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS partner_projects (
                id TEXT PRIMARY KEY, partner_id TEXT NOT NULL REFERENCES partners(id), name TEXT NOT NULL,
                area REAL, items TEXT NOT NULL, created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS partner_requests (
                id TEXT PRIMARY KEY, partner_id TEXT NOT NULL REFERENCES partners(id), program TEXT NOT NULL,
                name TEXT NOT NULL, details TEXT NOT NULL, items TEXT NOT NULL, status TEXT NOT NULL,
                created_at INTEGER NOT NULL, return_case TEXT
            );
            CREATE TABLE IF NOT EXISTS partner_referrals (
                id TEXT PRIMARY KEY, partner_id TEXT NOT NULL REFERENCES partners(id), client_key TEXT NOT NULL,
                client_cipher TEXT NOT NULL, details TEXT NOT NULL, status TEXT NOT NULL,
                consent_version TEXT NOT NULL, policy_version TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
                resolved_at INTEGER, resolved_by TEXT
            );
            CREATE INDEX IF NOT EXISTS partner_referrals_client ON partner_referrals(client_key, status);
            CREATE TABLE IF NOT EXISTS partner_orders (
                id TEXT PRIMARY KEY, partner_id TEXT NOT NULL REFERENCES partners(id),
                referral_id TEXT REFERENCES partner_referrals(id), request_id TEXT REFERENCES partner_requests(id),
                status TEXT NOT NULL DEFAULT 'linked', created_at INTEGER NOT NULL, linked_by TEXT NOT NULL, crm_order_id TEXT NOT NULL UNIQUE,
                CHECK((referral_id IS NULL) <> (request_id IS NULL))
            );
            CREATE TABLE IF NOT EXISTS partner_marketing (
                entity_id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, attribution TEXT NOT NULL, created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS partner_audit (
                id INTEGER PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, subject_id TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            SQL);
    }

    private function sql(string $sql, array $params = []): PDOStatement
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    private function one(string $sql, array $params): array|false
    {
        return $this->sql($sql, $params)->fetch();
    }

    private function atomic(callable $operation): mixed
    {
        $this->db->exec('BEGIN IMMEDIATE');
        try {
            $result = $operation();
            $this->db->exec('COMMIT');
            return $result;
        } catch (Throwable $error) {
            $this->db->exec('ROLLBACK');
            throw $error;
        }
    }

    private function id(string $kind): string
    {
        return syncId($this->config['key'], 'partner-' . $kind, bin2hex(random_bytes(24)));
    }

    private function hash(string $kind, string $value): string
    {
        return digest($this->config['key'], 'partner-' . $kind, $value);
    }

    public function limit(string $operation, string $identity, int $max, int $seconds = 60): void
    {
        $subject = $this->hash('rate', $operation . '|' . $identity);
        $now = time();
        $window = $now - ($now % $seconds);
        $hits = $this->sql('INSERT INTO partner_rate VALUES (?, ?, 1)
            ON CONFLICT(subject,window) DO UPDATE SET hits = min(hits+1, ?)
            RETURNING hits', [$subject, $window, $max + 1])->fetchColumn();
        if ((int) $hits > $max) {
            throw new LeadError(429, 'rate_limited');
        }
        if (random_int(1, 48) === 1) {
            $this->sql('DELETE FROM partner_rate WHERE window < ?', [$now - 7200]);
            $this->sql('DELETE FROM partner_sessions WHERE expires_at < ?', [$now]);
        }
    }

    public function issueSession(?string $userId = null): string
    {
        $token = bin2hex(random_bytes(32));
        $this->sql('INSERT INTO partner_sessions VALUES (?, ?, ?)',
            [$this->hash('session', $token), $userId, time() + ($userId === null ? 3600 : 28800)]);
        return $token;
    }

    public function session(string $token): array|false
    {
        if (!preg_match('~\A[a-f0-9]{64}\z~D', $token)) {
            return false;
        }
        return $this->one('SELECT s.user_id, u.email, u.role, u.partner_id FROM partner_sessions s
            LEFT JOIN partner_users u ON u.id = s.user_id
            LEFT JOIN partners p ON p.id = u.partner_id
            WHERE s.token_hash = ? AND s.expires_at > ?
              AND (s.user_id IS NULL OR (u.active = 1 AND (u.role <> \'partner\' OR p.status = \'active\')))',
            [$this->hash('session', $token), time()]);
    }

    public function csrf(string $token): string
    {
        return $this->hash('csrf', $token);
    }

    public function revoke(string $token): void
    {
        $this->sql('DELETE FROM partner_sessions WHERE token_hash = ?', [$this->hash('session', $token)]);
    }

    public function login(string $token, mixed $emailInput, mixed $passwordInput): string
    {
        $email = partnerEmail($emailInput);
        $password = is_string($passwordInput) && strlen($passwordInput) <= 72 && !str_contains($passwordInput, "\0")
            ? $passwordInput : '';
        $this->limit('login_identity', $email, 12, 3600);
        $user = $this->one('SELECT u.*, p.status AS partner_status FROM partner_users u
            LEFT JOIN partners p ON p.id = u.partner_id WHERE u.email = ?', [$email]);
        $hash = $user ? $user['credential'] : '$2y$10$VJ4LpGbF5eq0OMn7q9upKO6/y9YgLKbXDnU96zr/9JYnDkIg2eaFq';
        if (!password_verify($password, $hash) || !$user || (int) $user['active'] !== 1 ||
            ($user['role'] === 'partner' && $user['partner_status'] !== 'active')) {
            throw new LeadError(401, 'invalid_credentials');
        }
        return $this->atomic(function () use ($token, $password, $user): string {
            if (password_needs_rehash($user['credential'], PASSWORD_DEFAULT)) {
                $this->sql('UPDATE partner_users SET credential = ? WHERE id = ? AND credential = ?',
                    [password_hash($password, PASSWORD_DEFAULT), $user['id'], $user['credential']]);
            }
            $this->revoke($token);
            return $this->issueSession($user['id']);
        });
    }

    /** Admin and manager credentials are issued only via the private operator CLI. */
    public function provision(mixed $emailInput, mixed $password, mixed $role, mixed $partnerId = null): array
    {
        $email = partnerEmail($emailInput);
        if (!is_string($password) || strlen($password) < 12 || strlen($password) > 72 || str_contains($password, "\0") ||
            !in_array($role, ['partner','manager','admin'], true)) {
            throw new LeadError(422, 'invalid_request');
        }
        if ($role === 'partner') {
            $partnerId = partnerId($partnerId);
            $partner = $this->one('SELECT email,status FROM partners WHERE id=?', [$partnerId]);
            if (!$partner || $partner['status'] !== 'active' || $partner['email'] !== $email) {
                throw new LeadError(409, 'partner_not_approved');
            }
        } elseif ($partnerId !== null) {
            throw new LeadError(422, 'invalid_request');
        }
        $digest = password_hash($password, PASSWORD_DEFAULT);
        return $this->atomic(function () use ($email, $digest, $role, $partnerId): array {
            $existing = $this->one('SELECT id,role,partner_id FROM partner_users WHERE email=?', [$email]);
            if ($existing && ($existing['role'] !== $role || $existing['partner_id'] !== $partnerId)) {
                throw new LeadError(409, 'conflict');
            }
            $id = $existing['id'] ?? $this->id('user');
            if ($existing) {
                $this->sql('UPDATE partner_users SET credential=?,active=1 WHERE id=?', [$digest, $id]);
                $this->sql('DELETE FROM partner_sessions WHERE user_id=?', [$id]);
            } else {
                $this->sql('INSERT INTO partner_users VALUES (?,?,?,?,?,1,?)', [$id, $email, $digest, $role, $partnerId, time()]);
            }
            $this->audit('operator', 'credential_provisioned', $id);
            return ['id' => $id, 'role' => $role];
        });
    }

    private function audit(string $actor, string $action, string $subject): void
    {
        $this->sql('INSERT INTO partner_audit (actor_id, action, subject_id, created_at) VALUES (?,?,?,?)',
            [$actor, $action, $subject, time()]);
    }

    private function marketing(string $id, string $type, mixed $value): void
    {
        if ($value === null || !function_exists(__NAMESPACE__ . '\\partnerMarketingAttribution')) {
            return;
        }
        $attribution = partnerMarketingAttribution($value);
        if ($attribution !== null) {
            $this->sql('INSERT OR IGNORE INTO partner_marketing VALUES (?,?,?,?)',
                [$id, $type, json_encode($attribution, JSON_FLAGS), time()]);
        }
    }

    public function apply(object $body): array
    {
        $program = partnerProgram($body->program ?? null);
        $name = partnerText($body->name ?? null, 2, 120);
        $email = partnerEmail($body->email ?? null);
        $details = partnerText($body->details ?? '', 0, 1800);
        $items = $this->items($body->items ?? []);
        $area = partnerArea($body->area ?? null);
        if (($body->consent ?? false) !== true) {
            throw new LeadError(422, 'consent_required');
        }
        // Keep the buyer's own request and commercial scope on the application.
        if ($items !== [] || $area !== null) {
            $details .= "\n" . json_encode(['area' => $area, 'items' => $items], JSON_FLAGS);
        }
        return $this->atomic(function () use ($body, $program, $name, $email, $details): array {
            $existing = $this->one('SELECT id FROM partner_applications WHERE email=? AND program=?', [$email, $program]);
            if ($existing) {
                // Return only a receipt, never the decision or associated account.
                return ['id' => $existing['id'], 'status' => 'received', 'duplicate' => true];
            }
            $id = $this->id('application');
            $this->sql('INSERT INTO partner_applications (id,email,name,program,details,consent_version,status,created_at)
                VALUES (?,?,?,?,?,?,\'pending\',?)', [$id, $email, $name, $program, $details, $this->config['consentVersion'], time()]);
            $this->marketing($id, 'application', $body->attribution ?? null);
            $attributed = false;
            if (isset($body->code) && $this->config['attribution'] !== null) {
                try {
                    $this->createReferral($body, null, $email);
                    $attributed = true;
                } catch (LeadError $error) {
                    if (!in_array($error->errorCode, ['invalid_referral', 'invalid_request'], true)) {
                        throw $error;
                    }
                }
            }
            return ['id' => $id, 'status' => 'received', 'referralRecorded' => $attributed];
        });
    }

    private function items(mixed $value): array
    {
        if (!is_array($value) || count($value) > 45) {
            throw new LeadError(422, 'invalid_request');
        }
        $result = [];
        foreach ($value as $item) {
            $id = $item->id ?? '';
            $quantity = $item->quantity ?? null;
            if (!hasOnlyFields($item, ['id','quantity']) || !is_string($id) || !isset($this->config['catalog'][$id]) ||
                isset($result[$id]) || !is_int($quantity) || $quantity < 1 || $quantity > 9999) {
                throw new LeadError(422, 'invalid_request');
            }
            $result[$id] = ['id' => $id, 'quantity' => $quantity];
        }
        return array_values($result);
    }

    public function createProject(object $body, string $partnerId): array
    {
        $name = partnerText($body->name ?? null, 2, 120);
        $area = partnerArea($body->area ?? null);
        $items = $this->items($body->items ?? []);
        if ($area === null && $items === []) {
            throw new LeadError(422, 'invalid_request');
        }
        $id = $this->id('project');
        $this->sql('INSERT INTO partner_projects VALUES (?,?,?,?,?,?)', [$id, $partnerId, $name, $area, json_encode($items, JSON_FLAGS), time()]);
        return ['id' => $id, 'status' => 'created'];
    }

    public function createRequest(object $body, string $partnerId): array
    {
        $program = partnerProgram($body->program ?? null);
        $name = partnerText($body->name ?? null, 2, 120);
        $details = partnerText($body->details ?? '', 0, 1500);
        $items = $this->items($body->items ?? []);
        $area = partnerArea($body->area ?? null);
        if ($items === [] && $area === null && $details === '') {
            throw new LeadError(422, 'invalid_request');
        }
        if ($area !== null) {
            $details = trim($details . "\n" . 'Площадь, м²: ' . (string) $area);
        }
        $encoded = json_encode($items, JSON_FLAGS);
        return $this->atomic(function () use ($program, $name, $details, $encoded, $partnerId): array {
            $row = $this->one('SELECT id FROM partner_requests WHERE partner_id=? AND program=? AND name=?
                AND details=? AND items=? AND status=\'pending\'', [$partnerId, $program, $name, $details, $encoded]);
            if ($row) {
                return ['id' => $row['id'], 'status' => 'pending', 'duplicate' => true];
            }
            $id = $this->id('request');
            $this->sql('INSERT INTO partner_requests (id,partner_id,program,name,details,items,status,created_at)
                VALUES (?,?,?,?,?,?,\'pending\',?)',
                [$id, $partnerId, $program, $name, $details, $encoded, time()]);
            return ['id' => $id, 'status' => 'pending'];
        });
    }

    public function createReferral(object $body, ?string $partnerId, ?string $applicationEmail = null): array
    {
        $policy = $this->config['attribution'];
        if ($policy === null) {
            throw new LeadError(503, 'attribution_unavailable');
        }
        $email = $applicationEmail ?? partnerEmail($body->clientEmail ?? null);
        $details = partnerText($applicationEmail ? '' : ($body->details ?? ''), 0, 1000);
        if (($body->consent ?? false) !== true) {
            throw new LeadError(422, 'consent_required');
        }
        if ($partnerId !== null) {
            $partner = $this->one('SELECT id,email,code FROM partners WHERE id=? AND status=\'active\'', [$partnerId]);
        } else {
            $code = is_string($body->code ?? null) ? strtoupper($body->code) : '';
            if (!preg_match('~\A[A-F0-9]{16}\z~D', $code)) {
                throw new LeadError(422, 'invalid_request');
            }
            $partner = $this->one('SELECT id,email,code FROM partners WHERE code=? AND status=\'active\'', [$code]);
        }
        if (!$partner || $partner['email'] === $email) {
            throw new LeadError(409, 'invalid_referral');
        }
        $clientKey = $this->hash('client', $email);
        $now = time();
        $insert = function () use ($body, $partner, $clientKey, $email, $details, $policy, $now): array {
            $existing = $this->one('SELECT r.id FROM partner_referrals r WHERE r.partner_id=? AND r.client_key=?
                AND r.expires_at > ? AND r.status <> \'rejected\' ORDER BY r.created_at DESC LIMIT 1', [$partner['id'], $clientKey, $now]);
            if ($existing) {
                return ['id' => $existing['id'], 'status' => 'received', 'duplicate' => true];
            }
            $competing = $this->one('SELECT id FROM partner_referrals WHERE client_key=? AND partner_id<>?
                AND status IN (\'pending\',\'confirmed\',\'conflict\') AND expires_at > ? LIMIT 1',
                [$clientKey, $partner['id'], $now]);
            $status = $competing && $policy['priority'] === 'manager_conflict' ? 'conflict' : 'pending';
            $id = $this->id('referral');
            $this->sql('INSERT INTO partner_referrals (id,partner_id,client_key,client_cipher,details,status,consent_version,
                policy_version,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [$id, $partner['id'], $clientKey, $this->encryptClient($id, $email), $details, $status,
                    $this->config['consentVersion'], $policy['version'], $now, $now + $policy['ttlDays'] * 86400]);
            $this->marketing($id, 'referral', $body->attribution ?? null);
            return ['id' => $id, 'status' => 'received'];
        };
        // Application and attribution must commit as a single action.
        return $applicationEmail !== null ? $insert() : $this->atomic($insert);
    }

    private function clientKey(): string
    {
        return hex2bin($this->hash('encryption', 'client-email'));
    }

    private function encryptClient(string $id, string $email): string
    {
        $nonce = random_bytes(12);
        $encrypted = openssl_encrypt($email, 'aes-256-gcm', $this->clientKey(), OPENSSL_RAW_DATA, $nonce, $tag, $id);
        if ($encrypted === false) {
            throw partnerUnavailable();
        }
        return base64_encode($nonce . $tag . $encrypted);
    }

    private function decryptClient(string $id, string $encoded): string
    {
        $raw = base64_decode($encoded, true);
        if (!is_string($raw) || strlen($raw) <= 28) {
            throw partnerUnavailable();
        }
        $email = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $this->clientKey(), OPENSSL_RAW_DATA,
            substr($raw, 0, 12), substr($raw, 12, 16), $id);
        return $email === false ? throw partnerUnavailable() : $email;
    }

    public function reviewApplication(object $body, string $actor): array
    {
        $id = partnerId($body->id ?? null);
        $decision = $body->status ?? null;
        if (!in_array($decision, ['approved','rejected'], true)) {
            throw new LeadError(422, 'invalid_request');
        }
        return $this->atomic(function () use ($id, $decision, $actor, $body): array {
            $row = $this->one('SELECT * FROM partner_applications WHERE id=?', [$id]);
            if (!$row) {
                throw new LeadError(404, 'not_found');
            }
            if ($row['status'] === $decision) {
                return ['id' => $id, 'status' => $decision, 'partnerId' => $row['partner_id'], 'duplicate' => true];
            }
            if ($row['status'] !== 'pending') {
                throw new LeadError(409, 'conflict');
            }
            $partnerId = null;
            if ($decision === 'approved') {
                $existing = $this->one('SELECT id,status FROM partners WHERE email=? ORDER BY created_at LIMIT 1', [$row['email']]);
                if ($existing && $existing['status'] !== 'active') {
                    throw new LeadError(409, 'partner_disabled');
                }
                $partnerId = $existing['id'] ?? $this->id('profile');
                if (!$existing) {
                    $this->sql('INSERT INTO partners (id,email,name,program,status,code,created_at) VALUES (?,?,?,?,\'active\',?,?)',
                        [$partnerId, $row['email'], $row['name'], $row['program'], strtoupper(bin2hex(random_bytes(8))), time()]);
                }
                if (isset($body->conditions) && $body->conditions !== '') {
                    if (is_string($body->conditions)) {
                        $conditions = (object) ['version' => 'approval-' . substr($id, 0, 12),
                            'text' => $body->conditions, 'effectiveAt' => time()];
                    } elseif (hasOnlyFields($body->conditions, ['version','text','level','effectiveAt'])) {
                        $conditions = $body->conditions;
                    } else {
                        throw new LeadError(422, 'invalid_request');
                    }
                    $this->saveConditions($partnerId, $conditions, $actor);
                }
            }
            $this->sql('UPDATE partner_applications SET status=?,partner_id=?,reviewed_at=?,reviewed_by=? WHERE id=?',
                [$decision, $partnerId, time(), $actor, $id]);
            $this->audit($actor, 'application_' . $decision, $id);
            return ['id' => $id, 'status' => $decision, 'partnerId' => $partnerId];
        });
    }

    public function saveConditions(string $partnerId, object $body, string $actor): array
    {
        $version = partnerText($body->version ?? null, 1, 64);
        $text = partnerText($body->text ?? null, 2, 3500);
        $level = partnerText($body->level ?? '', 0, 80);
        $effectiveAt = $body->effectiveAt ?? null;
        if (!preg_match('~\A[A-Za-z0-9._-]+\z~D', $version) ||
            !is_int($effectiveAt) || $effectiveAt < 946684800 || $effectiveAt > time() + 365 * 86400 ||
            !$this->one('SELECT id FROM partners WHERE id=? AND status=\'active\'', [$partnerId])) {
            throw new LeadError(422, 'invalid_request');
        }
        $id = $this->id('conditions');
        $insert = $this->sql('INSERT OR IGNORE INTO partner_conditions VALUES (?,?,?,?,?,?,?)',
            [$id, $partnerId, $version, $text, $level, $effectiveAt, time()]);
        if ($insert->rowCount() !== 1) {
            throw new LeadError(409, 'conflict');
        }
        $this->audit($actor, 'conditions_set', $id);
        return ['id' => $id, 'version' => $version];
    }

    public function assignConditions(object $body, string $actor): array
    {
        return $this->atomic(fn (): array => $this->saveConditions(partnerId($body->partnerId ?? null), $body, $actor));
    }

    public function saveDocument(object $body, string $actor): array
    {
        $partnerId = partnerId($body->partnerId ?? null);
        $title = partnerText($body->title ?? null, 2, 120);
        $format = $body->format ?? null;
        $content = partnerText($body->content ?? null, 1, 10000);
        if (!in_array($format, ['text','csv'], true) ||
            !$this->one('SELECT id FROM partners WHERE id=? AND status=\'active\'', [$partnerId])) {
            throw new LeadError(422, 'invalid_request');
        }
        if ($format === 'csv') {
            validatePartnerCsv($content);
        }
        return $this->atomic(function () use ($partnerId, $title, $format, $content, $actor): array {
            $id = $this->id('document');
            $this->sql('INSERT INTO partner_documents VALUES (?,?,?,?,?,?)', [$id, $partnerId, $title, $format, $content, time()]);
            $this->audit($actor, 'document_set', $id);
            return ['id' => $id, 'status' => 'created'];
        });
    }

    public function requestReview(object $body, string $actor): array
    {
        $id = partnerId($body->id ?? null);
        $status = $body->status ?? null;
        if (!in_array($status, ['accepted','rejected','processing','shipped','delivered','canceled','return_resolved','return_declined'], true)) {
            throw new LeadError(422, 'invalid_request');
        }
        return $this->atomic(function () use ($id, $status, $actor): array {
            $row = $this->one('SELECT status,program FROM partner_requests WHERE id=?', [$id]);
            if (!$row) {
                throw new LeadError(404, 'not_found');
            }
            if ($row['status'] === $status) {
                return ['id' => $id, 'status' => $status, 'duplicate' => true];
            }
            $allowed = ['pending' => ['accepted','rejected']];
            if ($row['program'] === 'dropshipping_resale') {
                $allowed += ['accepted' => ['processing','canceled'], 'processing' => ['shipped','canceled'],
                    'shipped' => ['delivered'], 'return_requested' => ['return_resolved','return_declined']];
            }
            if (!in_array($status, $allowed[$row['status']] ?? [], true)) {
                throw new LeadError(409, 'conflict');
            }
            $this->sql('UPDATE partner_requests SET status=? WHERE id=?', [$status, $id]);
            $this->audit($actor, 'request_' . $status, $id);
            return ['id' => $id, 'status' => $status];
        });
    }

    public function requestReturn(object $body, string $partnerId): array
    {
        $id = partnerId($body->id ?? null);
        $details = partnerText($body->details ?? null, 5, 1000);
        return $this->atomic(function () use ($id, $details, $partnerId): array {
            $row = $this->one('SELECT status,return_case FROM partner_requests WHERE id=? AND partner_id=?
                AND program=\'dropshipping_resale\'', [$id, $partnerId]);
            if (!$row) {
                throw new LeadError(404, 'not_found');
            }
            if ($row['status'] === 'return_requested' && $row['return_case'] === $details) {
                return ['id' => $id, 'status' => 'return_requested', 'duplicate' => true];
            }
            if ($row['status'] !== 'delivered') {
                throw new LeadError(409, 'conflict');
            }
            $this->sql('UPDATE partner_requests SET status=\'return_requested\',return_case=? WHERE id=?', [$details, $id]);
            $this->audit($partnerId, 'return_requested', $id);
            return ['id' => $id, 'status' => 'return_requested'];
        });
    }

    public function reviewReferral(object $body, string $actor): array
    {
        $id = partnerId($body->id ?? null);
        $decision = $body->status ?? null;
        if (!in_array($decision, ['confirmed','rejected'], true)) {
            throw new LeadError(422, 'invalid_request');
        }
        return $this->atomic(function () use ($id, $decision, $actor): array {
            $row = $this->one('SELECT * FROM partner_referrals WHERE id=?', [$id]);
            if (!$row) {
                throw new LeadError(404, 'not_found');
            }
            if ($row['status'] === $decision) {
                return ['id' => $id, 'status' => $decision, 'duplicate' => true];
            }
            if (($decision === 'confirmed' && ($row['expires_at'] <= time() || $row['status'] === 'rejected')) ||
                ($decision === 'rejected' && $this->one('SELECT id FROM partner_orders WHERE referral_id=? LIMIT 1', [$id]))) {
                throw new LeadError(409, 'conflict');
            }
            if ($decision === 'confirmed' && $this->one('SELECT id FROM partner_referrals
                WHERE client_key=? AND id<>? AND status=\'confirmed\' AND expires_at > ? LIMIT 1',
                [$row['client_key'], $id, time()])) {
                throw new LeadError(409, 'referral_conflict');
            }
            $this->sql('UPDATE partner_referrals SET status=?, resolved_at=?, resolved_by=? WHERE id=?', [$decision, time(), $actor, $id]);
            $this->audit($actor, 'referral_' . $decision, $id);
            return ['id' => $id, 'status' => $decision];
        });
    }

    public function linkOrder(object $body, string $actor): array
    {
        $orderId = partnerId($body->id ?? null);
        if (isset($body->referralId) === isset($body->requestId)) {
            throw new LeadError(422, 'invalid_request');
        }
        $referralId = isset($body->referralId) ? partnerId($body->referralId) : null;
        $requestId = isset($body->requestId) ? partnerId($body->requestId) : null;
        if (($body->identityVerified ?? false) !== true) {
            throw new LeadError(422, 'identity_required');
        }
        if ($this->config['payment'] === null) {
            throw new LeadError(503, 'orders_unavailable');
        }
        $payments = new PDO('sqlite:' . $this->config['payment'], options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $payments->exec('PRAGMA query_only = ON; PRAGMA busy_timeout = 2500;');
        $lookup = $payments->prepare('SELECT crm_order_id FROM payment_orders WHERE id=?');
        $lookup->execute([$orderId]);
        $crmOrderId = $lookup->fetchColumn();
        if (!is_string($crmOrderId) || !preg_match(UUID, $crmOrderId)) {
            throw new LeadError(404, 'not_found');
        }
        return $this->atomic(function () use ($orderId, $referralId, $requestId, $crmOrderId, $actor): array {
            $existing = $this->one('SELECT id,referral_id,request_id,status FROM partner_orders WHERE id=? OR crm_order_id=?', [$orderId, $crmOrderId]);
            if ($existing) {
                if ($existing['id'] !== $orderId || $existing['referral_id'] !== $referralId || $existing['request_id'] !== $requestId) {
                    throw new LeadError(409, 'order_already_linked');
                }
                return ['id' => $orderId, 'status' => $existing['status'], 'duplicate' => true];
            }
            $row = $referralId !== null
                ? $this->one('SELECT r.partner_id FROM partner_referrals r JOIN partners p ON p.id=r.partner_id
                    WHERE r.id=? AND r.status=\'confirmed\' AND r.expires_at > ? AND p.status=\'active\'', [$referralId, time()])
                : $this->one('SELECT r.partner_id FROM partner_requests r JOIN partners p ON p.id=r.partner_id
                    WHERE r.id=? AND r.status IN (\'accepted\',\'processing\',\'shipped\',\'delivered\')
                    AND p.status=\'active\'', [$requestId]);
            if (!$row) {
                throw new LeadError(409, $referralId !== null ? 'referral_not_confirmed' : 'request_not_accepted');
            }
            $this->sql('INSERT INTO partner_orders (id,partner_id,referral_id,request_id,created_at,linked_by,crm_order_id)
                VALUES (?,?,?,?,?,?,?)', [$orderId, $row['partner_id'], $referralId, $requestId, time(), $actor, $crmOrderId]);
            $this->audit($actor, 'order_identity_verified_and_linked', $orderId);
            return ['id' => $orderId, 'status' => 'linked'];
        });
    }

    public function setPartnerStatus(object $body, string $actor): array
    {
        $id = partnerId($body->id ?? null);
        $status = $body->status ?? null;
        if (!in_array($status, ['active','disabled'], true)) {
            throw new LeadError(422, 'invalid_request');
        }
        return $this->atomic(function () use ($id, $status, $actor): array {
            if (!$this->one('SELECT id FROM partners WHERE id = ?', [$id])) {
                throw new LeadError(404, 'not_found');
            }
            $this->sql('UPDATE partners SET status=? WHERE id=?', [$status, $id]);
            $this->sql('DELETE FROM partner_sessions WHERE user_id IN (SELECT id FROM partner_users WHERE partner_id=?)', [$id]);
            $this->audit($actor, 'partner_' . $status, $id);
            return ['id' => $id, 'status' => $status];
        });
    }

    public function linkCounterparty(object $body, string $actor): array
    {
        $id = partnerId($body->id ?? null);
        $crmId = partnerId($body->crmCounterpartyId ?? null);
        if (($body->identityVerified ?? false) !== true) {
            throw new LeadError(422, 'identity_required');
        }
        return $this->atomic(function () use ($id, $crmId, $actor): array {
            $row = $this->one('SELECT crm_counterparty_id FROM partners WHERE id=?', [$id]);
            if (!$row) {
                throw new LeadError(404, 'not_found');
            }
            if ($row['crm_counterparty_id'] === $crmId) {
                return ['id' => $id, 'status' => 'linked', 'duplicate' => true];
            }
            if ($row['crm_counterparty_id'] !== null ||
                $this->one('SELECT id FROM partners WHERE crm_counterparty_id=?', [$crmId])) {
                throw new LeadError(409, 'conflict');
            }
            $this->sql('UPDATE partners SET crm_counterparty_id=? WHERE id=?', [$crmId, $id]);
            $this->audit($actor, 'counterparty_identity_verified_and_linked', $id);
            return ['id' => $id, 'status' => 'linked'];
        });
    }

    private function itemRows(string $sql, array $params = []): array
    {
        return array_map(static function (array $row): array {
            $row['items'] = json_decode($row['items'], true, 16, JSON_THROW_ON_ERROR);
            return $row;
        }, $this->sql($sql, $params)->fetchAll());
    }

    public function finance(string $partnerId): array
    {
        if (!function_exists(__NAMESPACE__ . '\\partnerFinanceView')) {
            return ['accruals' => [], 'adjustments' => [], 'payouts' => []];
        }
        return partnerFinanceView($this->db, $partnerId);
    }

    public function recordPayout(object $body, string $actor): array
    {
        if (!function_exists(__NAMESPACE__ . '\\partnerRecordPayout')) {
            throw partnerUnavailable();
        }
        $id = partnerId($body->id ?? null);
        $reference = partnerText($body->reference ?? null, 1, 120);
        $amount = $body->amountMinor ?? null;
        if (!is_int($amount) || $amount <= 0) {
            throw new LeadError(422, 'invalid_request');
        }
        return partnerRecordPayout($this->db, $id, $reference, $actor, $amount);
    }

    public function account(string $partnerId): array
    {
        $profile = $this->one('SELECT id,name,email,program,status,code FROM partners WHERE id=? AND status=\'active\'', [$partnerId]);
        if (!$profile) {
            throw new LeadError(403, 'forbidden');
        }
        $conditions = $this->one('SELECT version,text,level,effective_at AS effectiveAt FROM partner_conditions
            WHERE partner_id=? AND effective_at <= ? ORDER BY effective_at DESC LIMIT 1', [$partnerId, time()]);
        return ['profile' => $profile, 'conditions' => $conditions ?: null,
            'projects' => $this->itemRows('SELECT id,name,area,items,created_at AS createdAt FROM partner_projects
                WHERE partner_id=? ORDER BY created_at DESC LIMIT 100', [$partnerId]),
            'requests' => $this->itemRows('SELECT id,program,name,details,items,status,return_case AS returnCase,created_at AS createdAt FROM partner_requests
                WHERE partner_id=? ORDER BY created_at DESC LIMIT 100', [$partnerId]),
            'referrals' => $this->sql('SELECT id,status,created_at AS createdAt FROM partner_referrals
                WHERE partner_id=? ORDER BY created_at DESC LIMIT 100', [$partnerId])->fetchAll(),
            'orders' => $this->sql('SELECT id,referral_id AS referralId,request_id AS requestId,status,created_at AS createdAt FROM partner_orders
                WHERE partner_id=? ORDER BY created_at DESC LIMIT 100', [$partnerId])->fetchAll(),
            'documents' => $this->sql('SELECT id,title,format,content,created_at AS createdAt FROM partner_documents
                WHERE partner_id=? ORDER BY created_at DESC LIMIT 25', [$partnerId])->fetchAll(),
        ] + $this->finance($partnerId);
    }

    public function manager(): array
    {
        $referrals = $this->sql('SELECT r.id,r.partner_id AS partnerId,p.code,r.status,r.details,r.client_cipher,
                r.created_at AS createdAt,r.expires_at AS expiresAt
            FROM partner_referrals r JOIN partners p ON p.id=r.partner_id ORDER BY r.created_at DESC LIMIT 100')->fetchAll();
        foreach ($referrals as &$referral) {
            $referral['clientEmail'] = $this->decryptClient($referral['id'], $referral['client_cipher']);
            unset($referral['client_cipher']);
        }
        unset($referral);
        return [
            'applications' => $this->sql('SELECT id,name,email,program,details,status,created_at AS createdAt,partner_id AS partnerId
                FROM partner_applications ORDER BY (status=\'pending\') DESC,created_at DESC LIMIT 100')->fetchAll(),
            'requests' => $this->itemRows('SELECT id,partner_id AS partnerId,program,name,details,items,status,created_at AS createdAt
                FROM partner_requests ORDER BY (status=\'pending\') DESC,created_at DESC LIMIT 100'),
            'referrals' => $referrals,
            'orders' => $this->sql('SELECT id,partner_id AS partnerId,referral_id AS referralId,status,created_at AS createdAt
                FROM partner_orders ORDER BY created_at DESC LIMIT 100')->fetchAll(),
            'partners' => $this->sql('SELECT id,name,email,program,code,status FROM partners ORDER BY created_at DESC LIMIT 100')->fetchAll(),
        ] + $this->finance('');
    }
}
