const { execSync } = require('child_process');

function listTargets() {
  return JSON.parse(execSync('curl -s http://127.0.0.1:9224/json/version').toString()).webSocketDebuggerUrl;
}
function wsSend(ws, id, method, params) {
  return new Promise((res) => {
    const payload = JSON.stringify({ id, method, params });
    ws.send(payload);
    const onMsg = (d) => {
      const m = JSON.parse(d.data ? d.data.toString() : d.toString());
      if (m.id === id) { ws.removeEventListener('message', onMsg); res(m.result); }
    };
    ws.addEventListener('message', onMsg);
  });
}

(async () => {
  const url = listTargets();
  const ws = new WebSocket(url);
  await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
  let id = 1;
  const send = (m, p) => wsSend(ws, id++, m, p);
  await send('Page.enable');
  await send('Runtime.enable');
  const ev = (expr) => send('Runtime.evaluate', { expression: expr, returnByValue: true }).then(r => r.result.value);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html' });
  await sleep(1200);

  const nations = await ev(`(()=>{
    const btns=[...document.querySelectorAll('.nation')];
    return { count: btns.length, keys: btns.map(b=>b.dataset.nation),
      badges: btns.map(b=>(b.querySelector('.badge')||{}).innerHTML||'').filter(s=>s.includes('<svg')).length };
  })()`);

  await ev(`document.querySelector('.nation.sov').click();`);
  await sleep(150);
  const chosen = await ev(`document.querySelector('.nation.on').dataset.nation`);
  await ev(`document.getElementById('startBtn').click();`);
  await sleep(600);

  const game = await ev(`(()=>{
    if(!window.S) return {noS:true};
    return { playerNation:S.playerNation, foeNation:S.foeNation,
      playerDeckLen:S.p.player.deck.length,
      sovInDeck:S.p.player.deck.filter(x=>x.startsWith('s')).length,
      foeIsSov:S.foeNation==='sov' };
  })()`);

  await send('Page.captureScreenshot', { format: 'png', path: '_ns_start.png' });
  await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html' });
  await sleep(900);
  await send('Page.captureScreenshot', { format: 'png', path: '_ns_start2.png' });

  console.log(JSON.stringify({ nations, chosen, game }, null, 2));
  ws.close();
  process.exit(0);
})();
