const fs = require('fs');
const cfg = JSON.parse(process.env.CODEBUDDY_MCP_CONFIG || '{}');
const gh = cfg.mcpServers.github;
let sessionId = null;
async function rpc(method, params) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
  Object.assign(headers, gh.headers || {});
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const res = await fetch(gh.url, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
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
  const txt = r.result && r.result.content && r.result.content[0] && r.result.content[0].text;
  if (r.result && r.result.isError) throw new Error(txt);
  return txt;
}
(async () => {
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'kards-single', version: '1.0' } });
  const p = 'README.md';
  let sha = null;
  try {
    const info = await call('get_file_contents', { owner: 'JLK1526', repo: 'KardsHub', path: p, ref: 'main' });
    const obj = JSON.parse(info);
    sha = obj.sha || null;
  } catch (e) { console.log('get sha failed:', e.message); }
  console.log('sha:', sha);
  const out = await call('create_or_update_file', {
    owner: 'JLK1526', repo: 'KardsHub', branch: 'main', path: p,
    message: 'test single file write',
    content: fs.readFileSync('E:/Workbuddy/Temp/卡兹/README.md', 'utf8'),
    ...(sha ? { sha } : {})
  });
  console.log('WRITE:', String(out).slice(0, 500));
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
