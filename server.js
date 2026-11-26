const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = parseInt(process.env.PORT || '8080', 10);
const UUID = process.env.UUID || 'ff949010-66e9-4953-8826-4652990f0339';
const SB_VERSION = '1.14.4';
const SB_SYSTEM = '/usr/local/bin/sing-box';
const SB_LOCAL = '/tmp/sing-box';
let SB_BIN = SB_SYSTEM;
const TARBALL_URL = 'https://github.com/SagerNet/sing-box/releases/download/v' + SB_VERSION + '/sing-box-' + SB_VERSION + '-linux-amd64.tar.gz';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return resolve(download(res.headers.location, dest));
      }
      if (res.statusCode !== 200) return reject(new Error('download HTTP ' + res.statusCode));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data.trim()));
    }).on('error', () => resolve(''));
  });
}

async function setup() {
  if (fs.existsSync(SB_SYSTEM)) {
    SB_BIN = SB_SYSTEM;
    console.log('[cue] using preinstalled sing-box at ' + SB_SYSTEM);
  } else {
    SB_BIN = SB_LOCAL;
    if (!fs.existsSync(SB_BIN)) {
      console.log('[cue] downloading sing-box v' + SB_VERSION + ' ...');
      await download(TARBALL_URL, '/tmp/sb.tar.gz');
      execSync('tar -xzOf /tmp/sb.tar.gz sing-box-' + SB_VERSION + '-linux-amd64/sing-box > ' + SB_BIN, { stdio: 'inherit' });
      fs.chmodSync(SB_BIN, 0o755);
      console.log('[cue] sing-box installed');
    }
  }
  const ver = execSync(SB_BIN + ' version').toString().trim().split('\n')[0];
  console.log('[cue] ' + ver);
}

function writeConfig() {
  const cfg = {
    log: { level: 'info', timestamp: true },
    inbounds: [
      {
        type: 'vless',
        tag: 'vless-in',
        listen: '0.0.0.0',
        listen_port: PORT,
        users: [{ uuid: UUID }],
        transport: { type: 'ws', path: '/cue' }
      }
    ],
    outbounds: [{ type: 'direct', tag: 'direct' }]
  };
  fs.writeFileSync('/tmp/config.json', JSON.stringify(cfg, null, 2));
}

async function main() {
  await setup();
  const ip = (await fetchText('https://ipinfo.io/ip')) || (await fetchText('http://ip-api.com/line/?fields=query'));
  console.log('[cue] EGRESS_IP=' + (ip || 'unknown'));
  writeConfig();
  console.log('[cue] starting sing-box: vless+ws listen 0.0.0.0:' + PORT + ' path /cue');
  const child = spawn(SB_BIN, ['run', '-c', '/tmp/config.json'], { stdio: 'inherit' });
  child.on('exit', (code) => {
    console.log('[cue] sing-box exited code=' + code + ', restarting in 3s');
    setTimeout(main, 3000);
  });
  process.on('SIGTERM', () => child.kill('SIGTERM'));
  process.on('SIGINT', () => child.kill('SIGINT'));
}

main().catch((e) => {
  console.error('[cue] fatal: ' + e.message);
  process.exit(1);
});
