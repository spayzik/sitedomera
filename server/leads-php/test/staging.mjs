import { fixture } from './fixture.mjs'

const access = process.env.DEKORAY_STAGING_TEST_ACCESS ?? ''
const port = Number(process.env.DEKORAY_STAGING_PORT ?? '8789')
if (!/^[A-Za-z0-9_-]{32,128}$/.test(access) || !Number.isInteger(port) || port < 1024 || port > 65535) {
  process.stderr.write('Set a random 32–128 character DEKORAY_STAGING_TEST_ACCESS and a loopback port.\n')
  process.exitCode = 1
} else {
  const app = await fixture({staging:{access,port}})
  process.stdout.write('Synthetic PHP staging listening on ' + app.origin + '.\n')
  try {
    await new Promise(resolve => {
      process.once('SIGINT', resolve)
      process.once('SIGTERM', resolve)
    })
  } finally {
    await app.close()
  }
}
