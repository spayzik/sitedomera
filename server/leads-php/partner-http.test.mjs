import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const file = new URL('./', import.meta.url)
const modules = ['bootstrap.php','validation.php','config.php','ledger.php','moysklad.php','http.php',
  'partner-bootstrap.php','partner-config.php','partner-store.php','partner-http.php','partner-cli.php','reconcile-partner-sales.php','partners-operations-cli.php']
const testProduct = 'pdf2026-p10-r2c1'
const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms))

test('PHP partner intake, approvals, private catalog documents, projects, attribution, sales and payout ledger', { timeout: 45_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dekoray-partner-test-'))
  const privateDir = join(directory, 'dekoray-leads')
  const statePath = join(privateDir,'state')
  const web = join(directory,'domain','public')
  const api = join(web, 'api')
  let php
  const paymentId = randomUUID()
  const crmId = randomUUID()
  const directPaymentId = randomUUID()
  try {
    await mkdir(statePath, { recursive: true, mode: 0o700 })
    await mkdir(api, { recursive: true, mode: 0o700 })
    for(const module of modules) await cp(new URL(module,file), join(privateDir,module))
    await cp(new URL('./partner-entry.php',file),join(api,'partners.php'))
    const router=join(directory,'router.php')
    await writeFile(router,`<?php require ${JSON.stringify(join(api,'partners.php').replaceAll('\\','/'))};`)
    const probe=createServer()
    probe.listen(0,'127.0.0.1')
    await once(probe,'listening')
    const port=probe.address().port
    await new Promise(done=>probe.close(done))
    const origin='http://127.0.0.1:'+port
    const endpoint=origin+'/api/partners'
    const phpPath=process.env.PARTNER_PHP ?? 'php'
    const phpArgs=process.env.PARTNER_PHP_EXT ? ['-n','-d','extension_dir='+process.env.PARTNER_PHP_EXT,
      '-d','extension=pdo_sqlite','-d','extension=openssl','-d','extension=mbstring'] : []
    const dbPath=join(statePath,'partners.sqlite')
    const paymentsPath=join(statePath,'payments-sandbox.sqlite')
    const configPath=join(privateDir,'partners.json')
    await writeFile(configPath,JSON.stringify({enabled:true,localTest:true,origin,key:randomBytes(32).toString('hex'),
      consentVersion:'fixture-1',attribution:{version:'fixture-ref1',ttlDays:60,priority:'manager_conflict'}}),{mode:0o600})
    await writeFile(join(privateDir,'catalog-contract.json'),JSON.stringify({[testProduct]:{priceMinor:800000}}),{mode:0o600})
    const payments=new DatabaseSync(paymentsPath)
    payments.exec('CREATE TABLE payment_orders (id TEXT PRIMARY KEY,crm_order_id TEXT NOT NULL,status TEXT NOT NULL,paid_at INTEGER,quote TEXT,refunded_minor INTEGER,provider_id TEXT)')
    payments.prepare('INSERT INTO payment_orders VALUES (?,?,?,?,?,?,?)').run(paymentId,crmId,'pending',null,JSON.stringify({totalMinor:800000,delivery:{priceMinor:0}}),0,null)
    payments.prepare('INSERT INTO payment_orders VALUES (?,?,?,?,?,?,?)').run(directPaymentId,randomUUID(),'pending',null,
      JSON.stringify({totalMinor:100000,delivery:{priceMinor:0}}),0,null)
    payments.close()
    if(process.platform!=='win32'){
      const {chmod}=await import('node:fs/promises')
      await chmod(privateDir,0o700)
      await chmod(paymentsPath,0o600)
    }
    const provision=async (email,password,role,partnerId)=>{
      const proc=spawn(phpPath,[...phpArgs,join(privateDir,'partner-cli.php'),'provision',web],{stdio:['pipe','pipe','pipe'],windowsHide:true})
      const output=[]
      proc.stdout.on('data',chunk=>output.push(chunk))
      proc.stdin.end(JSON.stringify({email,password,role,partnerId}))
      const [code]=await once(proc,'exit')
      assert.equal(code,0,'private credential provisioning')
      return JSON.parse(Buffer.concat(output))
    }
    await provision('manager@example.test','synthetic-manage-2026','manager')
    await provision('admin@example.test','synthetic-admin-2026','admin')
    php=spawn(phpPath,[...phpArgs,'-S','127.0.0.1:'+port,'-t',web,router],{windowsHide:true,stdio:'ignore'})
    let responding=false
    for(let tryCount=0;tryCount<80;tryCount++) {
      try {const r=await fetch(endpoint); if(r.ok){responding=true;break}} catch {}
      await delay(60)
    }
    assert(responding,'PHP partner API responds over loopback')
    const client=async ()=>{
      let cookie,csrf
      const remember=async response=>{
        const fresh=response.headers.get('set-cookie')
        if(fresh){assert.match(fresh,/HttpOnly/i);assert.match(fresh,/SameSite=Strict/i);cookie=fresh.split(';',1)[0]}
        const result=await response.json()
        if(result.csrf)csrf=result.csrf
        assert.equal(response.headers.get('cache-control'),'no-store')
        return {http:response.status,result}
      }
      const get=async ()=>remember(await fetch(endpoint,{headers:cookie?{Cookie:cookie}:{}}))
      const post=async (body)=>remember(await fetch(endpoint,{method:'POST',
        headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','X-Partner-CSRF':csrf},body:JSON.stringify(body)}))
      await get()
      return {get,post}
    }
    const applicant=await client()
    const staff=await client()
    assert.equal((await staff.post({action:'login',email:'manager@example.test',password:'synthetic-manage-2026'})).result.user.role,'manager')
    const application=async(program,email)=>applicant.post({action:'apply',program,email,name:'Тестовая компания',
      details:'Подборочная заявка',items:[{id:testProduct,quantity:3}],area:15,consent:true})
    const dealer=(await application('dealer','dealer@example.test')).result
    const designer=(await application('designer','design@example.test')).result
    assert.equal((await application('wholesale','wholesale@example.test')).http,201)
    assert.equal((await application('dropshipping_resale','drop@example.test')).http,201)
    assert.equal((await application('dealer','dealer@example.test')).result.duplicate,true)
    assert.equal((await applicant.post({action:'application_review',id:dealer.id,status:'approved'})).http,401)
    const approve=async id=>(await staff.post({action:'application_review',id,status:'approved',
      conditions:{version:'qa1',effectiveAt:Math.floor(Date.now()/1000)-30,level:'Проверенный',text:'Индивидуальные тестовые условия'}})).result.partnerId
    const dealerId=await approve(dealer.id)
    const designerId=await approve(designer.id)
    assert(dealerId&&designerId)
    await provision('dealer@example.test','synthetic-dealer-2026','partner',dealerId)
    await provision('design@example.test','synthetic-design-2026','partner',designerId)
    assert.equal((await staff.post({action:'document_set',partnerId:dealerId,title:'Тестовый дилерский прайс',format:'csv',content:'sku,price\nA9001,6500'})).http,201)
    const dealerBrowser=await client()
    const designerBrowser=await client()
    const login=(browser,email,password)=>browser.post({action:'login',email,password})
    const dealerState=(await login(dealerBrowser,'dealer@example.test','synthetic-dealer-2026')).result
    const designState=(await login(designerBrowser,'design@example.test','synthetic-design-2026')).result
    assert.equal(dealerState.account.documents.length,1)
    assert.equal(designState.account.documents.length,0)
    assert.equal(designState.manager,undefined)
    assert.equal((await designerBrowser.post({action:'document_set',partnerId:dealerId,title:'Неавторизованный',format:'text',content:'test'})).http,403)
    assert.equal((await staff.post({action:'partner_status_set',id:designerId,status:'disabled'})).http,403)
    assert.equal((await designerBrowser.post({action:'project_create',name:'Проект квартиры',area:48,items:[{id:testProduct,quantity:11}]})).http,201)
    const direct = await designerBrowser.post({action:'request_create',program:'wholesale',name:'Комплектация',items:[{id:testProduct,quantity:11}]})
    assert.equal(direct.http,201)
    assert.equal((await staff.post({action:'order_link',id:directPaymentId,requestId:direct.result.id,identityVerified:true})).http,409)
    assert.equal((await staff.post({action:'request_review',id:direct.result.id,status:'accepted'})).http,200)
    assert.equal((await staff.post({action:'order_link',id:directPaymentId,requestId:direct.result.id,identityVerified:true})).http,200)
    const drop = await dealerBrowser.post({action:'request_create',program:'dropshipping_resale',name:'Поставка',
      details:'Тестовый запрос',items:[{id:testProduct,quantity:2}]})
    assert.equal(drop.http,201)
    for(const status of ['accepted','processing','shipped','delivered']) {
      assert.equal((await staff.post({action:'request_review',id:drop.result.id,status})).http,200)
    }
    assert.equal((await designerBrowser.post({action:'request_return',id:drop.result.id,details:'Возврат после приёмки'})).http,404)
    assert.equal((await dealerBrowser.post({action:'request_return',id:drop.result.id,details:'Возврат после приёмки'})).http,200)
    assert.equal((await staff.post({action:'request_review',id:drop.result.id,status:'return_resolved'})).http,200)
    assert.equal((await dealerBrowser.get()).result.account.projects.length,0)
    const refer=async code=>applicant.post({action:'referral_create',code,clientEmail:'customer@example.test',
      consent:true,attribution:{yclid:'12345678',source:'yandex',medium:'cpc'}})
    const referral=(await refer(dealerState.account.profile.code)).result
    const competing=(await refer(designState.account.profile.code)).result
    assert(referral.id&&competing.id)
    assert.equal((await refer(dealerState.account.profile.code)).result.duplicate,true)
    assert.equal((await staff.get()).result.manager.referrals.find(r=>r.id===competing.id).status,'conflict')
    assert.equal((await staff.post({action:'referral_review',id:referral.id,status:'confirmed'})).http,200)
    assert.equal((await staff.post({action:'referral_review',id:competing.id,status:'confirmed'})).http,409)
    assert.equal((await staff.post({action:'referral_review',id:competing.id,status:'rejected'})).http,200)
    assert.equal((await staff.post({action:'order_link',id:paymentId,referralId:referral.id,identityVerified:true})).http,200)
    assert.equal((await staff.post({action:'order_link',id:paymentId,referralId:referral.id,identityVerified:true})).result.duplicate,true)
    assert.equal((await designerBrowser.get()).result.account.orders.length,1)
    assert.equal((await designerBrowser.get()).result.account.orders[0].id,directPaymentId)
    assert.equal((await dealerBrowser.get()).result.account.orders[0].id,paymentId)

    const updated=new DatabaseSync(paymentsPath)
    const saleAt=Date.now()-4000
    updated.prepare('UPDATE payment_orders SET status=?,paid_at=?,provider_id=? WHERE id=?').run('paid',saleAt,randomUUID(),paymentId)
    updated.close()
    const runFinance=async ()=>{
      const script=join(privateDir,'fixture-reconcile.php')
      await writeFile(script,`<?php require __DIR__ . '/partner-bootstrap.php'; $partner=new PDO('sqlite:'.__DIR__.'/state/partners.sqlite'); $payments=new PDO('sqlite:'.__DIR__.'/state/payments-sandbox.sqlite'); echo json_encode(Dekoray\\Partners\\partnerReconcileSales($partner,$payments,[['version'=>'approved-fixture','approved'=>true,'programs'=>['dealer'],'from'=>time()-3600,'to'=>time()+3600,'rateBps'=>500,'base'=>'order_total','holdDays'=>0]]));`,{mode:0o600})
      const child=spawn(phpPath,[...phpArgs,script],{windowsHide:true,stdio:['ignore','pipe','inherit']})
      const chunks=[]
      child.stdout.on('data',chunk=>chunks.push(chunk))
      const [code]=await once(child,'exit')
      assert.equal(code,0)
      return JSON.parse(Buffer.concat(chunks))
    }
    assert.equal((await runFinance()).reconciled,1)
    assert.equal((await runFinance()).reconciled,0)
    const paid=(await dealerBrowser.get()).result.account
    assert.equal(paid.accruals[0].amount_minor,40000)
    assert.equal((await designerBrowser.get()).result.account.accruals.length,0)
    assert.equal((await staff.post({action:'payout_record',id:paymentId,reference:'test-confirmed-111',amountMinor:20000})).http,200)
    const refDb=new DatabaseSync(paymentsPath)
    refDb.prepare('UPDATE payment_orders SET status=?,refunded_minor=? WHERE id=?').run('partially_refunded',200000,paymentId)
    refDb.close()
    assert.equal((await runFinance()).reconciled,1)
    const credited=(await dealerBrowser.get()).result.account
    assert.equal(credited.orders[0].status,'partially_refunded')
    assert.equal(credited.accruals[0].amount_minor,30000)
    assert.equal(credited.payouts[0].amount_minor,20000)
    assert.equal(credited.adjustments[0].delta_minor,-10000)
    await delay(1100)
    const end = Math.floor(Date.now()/1000)
    const collect = async args => {
      const child=spawn(phpPath,[...phpArgs,join(privateDir,'partners-operations-cli.php'),...args],
        {windowsHide:true,stdio:['ignore','pipe','inherit']})
      const chunks=[]
      child.stdout.on('data',chunk=>chunks.push(chunk))
      const [code]=await once(child,'exit')
      assert.equal(code,0)
      return Buffer.concat(chunks).toString()
    }
    const exported=await collect(['offline',web,String(end-3600),String(end)])
    assert.match(exported,/ClientID,yclid,Target,DateTime/)
    assert.match(exported,/12345678,referral_lead_confirmed/)
    assert.match(exported,/12345678,partner_sale_confirmed/)
    assert.doesNotMatch(exported,/@example\.test|policy|dealer/)
    const fullRefund=new DatabaseSync(paymentsPath)
    fullRefund.prepare('UPDATE payment_orders SET status=?,refunded_minor=? WHERE id=?').run('refunded',800000,paymentId)
    fullRefund.close()
    assert.equal((await runFinance()).reconciled,1)
    assert.equal((await runFinance()).reconciled,0)
    const reversed=(await dealerBrowser.get()).result.account
    assert.equal(reversed.orders[0].status,'refunded')
    assert.equal(reversed.accruals[0].amount_minor,0)
    assert.equal(reversed.accruals[0].paid_minor,20000)
    assert.equal((await staff.post({action:'payout_record',id:paymentId,reference:'surplus-denied',amountMinor:1})).http,409)
    const db=new DatabaseSync(dbPath)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM partner_orders').get().n,2)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM partner_commission_events').get().n,3)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM partner_payouts').get().n,1)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM partner_referrals WHERE client_cipher LIKE ?').get('%customer@example.test%').n,0)
    db.close()
    const administrator=await client()
    assert.equal((await login(administrator,'admin@example.test','synthetic-admin-2026')).result.user.role,'admin')
    assert.equal((await administrator.post({action:'partner_status_set',id:designerId,status:'disabled'})).http,200)
    assert.equal((await designerBrowser.get()).result.user,null)
  } finally {
    if(php && php.exitCode===null){php.kill();await once(php,'exit').catch(()=>{})}
    if(!process.env.KEEP_PARTNER_FIXTURE)await rm(directory,{recursive:true,force:true})
  }
})
