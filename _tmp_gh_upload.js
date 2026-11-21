const fs = require('fs');
const path = require('path');
const cfg = JSON.parse(process.env.CODEBUDDY_MCP_CONFIG || '{}');
const gh = cfg.mcpServers.github;
let sessionId = null;

async function rpc(method, params) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
  Object.assign(headers, gh.headers || {});
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const res = await fetch(gh.url, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now() + Math.floor(Math.random() * 1000), method, params })
  });
  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { const l = text.split('\n').find(x => x.startsWith('data: ')); return l ? JSON.parse(l.slice(6)) : { error: { message: text.slice(0, 300) } }; }
}

async function call(name, args) {
  const r = await rpc('tools/call', { name, arguments: args });
  if (r.error) throw new Error(JSON.stringify(r.error));
  if (r.result && r.result.isError) {
    const t = r.result.content && r.result.content[0] && r.result.content[0].text;
    throw new Error(t || 'tool error');
  }
  return (r.result && r.result.content || []).map(c => c.text || '').join('\n');
}

(async () => {
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'kards-upload', version: '1.0' } });
  const root = 'E:/Workbuddy/Temp/卡兹';
  const files = [
    'README.md', 'index.html', '_nations.js',
    'favicon.svg', 'favicon-alt.svg',
    'css/style.css',
    'js/art.js', 'js/audio.js', 'js/cards.js', 'js/fx.js', 'js/game.js'
  ];
  for (const p of files) {
    let sha = null;
    try {
      const info = await call('get_file_contents', { owner: 'JLK1526', repo: 'KardsHub', path: p, ref: 'main' });
      const m = info.match(/SHA:\s*([a-f0-9]{40})/);
      if (m) sha = m[1];
    } catch (e) {
      if (!/not found|does not exist|404/i.test(e.message)) {
        console.log('  [warn] 读取 SHA 失败 ' + p + ': ' + e.message.slice(0, 120));
      }
    }
    const content = fs.readFileSync(path.join(root, p), 'utf8');
    try {
      const out = await call('create_or_update_file', {
        owner: 'JLK1526', repo: 'KardsHub', branch: 'main', path: p,
        message: '更新游戏至最新版：双主题UI、简化操作、隐藏国民党阵营、音效与特效',
        content,
        ...(sha ? { sha } : {})
      });
      console.log((sha ? 'UPDATED  ' : 'CREATED  ') + p + '  ' + out.split('\n')[0].slice(0, 90));
    } catch (e) {
      console.log('FAILED   ' + p + '  ' + e.message.slice(0, 200));
      process.exitCode = 1;
      break;
    }
  }
})().catch(e => { console.error('ERR:', e); process.exit(1); });
