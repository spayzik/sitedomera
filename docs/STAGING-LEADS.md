# Размещение изолированного PHP API для GitHub Pages

Площадка должна быть выделена для проверки и доступна по отдельному HTTPS-имени. Нужны Node.js 24, PHP 8.3 CLI с cURL, PDO SQLite, mbstring, intl, DOM и OpenSSL, а также обратный прокси с установленным TLS. Действующие хостинг, DNS, CRM, контакты менеджеров и конфигурация production для запуска не требуются. Если тариф разрешает только PHP FastCGI без собственного процесса или настройки прокси, согласуйте отдельную площадку, на которой возможен этот запуск.

## Процесс API

На изолированном хосте разместите точную версию source branch вне общедоступного каталога. Отдельному непривилегированному пользователю нужны права чтения checkout и записи в закрытый временный каталог. Установите Node.js и PHP с перечисленными расширениями. Проверка окружения и запуск:

```sh
node --version
php -r 'foreach (["curl","pdo_sqlite","mbstring","intl","dom","openssl"] as $ext) { if (!extension_loaded($ext)) { fwrite(STDERR, "Missing $ext\n"); exit(1); } }'
umask 077
export DEKORAY_STAGING_PORT=8789
# Задайте DEKORAY_STAGING_TEST_ACCESS через защищённое окружение службы.
node server/leads-php/test/staging.mjs
```

Код доступа должен содержать 32–128 символов из `A–Z a–z 0–9 _ -`. Например, `openssl rand -hex 32` в защищённом терминале. Храните значение в хранилище секретов окружения staging. Передайте тестеру через проверенный закрытый канал. В Git, параметры сборки Vite, URL и журналы код не записывают. Служба слушает только IPv4 loopback. Она использует отдельную SQLite и локального синтетического получателя. Штатная остановка тестовой службы удаляет её временный каталог. Перезапуск самого PHP проверяется отдельно, пока сохраняются данные тестовой сессии.

## Прокси HTTPS

В изолированной конфигурации Nginx задайте разрешённое тестовое имя и пути к установленному сертификату. Следующий фрагмент добавляется в контекст `http`. Требуется применить именно к отдельному тестовому виртуальному хосту. Проверка и начитка изменений выполняются администратором тестового хоста.

```nginx
limit_req_zone $binary_remote_addr zone=dekoray_staging_ip:10m rate=6r/m;

server {
    listen 443 ssl;
    server_name <имя-тестового-api>;
    ssl_certificate <путь-к-сертификату>;
    ssl_certificate_key <путь-к-приватному-ключу>;
    access_log off;
    error_log /var/log/nginx/dekoray-staging-error.log warn;
    client_max_body_size 16k;
    limit_req_status 429;

    location = /api/lead {
        limit_req zone=dekoray_staging_ip burst=4 nodelay;
        proxy_pass http://127.0.0.1:8789;
        proxy_read_timeout 20s;
    }

    location = /legal/lead-consent.html {
        proxy_pass http://127.0.0.1:8789;
        proxy_read_timeout 15s;
    }

    location / { return 404; }
}
```

CORS управляется PHP. Не добавляйте `Access-Control-Allow-Origin: *`, credentials или второй CORS-заголовок в прокси. Если нужны журналы, пишите только статусы, длительность и агрегаты. Тела запроса, заголовки, коды повтора и параметры доступа не логируются. Встроенный лимит PHP учитывает локальный адрес прокси как один источник с общим лимитом восемь POST в минуту, поэтому тесты отправки выполняйте последовательно с паузой после 429. Для отдельного источника публичного снимка остатков примените контракт из [MOYSKLAD-INVENTORY.md](MOYSKLAD-INVENTORY.md).

## Проверка и сборка сайта

Замените значение `STAGING_API` на фактический согласованный адрес. Все следующие запросы только читают readiness, документ согласия или CORS.

```sh
STAGING_API='https://<имя-тестового-api>'
curl --fail-with-body -i "$STAGING_API/api/lead" -H 'Origin: https://spayzik.github.io'
curl --fail-with-body -i "$STAGING_API/legal/lead-consent.html" -H 'Origin: https://spayzik.github.io'
curl --fail-with-body -i -X OPTIONS "$STAGING_API/api/lead" \
  -H 'Origin: https://spayzik.github.io' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,idempotency-key,x-dekoray-test-access'
curl -i -X OPTIONS "$STAGING_API/api/lead" -H 'Origin: https://example.invalid'
```

Ожидаются readiness `200` и `mode: staging`, согласие `200` с той же версией, preflight `204` и точный Origin, для постороннего Origin — `403` и отсутствие разрешающего заголовка. Браузерную сборку выполняйте из точного утверждённого commit.

```sh
npm ci
VITE_DEKORAY_STAGING_LEAD_API="$STAGING_API/api/lead" node scripts/build-profile.mjs staging
```

После публикации staging откройте форму в браузере под тестовым кодом. Поля контактов заполнены синтетическими значениями. Проверьте статус ответа, квитанцию и единственную доставку для повтора. По окончании выделенной сессии остановите службу и отзовите тестовый код. [Профили релиза](RELEASE-PROFILES.md) · [Режимы PHP](MOYSKLAD-LEADS.md)
