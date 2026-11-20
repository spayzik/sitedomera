import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fixture, id, mapped, receipt, sentinel, organizationId, intakeStateId } from './test/fixture.mjs'
import { validateLead as validateNode } from '../leads/validation.mjs'
import { digest as digestNode, syncId as nodeSyncId } from '../leads/ledger.mjs'

const contact = {
  name: 'Синтетический Пример', phone: '+447700900123', email: 'testing@example.invalid',
  comment: 'Синтетический тест', website: '', consent: {accepted:true,version:'qa-php-only'},
}
const consultation = { ...contact, intent:'consultation', context:'A9001 · 1220 × 3000 мм' }
const selection = { ...contact, items:[{id,qty:5}] }
const post = (app, body, key = randomUUID(), headers = {}) => fetch(app.origin + '/api/lead', {
  method:'POST', headers: {Origin:app.origin, 'Content-Type':'application/json', 'Idempotency-Key':key, ...headers},
  body: typeof body === 'string' ? body : JSON.stringify(body),
})
async function check(response, status, body) {
  assert.equal(response.status, status)
  const raw = await response.text()
  assert(!raw.includes(sentinel))
  assert.deepEqual(JSON.parse(raw), body)
}
function php(code, ...arguments_) {
  const extensions = process.env.DEKORAY_PHP_EXT
    ? ['-n','-d','extension_dir=' + process.env.DEKORAY_PHP_EXT,
      ...['curl','intl','mbstring','pdo_sqlite'].flatMap(ext => ['-d','extension=' + ext])]
    : []
  return execFileSync(process.env.DEKORAY_PHP_BIN || 'php', [...extensions, '-r', code, ...arguments_],
    {encoding:'utf8', windowsHide:true, stdio:['ignore','pipe','pipe']})
}

test('shared contract: PHP and Node normalize the same verified cart and derive matching syncId; no stock write', async t => {
  const app = await fixture()
  t.after(() => app.close())
  await check(await fetch(app.origin + '/api/lead'), 200, {
    status:'ready', consentPath:app.config.consentPath, consentVersion:app.config.consentVersion,
    cart:true, intents:['consultation','selection','calculation','samples'],
  })
  const key = randomUUID()
  await check(await post(app, selection, key), 201, {status:'accepted',requestId:receipt})
  const normalized = validateNode(selection, {...app.config, catalog:new Map(Object.entries(app.config.catalog))})
  const context = {
    organizationId:app.config.organizationId, intakeStateId:app.config.intakeStateId,
    items:[app.config.catalog[id]],
  }
  const database = new DatabaseSync(app.config.ledgerPath, {readOnly:true})
  const row = database.prepare('SELECT * FROM operations').get()
  database.close()
  assert.equal(row.fingerprint, digestNode(app.config.hashKey, 'payload', JSON.stringify([normalized,context])))
  assert.equal(app.attempts[0].syncId, nodeSyncId(app.config.hashKey,'customerorder',digestNode(app.config.hashKey,'ledger-id',key)))
  assert.deepEqual(app.attempts[0].positions.map(item => [item.quantity, item.price, new URL(item.assortment.meta.href).pathname.split('/').at(-1)]),
    [[5, 800000, mapped]])
  await app.restart()
  await check(await post(app, selection, key), 200, {status:'accepted',requestId:receipt})
  await check(await post(app, selection), 200, {status:'accepted',requestId:receipt})
  await check(await post(app, {...selection,comment:'Другой текст'}, key), 409, {error:'idempotency_conflict'})
  assert.equal(app.orders.size, 1)
  assert.equal(app.attempts.length, 1)
  const bytes = await readFile(app.config.ledgerPath)
  for (const datum of [contact.name,contact.phone,contact.email,contact.comment,sentinel,key]) {
    assert(!bytes.includes(Buffer.from(datum)))
    assert(!app.logs().includes(datum))
  }
})

test('rejects cross-origin/unsupported methods, wrong media, malformed or oversize input, stale consent and unmapped/spam', async t => {
  const app = await fixture()
  t.after(() => app.close())
  await check(await post(app, consultation, undefined, {Origin:'https://other.example'}), 403, {error:'origin_denied'})
  await check(await post(app, consultation, undefined, {'Sec-Fetch-Site':'cross-site'}), 403, {error:'origin_denied'})
  await check(await fetch(app.origin + '/api/lead', {method:'DELETE'}), 405, {error:'method_not_allowed'})
  await check(await post(app, consultation, undefined, {'Content-Type':'text/plain'}), 415, {error:'json_required'})
  await check(await post(app, '{not json'), 400, {error:'invalid_json'})
  await check(await post(app, 'x'.repeat(16_385)), 413, {error:'body_too_large'})
  await check(await post(app, consultation, 'wrong-key'), 400, {error:'idempotency_key_required'})
  await check(await post(app, {...selection,items:[{id:'unmapped',qty:1}]}), 422, {error:'invalid_items'})
  await check(await post(app, {...consultation,consent:{accepted:true,version:'prior-version'}}), 422, {error:'consent_required'})
  await check(await post(app, {...consultation,website:'bot'}), 422, {error:'invalid_request'})
  assert.equal(app.orders.size, 0)
})

test('caps requests per client despite varying forwarded addresses', async t => {
  const app = await fixture()
  t.after(() => app.close())
  for (let index = 0; index < 8; index++) {
    await check(await post(app, '{}', undefined, {'X-Forwarded-For':'192.0.2.' + index}), 422, {error:'invalid_request'})
  }
  const restricted = await post(app, consultation)
  assert.equal(restricted.headers.get('Retry-After'), '60')
  await check(restricted, 429, {error:'rate_limit'})
  assert.equal(app.orders.size, 0)
})

test('sanitizes provider failures and reconciles persisted uncertain outcome after PHP restarts', async t => {
  const app = await fixture()
  t.after(() => app.close())
  const key = randomUUID()
  for (const mode of [401,403,429,503,'bad-ack','timeout']) {
    app.failNext(mode)
    await check(await post(app, consultation, key), 503, {error:'temporarily_unavailable'})
  }
  assert.equal(app.orders.size,1)
  await app.restart()
  await check(await post(app, consultation), 201, {status:'accepted',requestId:receipt})
  assert.equal(app.orders.size,1)
  assert.equal(new Set(app.attempts.map(order => order.syncId)).size,1)
  assert(app.attempts.every(order => !Object.hasOwn(order,'positions') && order.description.includes('A9001')))
  await check(await post(app, consultation, key), 200, {status:'accepted',requestId:receipt})
  assert(!app.logs().includes(sentinel))
})

test('production entry rejects alternate direct paths, host or cleartext and requires approved exact consent', async t => {
  const directory = await mkdtemp(join(tmpdir(),'dekoray-entry-'))
  t.after(() => rm(directory,{recursive:true,force:true}))
  const root = join(directory,'www','site')
  const privateRoot = join(directory,'dekoray-leads')
  await mkdir(join(root,'api'),{recursive:true})
  await mkdir(join(root,'legal'),{recursive:true})
  await mkdir(join(privateRoot,'state'),{recursive:true,mode:0o700})
  for (const name of ['bootstrap','validation','config','ledger','moysklad','http']) {
    await copyFile(new URL('./' + name + '.php',import.meta.url),join(privateRoot,name + '.php'))
  }
  const entry = join(root,'api','lead.php')
  await copyFile(new URL('./entry.php',import.meta.url),entry)
  const consentPath = '/legal/lead-consent.html'
  const consentFile = join(root,'legal','lead-consent.html')
  const legal = '<meta name="dekoray-consent-version" content="qa-php-only">'
  await writeFile(consentFile,legal)
  await writeFile(join(privateRoot,'catalog-contract.json'),JSON.stringify({[id]:{unit:'лист',priceMinor:800000}}))
  const config = {
    enabled:true, crmSafetyVerified:false, token:sentinel, organizationId,intakeStateId,
    consentVersion:'qa-php-only',consentPath,consentSha256:createHash('sha256').update(legal).digest('hex'),
    hashKey:'8'.repeat(64),retentionDays:90,catalog:{},
  }
  const configPath = join(privateRoot,'config.json')
  const environment = {REQUEST_URI:'/api/lead', HTTP_HOST:'xn--80ahdrdyo.xn--p1ai',HTTPS:'on',REQUEST_METHOD:'GET'}
  function probe(overrides = {}) {
    const result = php('$_SERVER = json_decode($argv[1],true); require $argv[2]; echo "\n",http_response_code();',
      JSON.stringify({...environment,...overrides}),entry)
    assert(!result.includes(sentinel))
    const [body,status] = result.split(/\r?\n/)
    return [Number(status),JSON.parse(body)]
  }
  const unavailable = [503,{error:'temporarily_unavailable'}]
  assert.deepEqual(probe({REQUEST_URI:'/api/lead.php'}),[404,{error:'not_found'}])
  assert.deepEqual(probe({HTTP_HOST:'wrong.example'}),[403,{error:'origin_denied'}])
  assert.deepEqual(probe({HTTPS:'off'}),[403,{error:'origin_denied'}])
  assert.deepEqual(probe(),unavailable)
  await writeFile(configPath,JSON.stringify(config),{mode:0o600})
  assert.deepEqual(probe(),unavailable)
  await writeFile(configPath,JSON.stringify({...config,crmSafetyVerified:true}),{mode:0o600})
  const [status, body] = probe()
  assert.equal(status,200)
  assert.equal(body.consentVersion,'qa-php-only')
  assert.equal(body.cart,false)
  await writeFile(consentFile,legal + '<p>different</p>')
  assert.deepEqual(probe(),unavailable)
})

test('another PHP process cannot claim an active submission or discard its unresolved identity', async t => {
  const app = await fixture()
  t.after(() => app.close())
  const input = [app.config.ledgerPath, app.config.hashKey, randomUUID(), 'a'.repeat(64)]
  const code = 'require "server/leads-php/bootstrap.php"; $db=new Dekoray\\Leads\\Ledger($argv[1],$argv[2],90); ' +
    'try { echo json_encode($db->reserve($argv[3],$argv[4],"qa-php-only")); } ' +
    'catch(Dekoray\\Leads\\LeadError $e) { echo json_encode(["error"=>$e->errorCode]); }'
  const first = JSON.parse(php(code,...input))
  assert(first.lease > Date.now())
  assert.deepEqual(JSON.parse(php(code,...input)),{error:'request_in_progress'})
  const db = new DatabaseSync(app.config.ledgerPath)
  db.prepare('UPDATE operations SET consent_at = ?, lease_until = 0 WHERE key = ?')
    .run(Date.now() - 91 * 86_400_000,first.key)
  db.close()
  const resumed = JSON.parse(php(code,input[0],input[1],randomUUID(),input[3]))
  assert.equal(resumed.key,first.key)
})

test('MoySklad preflight uses only GET, follows the verified variant parent unit and detects a mismatch', () => {
  const code = `require "server/leads-php/bootstrap.php";
    $base = "https://api.moysklad.ru/api/remap/1.2/entity";
    $org = "d9edcfd8-bd63-4f87-9a9c-786119447b04"; $state = "ec5d5794-dbf5-4fbe-a6da-8eedc723105e";
    $variant = "94898ac4-f516-4755-91e4-07dbd9ebaa9d"; $uom = "a106c786-6007-402c-90a3-20e9c181de7a";
    $parent = "7cdd0000-09ac-4500-ada2-f88240c7e22e";
    $entity = fn($id,$type) => ["id"=>$id,"meta"=>["type"=>$type,"href"=>"$base/$type/$id"]];
    $transport = function($url,$method,$body) use($base,$org,$state,$variant,$uom,$parent,$entity) {
        if ($method !== "GET" || $body !== null) throw new RuntimeException("not read-only");
        $data = match ($url) {
          "$base/organization/$org" => $entity($org,"organization"),
          "$base/customerorder/metadata" => ["states"=>[$entity($state,"state")]],
          "$base/variant/$variant" => $entity($variant,"variant") + ["product"=>$entity($parent,"product")],
          "$base/product/$parent" => $entity($parent,"product") + ["uom"=>$entity($uom,"uom")],
          "$base/uom/$uom" => $entity($uom,"uom"),
          default => throw new RuntimeException("unexpected fixture resource"),
        };
        return ["status"=>200,"body"=>json_encode($data)];
    };
    $config=["organizationId"=>$org,"intakeStateId"=>$state,"catalog"=>[["id"=>$variant,"type"=>"variant","uomId"=>$uom]]];
    $verified=(new Dekoray\\Leads\\MoySklad($config,$transport))->preflight();
    $config["catalog"][0]["uomId"]=$state;
    try { (new Dekoray\\Leads\\MoySklad($config,$transport))->preflight(); }
    catch(Dekoray\\Leads\\LeadError $error) { $verified["mismatch"]=$error->errorCode; }
    echo json_encode($verified);`
  assert.deepEqual(JSON.parse(php(code)),{
    organization:'visible',intakeState:'visible',mappedProducts:1,verifiedUnitReferences:1,mismatch:'mapped_unit_invalid',
  })
})
