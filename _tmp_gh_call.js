const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(process.env.CODEBUDDY_MCP_CONFIG || '{}');
const gh = cfg.mcpServers && cfg.mcpServers.github;
if (!gh) throw new Error('github MCP config not found');

let sessionId = null;
async function rpc(method, params) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
  Object.assign(headers, gh.headers || {});
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const res = await fetch(gh.url, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now() + Math.floor(Math.random()*1000), method, params })
  });
  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch (e) {
    const line = text.split('\n').find(l => l.startsWith('data: '));
    data = line ? JSON.parse(line.slice(6)) : { error: { message: text.slice(0, 500) } };
  }
  return data;
}

(async () => {
  const init = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'kards-upload', version: '1.0' } });
  console.log('INIT:', JSON.stringify(init).slice(0, 300));
  if (process.argv[2] === 'ping') {
    const r = await rpc('tools/call', { name: 'get_me', arguments: {} });
    console.log('PING:', JSON.stringify(r).slice(0, 500));
    return;
  }
  const root = 'E:/Workbuddy/Temp/卡兹';
  const rels = [
    'README.md', 'index.html', '_nations.js',
    'favicon.svg', 'favicon-alt.svg',
    'css/style.css',
    'js/art.js', 'js/audio.js', 'js/cards.js', 'js/fx.js', 'js/game.js'
  ];
  const files = rels.map(rel => ({ path: rel, content: fs.readFileSync(path.join(root, rel), 'utf8') }));
  const r = await rpc('tools/call', {
    name: 'push_files',
    arguments: {
      owner: 'JLK1526', repo: 'KardsHub', branch: 'main',
      message: '更新游戏至最新版：双主题UI、简化操作、隐藏国民党阵营、音效与特效',
      files
    }
  });
  console.log('PUSH:', JSON.stringify(r).slice(0, 1200));
})().catch(e => { console.error('ERR:', e); process.exit(1); });
