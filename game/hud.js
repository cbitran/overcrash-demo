/* OverCrash · HUD v5 (Claude). Rodada compartilhada como no Aviator, ligada ao servidor (logic/backend).
   O servidor decide tudo (rodada, ponto de falha, saldo, liquidação); o HUD só apresenta e pede.
   Arte: conceito aprovado (Figma 51:2715) e peças do Codex: placa (item 9), eventos (item 10), rodada compartilhada (item 11, 68:8827).
   Endereço: ?server=http://127.0.0.1:8780&token=<sessão aberta pelo operador>&lang=pt|en|es */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const game = $('game'), video = $('road'), stage = $('stage');
// Uma cena por tipo de quebra (o servidor só revela o tipo na quebra; as três ficam pré-carregadas).
const CRASH_VIDS = Object.fromEntries([...document.querySelectorAll('.crashVid')].map(v => [v.dataset.hazard, v]));
const VID_V = 'v=3';                                       // muda a cada novo render dos vídeos (o navegador guarda os antigos)
const CRASH_FILE = { wall: 'quebra', cliff: 'queda-asfalto', bridge: 'queda-ponte' };
const CRASH_IMPACT = 0.4;              // segundos do vídeo de quebra até o impacto (cena-batida.py: 12 quadros a 30 fps)
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const Q = new URLSearchParams(location.search);
const SERVER = (Q.get('server') || '').replace(/\/$/, '');
// Modo DEMO local (kit de venda): ?demo=1, ou sem servidor. Fichas de demonstração, tudo no navegador (demo-local.js).
const DEMO = Q.get('demo') === '1' || !SERVER;
let TOKEN = Q.get('token') || '';

// ================= Idiomas =================
const I18N = {
  pt: { name: 'PORTUGUÊS', locale: 'pt-BR',
    balance: 'SALDO', demoChips: 'FICHAS DEMO', lastCrashes: 'ÚLTIMAS QUEBRAS', none: 'nenhuma ainda',
    tabConfig: 'CONFIGURAÇÃO', tabPlayer: 'JOGADOR', tabEvents: 'EVENTOS',
    autoShort: 'FREIO AUTO:', perBet: 'POR APOSTA', audio: 'ÁUDIO:', language: 'IDIOMA:', you: 'VOCÊ', round: 'RODADA {n}',
    sessTime: 'TEMPO DE SESSÃO', rounds: 'RODADAS', result: 'RESULTADO', lossLimit: 'LIMITE DE PERDA (24 H)', noLimit: 'SEM LIMITE',
    limitPh: 'limite', apply: 'APLICAR', limitNote: 'O limite só pode ser reduzido.',
    takeBreak: 'ENCERRAR A SESSÃO', noEvents: 'Nenhum evento ainda.', fuel: 'COMBUSTÍVEL', tires: 'PNEUS', hull: 'LATARIA', fuelShort: 'COMB.',
    bet: 'APOSTA {n}', amount: 'VALOR', auto: 'RETIRADA AUTO', on: 'ON', off: 'OFF',
    stNext: 'PRÓXIMA RODADA', stConfirmed: 'CONFIRMADA', stRunning: 'NA CORRIDA', stWon: 'NO BOLSO', stLost: 'QUEBROU', stWait: 'AGUARDE',
    actBet: 'APOSTAR', actCancel: 'CANCELAR', actCashout: 'RETIRAR', actDone: 'RETIRADA CONCLUÍDA', actWait: 'AGUARDE A PRÓXIMA RODADA', actLost: 'APOSTA PERDIDA',
    phOpen: 'APOSTAS ABERTAS', phStart: 'LARGANDO', phRun: 'RODADA EM ANDAMENTO', phRunSub: 'DUAS APOSTAS · RETIRADAS INDEPENDENTES',
    phCrash: 'QUEBROU EM {x}', phWait: 'AGUARDANDO A RODADA',
    live: 'APOSTAS AO VIVO', lPlayer: 'JOGADOR', lStake: 'APOSTA', lCash: 'RETIRADA', lWin: 'GANHO', lEmpty: 'NENHUMA OUTRA APOSTA', lEmptySub: 'As apostas reais aparecem aqui.',
    winTitle: 'NO BOLSO', toastLine: 'APOSTA {n} · {x}',
    evBet: 'APOSTA CONFIRMADA: {x}', evStart: 'RODADA INICIADA', evCrash: 'QUEBROU EM {x}', evAuto: 'FREIO AUTOMÁTICO EM {x}',
    evBrake: 'FREIO PUXADO EM {x}', evTurbo: 'TURBO ATIVADO', evBreak: 'SESSÃO ENCERRADA PELO JOGADOR', evCancel: 'APOSTA CANCELADA',
    foot1: 'RISCO / VELOCIDADE / RETIRADA / OVERCRASH', foot2: 'LEVE A AMBIÇÃO MAIS LONGE',
    crashTitle: 'QUEBROU', crashAt: 'EM {x}', roundOver: 'RODADA ENCERRADA',
    effects: 'EFEITOS:', winBraked: 'FREOU EM {x}.', winText: 'FREOU EM {x}. O CARRO IRIA ATÉ {y}.', winTextMany: 'O CARRO IRIA ATÉ {y}.', again: 'NOVA CORRIDA', menu: 'MENU',
    noServer: 'Abra o jogo pelo operador: falta a sessão.', offline: 'Sem conexão com o servidor. Tentando de novo…',
    reality: 'Você está jogando há {m} min: {r} rodadas, resultado {n}.', continue: 'CONTINUAR', ended: 'Sessão encerrada.', aBalance: 'Saldo', aLast: 'Últimas quebras', aPanel: 'Painel', aFx: 'Ligar ou desligar os efeitos', aSound: 'Ligar ou desligar o som', aLangPrev: 'Idioma anterior', aLangNext: 'Próximo idioma', aLimit: 'Limite de perda em 24 horas', aCar: 'Painel do carro', aClose: 'Fechar a aposta 2', playAgain: 'JOGAR DE NOVO', backToCasino: 'VOLTAR AO CASSINO' },
  en: { name: 'ENGLISH', locale: 'en-US',
    balance: 'BALANCE', demoChips: 'DEMO CHIPS', lastCrashes: 'LAST CRASHES', none: 'none yet',
    tabConfig: 'SETTINGS', tabPlayer: 'PLAYER', tabEvents: 'EVENTS',
    autoShort: 'AUTO BRAKE:', perBet: 'PER BET', audio: 'AUDIO:', language: 'LANGUAGE:', you: 'YOU', round: 'ROUND {n}',
    sessTime: 'SESSION TIME', rounds: 'ROUNDS', result: 'RESULT', lossLimit: 'LOSS LIMIT (24 H)', noLimit: 'NO LIMIT',
    limitPh: 'limit', apply: 'APPLY', limitNote: 'The limit can only be lowered.',
    takeBreak: 'END SESSION', noEvents: 'No events yet.', fuel: 'FUEL', tires: 'TIRES', hull: 'BODY', fuelShort: 'FUEL',
    bet: 'BET {n}', amount: 'AMOUNT', auto: 'AUTO CASH OUT', on: 'ON', off: 'OFF',
    stNext: 'NEXT ROUND', stConfirmed: 'CONFIRMED', stRunning: 'IN THE RACE', stWon: 'CASHED OUT', stLost: 'CRASHED', stWait: 'WAIT',
    actBet: 'BET', actCancel: 'CANCEL', actCashout: 'CASH OUT', actDone: 'CASHED OUT', actWait: 'WAIT FOR THE NEXT ROUND', actLost: 'BET LOST',
    phOpen: 'BETS OPEN', phStart: 'STARTING', phRun: 'ROUND IN PROGRESS', phRunSub: 'TWO BETS · INDEPENDENT CASH OUTS',
    phCrash: 'CRASHED AT {x}', phWait: 'WAITING FOR THE ROUND',
    live: 'LIVE BETS', lPlayer: 'PLAYER', lStake: 'BET', lCash: 'CASH OUT', lWin: 'WIN', lEmpty: 'NO OTHER BETS', lEmptySub: 'Real bets appear here.',
    winTitle: 'CASHED OUT', toastLine: 'BET {n} · {x}',
    evBet: 'BET CONFIRMED: {x}', evStart: 'ROUND STARTED', evCrash: 'CRASHED AT {x}', evAuto: 'AUTO BRAKE AT {x}',
    evBrake: 'HANDBRAKE AT {x}', evTurbo: 'TURBO ON', evBreak: 'SESSION ENDED BY PLAYER', evCancel: 'BET CANCELLED',
    foot1: 'RISK / SPEED / CASH OUT / OVERCRASH', foot2: 'DRIVE GREED FURTHER',
    crashTitle: 'CRASHED', crashAt: 'AT {x}', roundOver: 'ROUND OVER',
    effects: 'EFFECTS:', winBraked: 'BRAKED AT {x}.', winText: 'BRAKED AT {x}. THE CAR WOULD HAVE REACHED {y}.', winTextMany: 'THE CAR WOULD HAVE REACHED {y}.', again: 'NEW RACE', menu: 'MENU',
    noServer: 'Open the game from the operator: the session is missing.', offline: 'No connection to the server. Retrying…',
    reality: 'You have been playing for {m} min: {r} rounds, result {n}.', continue: 'CONTINUE', ended: 'Session ended.', aBalance: 'Balance', aLast: 'Last crashes', aPanel: 'Panel', aFx: 'Turn effects on or off', aSound: 'Turn sound on or off', aLangPrev: 'Previous language', aLangNext: 'Next language', aLimit: '24-hour loss limit', aCar: 'Car panel', aClose: 'Close bet 2', playAgain: 'PLAY AGAIN', backToCasino: 'BACK TO CASINO' },
  es: { name: 'ESPAÑOL', locale: 'es-ES',
    balance: 'SALDO', demoChips: 'FICHAS DEMO', lastCrashes: 'ÚLTIMOS CHOQUES', none: 'ninguno aún',
    tabConfig: 'AJUSTES', tabPlayer: 'JUGADOR', tabEvents: 'EVENTOS',
    autoShort: 'FRENO AUTO:', perBet: 'POR APUESTA', audio: 'AUDIO:', language: 'IDIOMA:', you: 'TÚ', round: 'RONDA {n}',
    sessTime: 'TIEMPO DE SESIÓN', rounds: 'RONDAS', result: 'RESULTADO', lossLimit: 'LÍMITE DE PÉRDIDA (24 H)', noLimit: 'SIN LÍMITE',
    limitPh: 'límite', apply: 'APLICAR', limitNote: 'El límite solo se puede reducir.',
    takeBreak: 'CERRAR LA SESIÓN', noEvents: 'Aún no hay eventos.', fuel: 'COMBUSTIBLE', tires: 'NEUMÁTICOS', hull: 'CARROCERÍA', fuelShort: 'COMB.',
    bet: 'APUESTA {n}', amount: 'MONTO', auto: 'RETIRO AUTO', on: 'ON', off: 'OFF',
    stNext: 'PRÓXIMA RONDA', stConfirmed: 'CONFIRMADA', stRunning: 'EN LA CARRERA', stWon: 'COBRADA', stLost: 'CHOCÓ', stWait: 'ESPERA',
    actBet: 'APOSTAR', actCancel: 'CANCELAR', actCashout: 'RETIRAR', actDone: 'RETIRO HECHO', actWait: 'ESPERA LA PRÓXIMA RONDA', actLost: 'APUESTA PERDIDA',
    phOpen: 'APUESTAS ABIERTAS', phStart: 'ARRANCANDO', phRun: 'RONDA EN CURSO', phRunSub: 'DOS APUESTAS · RETIROS INDEPENDIENTES',
    phCrash: 'CHOCÓ EN {x}', phWait: 'ESPERANDO LA RONDA',
    live: 'APUESTAS EN VIVO', lPlayer: 'JUGADOR', lStake: 'APUESTA', lCash: 'RETIRO', lWin: 'GANANCIA', lEmpty: 'NINGUNA OTRA APUESTA', lEmptySub: 'Las apuestas reales aparecen aquí.',
    winTitle: '¡COBRADO!', toastLine: 'APUESTA {n} · {x}',
    evBet: 'APUESTA CONFIRMADA: {x}', evStart: 'RONDA INICIADA', evCrash: 'CHOCÓ EN {x}', evAuto: 'FRENO AUTOMÁTICO EN {x}',
    evBrake: 'FRENO DE MANO EN {x}', evTurbo: 'TURBO ACTIVADO', evBreak: 'SESIÓN CERRADA POR EL JUGADOR', evCancel: 'APUESTA CANCELADA',
    foot1: 'RIESGO / VELOCIDAD / RETIRO / OVERCRASH', foot2: 'LLEVA LA AMBICIÓN MÁS LEJOS',
    crashTitle: '¡CHOQUE!', crashAt: 'EN {x}', roundOver: 'RONDA TERMINADA',
    effects: 'EFECTOS:', winBraked: 'FRENASTE EN {x}.', winText: 'FRENASTE EN {x}. EL AUTO HABRÍA LLEGADO A {y}.', winTextMany: 'EL AUTO HABRÍA LLEGADO A {y}.', again: 'NUEVA CARRERA', menu: 'MENÚ',
    noServer: 'Abre el juego desde el operador: falta la sesión.', offline: 'Sin conexión con el servidor. Reintentando…',
    reality: 'Llevas {m} min jugando: {r} rondas, resultado {n}.', continue: 'CONTINUAR', ended: 'Sesión cerrada.', aBalance: 'Saldo', aLast: 'Últimos choques', aPanel: 'Panel', aFx: 'Activar o desactivar los efectos', aSound: 'Activar o desactivar el sonido', aLangPrev: 'Idioma anterior', aLangNext: 'Idioma siguiente', aLimit: 'Límite de pérdida de 24 horas', aCar: 'Panel del coche', aClose: 'Cerrar la apuesta 2', playAgain: 'JUGAR DE NUEVO', backToCasino: 'VOLVER AL CASINO' },
};
const LANGS = ['pt', 'en', 'es'];
const LETTERS = { lose: { pt: 'quebrou-pt', en: 'crashed-en', es: 'choque-es' }, win: { pt: 'no-bolso-pt', en: 'cashed-out-en', es: 'cobrado-es' } };
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let lang = (() => {
  const q = Q.get('lang'), saved = store.get('oc-lang'), nav = (navigator.language || 'en').slice(0, 2);
  return [q, saved, nav].find(l => LANGS.includes(l)) || 'en';
})();
const T = (key, vars = {}) => (I18N[lang][key] ?? I18N.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ================= Estado (vem do servidor) =================
const S = {
  currency: 'BRL', moneyMode: 'demo', balance: null, config: null, round: null, history: [], session: null, limits: null,
  live: new Map(),                 // apostas dos OUTROS jogadores na rodada atual (sem jogadores falsos)
  slots: { 1: newSlot(), 2: newSlot() },
  offset: 0, online: false, roundWins: [],
};
function newSlot() { return { stake: null, autoOn: false, auto: 2, bet: null, busy: false }; }
const now = () => Date.now() + S.offset;          // relógio do servidor
const cents = v => v / 100;

let money, fx;
function setFormats() {
  const loc = I18N[lang].locale;
  money = new Intl.NumberFormat(loc, { style: 'currency', currency: S.currency, currencyDisplay: 'narrowSymbol' });
  const nf = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  fx = v => nf.format(v);
}
const mx = v => fx(v) + '×';
const M = c => money.format(cents(c));
const chipFmt = c => new Intl.NumberFormat(I18N[lang].locale, { style: 'currency', currency: S.currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: Number.isInteger(cents(c)) ? 0 : 2 }).format(cents(c)).replace(/\s/g, '');
const floor2 = x => Math.floor(x * 100 + 1e-9) / 100;

// Texto que não cabe na caixa encolhe até caber (outros idiomas são mais longos).
function fitText(el) {
  if (!el) return;
  if (!el.dataset.fs) el.dataset.fs = parseFloat(getComputedStyle(el).fontSize);   // tamanho original (CSS ou inline)
  let fs = +el.dataset.fs; el.style.fontSize = fs + 'px';
  while (el.scrollWidth > el.clientWidth + 1 && fs > 8) { fs -= 0.5; el.style.fontSize = fs + 'px'; }
}
const fitAll = root => (root || document).querySelectorAll('[data-fit]').forEach(fitText);

// ================= Servidor =================
async function api(method, path, body) {
  if (DEMO) return window.OverCrashDemo.request(method, path, body);
  const r = await fetch(SERVER + path, {
    method, headers: { authorization: 'Bearer ' + TOKEN, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(data.message || data.error || r.status); e.code = data.error; e.data = data;
    if ((e.code === 'SESSION_INVALID' || e.code === 'SESSION_EXPIRED') && path !== '/v1/session/reopen') sessionGone(e.message);
    throw e;
  }
  return data;
}

// Sessão encerrada ou expirada: o jogador volta pelo próprio jogo (Celio, 14/10/2026). Demo: JOGAR DE NOVO abre uma sessão
// nova no servidor. Dinheiro real: só o operador abre sessão, então o botão leva de volta ao cassino (se ele informou o endereço).
let reopening = false;
function sessionGone(text) {
  if (reopening || !$('modal').hidden) return;
  modal(text, T('playAgain'), reopenSession);
}
async function reopenSession() {
  reopening = true;
  try {
    const r = await api('POST', '/v1/session/reopen');
    TOKEN = r.token;
    const q = new URLSearchParams(location.search); q.set('token', TOKEN); history.replaceState(null, '', '?' + q);
    if (ws) { ws.onclose = null; ws.close(); }
    connect(); status('');
  } catch (e) {
    if (e.code === 'REOPEN_AT_OPERATOR' && e.data?.lobbyUrl) modal(e.message, T('backToCasino'), () => { location.href = e.data.lobbyUrl; });
    else modal(e.message, 'OK');
  } finally { reopening = false; }
}
// mesma conta do servidor (fair/game.ts payoutFor): stake × centésimos inteiros — evita mostrar R$ 56,49 e pagar R$ 56,50
const payoutAt = (stake, m) => Math.floor(stake * Math.round(m * 100) / 100);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

let ws = null, pingTimer = null, retry = 0;
function connect() {
  if (DEMO) { window.OverCrashDemo.subscribe(m => onMessage(m)); S.online = true; return; }
  ws = new WebSocket(SERVER.replace(/^http/, 'ws') + '/v1/stream');
  ws.onopen = () => { retry = 0; ws.send(JSON.stringify({ type: 'auth', token: TOKEN, locale: lang })); ping(); };
  ws.onmessage = e => { try { onMessage(JSON.parse(e.data)); } catch (err) { console.error(err); } };
  ws.onclose = () => {
    S.online = false; clearInterval(pingTimer); status(T('offline'));
    setTimeout(connect, Math.min(8000, 500 * 2 ** retry++));
  };
}
let pingAt = 0;
function ping() {
  clearInterval(pingTimer);
  const send = () => { if (ws.readyState === 1) { pingAt = Date.now(); ws.send(JSON.stringify({ type: 'ping', id: pingAt })); } };
  send(); pingTimer = setInterval(send, 5000);
}

function onMessage(m) {
  switch (m.type) {
    case 'hello': S.online = true; status(''); applyState(m.state); break;
    case 'pong': if (m.id === pingAt) S.offset = m.serverNow - (pingAt + Date.now()) / 2; break;
    case 'error': status(m.message || m.error); if (m.error === 'SESSION_INVALID' || m.error === 'SESSION_EXPIRED') { ws.onclose = null; sessionGone(m.message || m.error); } break;
    case 'balance': setBalance(m.balance); break;
    case 'round_betting': onRoundBetting(m.round); break;
    case 'round_started': onRoundStarted(m.round); break;
    case 'round_crashed': onRoundCrashed(m.round); break;
    case 'live_bet': if (!isMine(m.bet.id)) { S.live.set(m.bet.id, m.bet); renderLive(); } break;
    case 'live_cashout': if (!isMine(m.bet.id)) { S.live.set(m.bet.id, m.bet); renderLive(); } break;
    case 'live_bet_cancelled': S.live.delete(m.id); renderLive(); break;
    case 'live_batch': for (const it of m.items || []) onMessage(it); break;   // o servidor agrupa as apostas ao vivo a cada 250 ms
    case 'bet_placed': case 'bet_running': case 'bet_cancelled': case 'bet_settled': onBet(m.type, m.bet); break;
  }
}
const isMine = id => S.slots[1].bet?.id === id || S.slots[2].bet?.id === id;

function applyState(st) {
  S.currency = st.currency; S.moneyMode = st.moneyMode; S.config = st.config; S.session = st.session; S.limits = st.limits;
  if (st.locale && !Q.get('lang') && !store.get('oc-lang')) lang = st.locale;
  setFormats();
  S.history = st.history || [];
  S.round = st.round;
  for (const n of [1, 2]) {
    const sl = S.slots[n];
    if (sl.stake === null) sl.stake = st.config.stakeOptions[n === 1 ? 2 : 1] ?? st.config.minStake;
  }
  S.slots[1].bet = S.slots[2].bet = null;
  for (const b of st.openBets || []) if (b.roundId === st.round?.id && b.slot) S.slots[b.slot].bet = b;
  S.live = new Map((st.liveBets || []).filter(l => !isMine(l.id)).map(l => [l.id, l]));
  setBalance(st.balance);
  applyLang();
  if (S.round?.status === 'running') { video.play().catch(() => {}); }
}

// ================= Rodada =================
function onRoundBetting(round) {
  S.round = round; S.live.clear(); S.roundWins = [];
  for (const n of [1, 2]) { const b = S.slots[n].bet; if (b && b.roundId !== round.id) S.slots[n].bet = null; }
  hideCrash(); hideWin(); game.classList.remove('lose');
  for (const v of Object.values(CRASH_VIDS)) { v.hidden = true; v.pause(); }
  braking = false; stoppedRound = null; video.pause(); video.currentTime = 2;
  renderAll();
}
function onRoundStarted(round) {
  S.round = round; t0Round = performance.now();
  const mine = [1, 2].some(n => S.slots[n].bet?.status === 'placed' || S.slots[n].bet?.status === 'running');
  if (mine) log('evStart');
  speed = 40; video.playbackRate = .5; video.play().catch(() => {});
  if (SFX.ready()) { SFX.engineStart(); SFX.play('rev', .5); }
  renderAll();
}
function onRoundCrashed(round) {
  S.round = round;
  S.history.unshift(round.crashPoint); S.history.length = Math.min(S.history.length, 20);
  log('evCrash', { x: mx(round.crashPoint) });
  const wins = S.roundWins.filter(w => w.roundId === round.id);
  // Quem retirou tudo já parou o carro: não vê batida; o NO BOLSO ganha o "até onde o carro iria".
  if (stoppedRound === round.id) { updateWinText(wins, round.crashPoint); renderAll(); return; }
  braking = false; speed = 0; SFX.engineStop(.05);
  const after = () => {
    if (wins.length) showWin(wins, round.crashPoint);
    else { game.classList.add('lose'); showCrash(round.crashPoint); }
  };
  // Cena de quebra: o letreiro entra no impacto. Sem o vídeo (ou com movimento reduzido), congela como antes.
  const crashVid = [CRASH_VIDS[round.hazard], CRASH_VIDS.wall].find(v => v?.dataset.ok === '1');
  if (crashVid && !reduced.matches) {                         // EFEITOS OFF também mostra a cena (Celio, 14/10); OFF tira só tremor, flash, vidro e linhas
    crashVid.currentTime = 0; crashVid.hidden = false; crashVid.play().catch(() => {});
    setTimeout(() => { video.pause(); SFX.play('crash', .9); after(); }, CRASH_IMPACT * 1000);
  } else { freeze(1200); video.pause(); SFX.play('crash', .9); after(); }
  renderAll();
}
function onBet(type, b) {
  if (!b.slot || (S.round && b.roundId !== S.round.id)) return;
  const sl = S.slots[b.slot], prev = sl.bet;
  sl.bet = type === 'bet_cancelled' ? null : b;
  if (S.live.delete(b.id)) renderLive();          // a própria aposta não entra na lista dos outros
  if (type === 'bet_placed' && prev?.id !== b.id) log('evBet', { x: M(b.stake) });
  if (type === 'bet_cancelled') log('evCancel');
  if (type === 'bet_settled' && b.status === 'won' && prev?.status !== 'won') {
    S.roundWins.push({ roundId: b.roundId, slot: b.slot, amount: b.payout, multiplier: b.cashoutMultiplier });
    showGain(b.payout);
    log(b.settleReason === 'auto' ? 'evAuto' : 'evBrake', { x: mx(b.cashoutMultiplier) });
    SFX.play('brake', .7);
    const stillRunning = [1, 2].some(n => S.slots[n].bet?.status === 'running');
    if (!stillRunning && S.round?.status === 'running') {
      // Celio (13/10): ao retirar tudo, o carro freia e para, com o NO BOLSO na hora; a rodada segue para os outros no topo.
      stoppedRound = S.round.id; braking = true; SFX.engineStop(.6);
      showWin(S.roundWins.filter(w => w.roundId === b.roundId), null);
    } else showToast(b);                        // a outra aposta segue correndo: só o aviso pequeno
  }
  renderBets(); renderPhase();
}

// Multiplicador ao vivo (o mesmo para todos): exp(g·t) truncado, parado no teto.
function liveMultiplier() {
  const r = S.round; if (!r || r.status !== 'running' || !r.startedAt) return 1;
  const m = floor2(Math.exp(Math.max(0, (now() - r.startedAt) / 1000) * r.growthRate));
  return r.maxMultiplier ? Math.min(m, r.maxMultiplier) : m;
}

// ================= Ações =================
async function act(n) {
  const sl = S.slots[n], r = S.round, b = sl.bet;
  if (sl.busy || !r) return;
  sl.busy = true; renderBets();
  try {
    if (r.status === 'betting' && !b) {
      const placed = await api('POST', '/v1/bets', { stake: sl.stake, autoCashout: sl.autoOn ? sl.auto : null, slot: n, idempotencyKey: uid(), roundId: S.round?.id });   // só nesta rodada
      onBet('bet_placed', placed);
      SFX.init();
    } else if (r.status === 'betting' && b?.status === 'placed') {
      onBet('bet_cancelled', await api('POST', `/v1/bets/${b.id}/cancel`));
    } else if (r.status === 'running' && b?.status === 'running') {
      onBet('bet_settled', await api('POST', `/v1/bets/${b.id}/cashout`));
    }
  } catch (e) {
    if (e.code === 'REALITY_CHECK_REQUIRED') showReality(e.data?.summary);
    else if (e.code === 'TOO_LATE' || e.code === 'ALREADY_SETTLED') { if (e.data?.bet) onBet('bet_settled', e.data.bet); }
    else status(e.message, 3500);
  } finally { sl.busy = false; renderBets(); }
}
function setStake(n, v) { const sl = S.slots[n]; if (sl.bet) return; sl.stake = v; renderBets(); }
function toggleAuto(n) { const sl = S.slots[n]; if (sl.bet) return; sl.autoOn = !sl.autoOn; renderBets(); }
const autoMax = () => Math.max(1.01, Number(S.config?.maxMultiplier) || 1000);
// Enquanto digita: só números e uma vírgula, no máximo 2 casas e não passa do teto (Celio, 14/10: "não deixar escrever qualquer coisa").
function cleanAuto(el) {
  let t = el.value.replace('.', ',').replace(/[^\d,]/g, '');
  const i = t.indexOf(','); if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/,/g, '').slice(0, 2);
  t = t.replace(/^0+(?=\d)/, '');
  const max = autoMax(); if (Number(t.replace(',', '.')) > max) t = String(max).replace('.', ',');
  if (t !== el.value) el.value = t;
}
function setAuto(n, raw) {
  const sl = S.slots[n]; const v = Number(String(raw).replace(',', '.'));
  // Limite: de 1,01× até o teto do jogo (config.maxMultiplier, hoje 1000×) — acima disso o alvo nunca seria alcançado.
  if (Number.isFinite(v) && v > 0) { sl.auto = floor2(Math.min(Math.max(v, 1.01), autoMax())); sl.autoOn = true; }
  renderBets();
}

// ================= Componentes do item 11 (coordenadas medidas nas prévias do Codex) =================
// Cada componente tem o tamanho do quadro do Codex do formato; o layout escala o grupo inteiro.
const ART = 'assets/rodada/';
const FMT_SIZE = {
  bet:   { desktop: [425, 208], portrait: [425, 208], compact: [196, 284] },
  phase: { desktop: [508, 180], portrait: [374, 72], compact: [412, 72] },
  live:  { desktop: [425, 266], portrait: [374, 92], compact: [412, 80] },
  toast: { desktop: [380, 64], portrait: [374, 52], compact: [280, 52] },
};
let fmt = 'desktop';
// Celular em pé (Celio, 13/10: "como jogar no celular com a tela assim?"): lista ao vivo e aposta 2 recolhidas por padrão,
// e na corrida cada aposta vira só o botão RETIRAR. Libera a faixa do carro.
let liveOpen = false, bet2Open = false;
const racingNow = () => S.round?.status === 'running' || S.round?.status === 'crashed';
function betMode(n) {
  // A APOSTA 2 é do mesmo jogador (duas apostas na rodada, como no Aviator); fica escondida até ele abrir pelo "+" (Celio, 14/10).
  if (n === 2 && !bet2Open && !S.slots[2].bet) return 'closed';
  if (fmt !== 'portrait') return 'full';
  return racingNow() ? 'mini' : 'full';
}
const BET_H = { full: 208, mini: 70, closed: 52 };

function slotState(n) {
  const r = S.round, b = S.slots[n].bet;
  if (!r) return 'wait';
  if (b?.status === 'won') return 'won';
  if (b?.status === 'lost') return 'lost';
  if (r.status === 'betting') return b ? 'placed' : 'idle';
  if (r.status === 'running') return b?.status === 'running' ? 'running' : 'closed';
  return 'closed';
}

const stLblOf = st => ({ idle: T('stNext'), placed: T('stConfirmed'), running: T('stRunning'), won: T('stWon'), lost: T('stLost'), closed: T('stNext'), wait: T('stWait') }[st]);
function betHTML(n) {
  const sl = S.slots[n], st = slotState(n), b = sl.bet, opts = S.config?.stakeOptions || [];
  const bm = betMode(n);
  if (bm === 'closed') return `<button type="button" class="b-act b-open" data-open-bet2 style="left:0;top:0;width:${fmt === 'compact' ? 196 : 425}px;height:52px"><span class="a1">+ ${esc(T('bet', { n: 2 }))}</span></button>`;
  const stake = b ? b.stake : sl.stake, autoOn = b ? b.autoCashout != null : sl.autoOn, autoV = b?.autoCashout ?? sl.auto;
  const lockEdit = !!b || st === 'closed' || !S.round;
  const stLbl = stLblOf(st);
  let action, a2 = '', cash = false, disabled = sl.busy;
  if (st === 'idle') action = T('actBet');
  else if (st === 'placed') action = T('actCancel');
  else if (st === 'running') { action = T('actCashout'); a2 = M(payoutAt(b.stake, liveMultiplier())); cash = true; }
  else if (st === 'won') { action = T('actDone'); a2 = M(b.payout); disabled = true; }
  else if (st === 'lost') { action = T('actLost'); disabled = true; }
  else { action = T('actWait'); disabled = true; }
  const chips = opts.slice(0, 5).map((v, i) => {
    const pos = fmt === 'compact' ? [[10, 136], [70, 136], [130, 136], [10, 183], [70, 183]][i] : [12 + i * 81, 89];
    const w = fmt === 'compact' ? 55 : 76, h = fmt === 'compact' ? 41 : 42;
    return `<button type="button" class="chip${v === stake ? ' sel' : ''}" data-chip="${v}" aria-pressed="${v === stake}" style="left:${pos[0]}px;top:${pos[1]}px;width:${w}px;height:${h}px"${lockEdit || v > (S.balance ?? Infinity) ? ' disabled' : ''}>${chipFmt(v)}</button>`;
  }).join('');
  if (bm === 'mini') {
    // Só o essencial na corrida: nome, estado e o botão (RETIRAR com o valor corrente).
    return `<div class="b-mini-ttl"><span>${esc(T('bet', { n }))}</span><span class="b-st b-st-${st}">${esc(stLblOf(st))}${n === 2 && !b ? '<button type="button" class="b-x" data-close-bet2 aria-label="' + esc(T('aClose')) + '">−</button>' : ''}</span></div>
      <button type="button" class="b-act${cash ? ' cash' : ''}" data-act="${n}" style="left:0;top:20px;width:425px;height:50px"${disabled ? ' disabled' : ''}>
        <span class="a1" data-fit>${esc(action)}</span>${a2 ? `<span class="a2">${esc(a2)}</span>` : ''}</button>`;
  }
  const L = fmt === 'compact'
    ? { tl: [10, 6, 176, 22], val: [8, 33, 180, 42], auto: [8, 82, 180, 42], act: [8, 232, 180, 44] }
    : { tl: [12, 6, 401, 22], val: [12, 36, 193, 42], auto: [216, 36, 197, 42], act: [12, 145, 401, 51] };
  const box = (k, extra = '') => `left:${L[k][0]}px;top:${L[k][1]}px;width:${L[k][2]}px;height:${L[k][3]}px${extra}`;
  return `<img class="bg" src="${ART}bet-panel-${fmt === 'compact' ? 'landscape' : 'desktop'}.png" alt="">
    <div class="b-top" style="${box('tl')}"><span class="b-ttl" data-fit>${esc(T('bet', { n }))}</span><span class="b-st b-st-${st}" data-fit>${esc(stLbl)}</span>${n === 2 && !b ? '<button type="button" class="b-x" data-close-bet2 aria-label="' + esc(T('aClose')) + '">−</button>' : ''}</div>
    <div class="field" style="${box('val')}"><span class="f-l">${esc(T('amount'))}</span><span class="f-v amber" data-fit>${esc(M(stake))}</span></div>
    <div class="field" style="${box('auto')}"><span class="f-l">${esc(T('auto'))}</span>
      <input class="f-v f-in" data-auto="${n}" inputmode="decimal" maxlength="7" autocomplete="off" value="${esc(fx(autoV))}×"${lockEdit ? ' disabled' : ''} aria-label="${esc(T('auto'))}">
      <button type="button" class="f-on${autoOn ? ' on' : ''}" data-autoon="${n}" aria-pressed="${autoOn}" aria-label="${esc(T('auto'))}"${lockEdit ? ' disabled' : ''}>${autoOn ? T('on') : T('off')}</button></div>
    ${chips}
    <button type="button" class="b-act${cash ? ' cash' : ''}" data-act="${n}" style="${box('act')}"${disabled ? ' disabled' : ''}>
      <span class="a1" data-fit>${esc(action)}</span>${a2 ? `<span class="a2">${esc(a2)}</span>` : ''}</button>`;
}

function phaseHTML() {
  const r = S.round; let big = '', lbl = '', sub = '', lit = 0;
  if (!r) { lbl = T('phWait'); big = '—'; }
  else if (r.status === 'betting') {
    const left = Math.max(0, (r.bettingEndsAt - now()) / 1000);
    lit = Math.ceil(left); big = left > 0.05 ? String(Math.ceil(left)).padStart(2, '0') + ' s' : T('phStart'); lbl = T('phOpen');
  } else if (r.status === 'running') { big = mx(liveMultiplier()); lbl = fmt === 'desktop' ? '' : T('phRun'); }   // desktop: o multiplicador já diz (Jev, 14/10)
  else { big = mx(r.crashPoint); lbl = T('phCrash', { x: mx(r.crashPoint) }); }
  const total = Math.round(S.config?.bettingSeconds || 8);
  const segs = Array.from({ length: total }, (_, i) => `<i class="${i < lit ? 'on' : ''}"></i>`).join('');
  const crashed = r?.status === 'crashed' ? ' crashed' : '';
  if (fmt === 'desktop') return `<img class="bg" src="${ART}countdown-desktop.png" alt="">
    <strong class="p-big${crashed}" data-fit style="left:40px;top:14px;width:428px;height:100px">${esc(big)}</strong>
    ${lbl ? `<span class="p-lbl" data-fit style="left:40px;top:116px;width:428px;height:19px">${esc(lbl)}</span>` : ''}
    ${sub ? `<span class="p-sub" data-fit style="left:40px;top:130px;width:428px;height:12px">${esc(sub)}</span>` : ''}
    <div class="p-segs" style="left:38px;top:147px;width:432px;height:14px">${segs}</div>`;
  const W = fmt === 'portrait' ? 374 : 412;
  return `<img class="bg" src="${ART}countdown-${fmt === 'portrait' ? 'portrait' : 'landscape'}.png" alt="">
    <span class="p-lbl m" data-fit style="left:40px;top:3px;width:${W - 80}px;height:17px">${esc(lbl)}</span>
    <strong class="p-big sm${crashed}" data-fit style="left:40px;top:20px;width:${W - 80}px;height:34px">${esc(big)}</strong>
    <div class="p-segs" style="left:26px;top:57px;width:${W - 52}px;height:8px">${segs}</div>`;
}

function liveHTML() {
  const rows = [...S.live.values()];
  if (fmt === 'portrait' && !liveOpen) {
    return `<button type="button" class="live-bar" data-live-toggle aria-expanded="false" style="left:0;top:0;width:374px;height:44px">
      <span class="l-ttl">${esc(T('live'))}</span><span class="l-n">${rows.length}</span><span class="l-arrow">▾</span></button>`;
  }
  const D = fmt === 'desktop', P = fmt === 'portrait';
  const W = D ? 425 : P ? 374 : 412, cols = D ? [12, 132, 236, 324] : P ? [12, 117, 209, 285] : [12, 128, 230, 314];
  const headY = D ? 30 : P ? 26 : 30, rowY = D ? 52 : P ? 46 : 46, rowH = D ? 36 : P ? 36 : 28, maxRows = D ? 5 : 1;
  const head = [T('lPlayer'), T('lStake'), T('lCash'), T('lWin')].map((h, i) => `<span class="l-h" style="left:${cols[i]}px;top:${headY}px">${esc(h)}</span>`).join('');
  const list = rows.length
    ? `<div class="l-rows" style="left:0;top:${rowY}px;width:${W}px;height:${rowH * maxRows}px">${rows.map(l => `<div class="l-row${l.cashedOut ? ' out' : ''}" style="height:${rowH}px">
        <span style="left:${cols[0]}px">${esc(l.player)}</span><span style="left:${cols[1]}px">${esc(M(l.stake))}</span>
        <span style="left:${cols[2]}px">${l.cashedOut ? esc(mx(l.cashoutMultiplier)) : '—'}</span><span style="left:${cols[3]}px">${l.cashedOut ? esc(M(l.payout)) : '—'}</span></div>`).join('')}</div>`
    : `<span class="l-empty" style="left:0;top:${D ? 132 : P ? 54 : 52}px;width:${W}px">${esc(T('lEmpty'))}</span>`;
  return `<img class="bg" src="${ART}live-bets-${D ? 'desktop' : P ? 'portrait' : 'landscape'}.png" alt="">
    <span class="l-ttl" style="left:12px;top:${D ? 10 : 6}px">${esc(T('live'))}</span><span class="l-n" style="right:${P ? 34 : 12}px;top:${D ? 10 : 6}px">${rows.length}</span>${head}${list}
    ${P ? '<button type="button" class="l-close" data-live-toggle style="right:4px;top:0;width:28px;height:26px">▴</button>' : ''}`;
}

let toastTimer = 0;
function showToast(b) {
  const g = $('g-toast'), D = fmt === 'desktop', P = fmt === 'portrait', W = D ? 380 : P ? 374 : 280;
  g.innerHTML = `<img class="bg" src="${ART}win-toast-${D ? 'desktop' : P ? 'portrait' : 'landscape'}.png" alt="">
    <strong class="w-t" style="left:12px;top:${D ? 12 : 8}px">${esc(T('winTitle'))}</strong>
    <span class="w-s" style="left:12px;top:${D ? 42 : 33}px">${esc(T('toastLine', { n: b.slot, x: mx(b.cashoutMultiplier) }))}</span>
    <strong class="w-v" style="right:${W - (D ? 366 : W - 12)}px;top:${D ? 18 : 12}px">${esc(M(b.payout))}</strong>`;
  g.classList.remove('show'); void g.offsetWidth; g.classList.add('show'); g.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => g.classList.remove('show'), 2000);   // Codex: ~2 s, sem parar o carro
}

// Cabeçalhos e telemetria do celular (faixa do Codex em 9 fatias, sem esticar os cantos).
function historyText() {
  return S.history.slice(0, 5).map(v => `<b class="${v < 2 ? 'low' : 'mid'}">${esc(mx(v))}</b>`).join('');
}
function mheadHTML() {
  return `<span class="m-l" style="left:10px;top:7px">${esc(T('balance'))}</span>
    <strong class="m-bal" data-fit id="mBal1" style="left:10px;top:20px;width:110px">${esc(S.balance == null ? '—' : M(S.balance))}</strong>
    <span class="m-l" style="left:126px;top:7px">${esc(T('lastCrashes'))}</span>
    <span class="m-hist" style="left:124px;top:21px;width:196px">${historyText()}</span>
    <button type="button" class="m-menu" data-menu aria-expanded="${sideOpen}" style="left:326px;top:1px;width:44px;height:44px">${esc(T('menu'))}</button>`;
}
function mbalHTML() {
  return `<span class="m-l" style="left:12px;top:11px">${esc(T('balance'))}</span>
    <strong class="m-bal big" data-fit id="mBal2" style="left:12px;top:30px;width:120px">${esc(S.balance == null ? '—' : M(S.balance))}</strong>
    <button type="button" class="m-menu" data-menu aria-expanded="${sideOpen}" style="left:140px;top:14px;width:48px;height:44px">${esc(T('menu'))}</button>`;
}
function mhistHTML() {
  return `<span class="m-l" style="left:12px;top:11px">${esc(T('lastCrashes'))}</span><span class="m-hist" style="left:11px;top:32px;width:176px">${historyText()}</span>`;
}
function teleHTML() {
  return `<span class="t-s" id="tSpeed">${Math.round(speed)} KM/H</span><span class="t-k">${esc(T('fuelShort'))} <b id="tFuel">—</b></span>
    <span class="t-k">${esc(T('tires'))} <b id="tTires">—</b></span><span class="t-k">${esc(T('hull'))} <b id="tHull">—</b></span>`;
}

// ================= Layout responsivo =================
// Grupos do conceito: coordenadas do quadro 1920×1080. Componentes do item 11: unidades do quadro do Codex (1672×941 no
// desktop; 390×844 em pé; 844×390 deitado). K = 1920/1672 converte o quadro do Codex para o palco do desktop.
const GROUPS = {};
document.querySelectorAll('.g').forEach(g => {
  if (g.dataset.box) { const [x, y, w, h] = g.dataset.box.split(',').map(Number); GROUPS[g.id.slice(2)] = { el: g, x, y, w, h }; }
  else GROUPS[g.id.slice(2)] = { el: g, comp: true };
});
const KD = 1920 / 1672;
let mode = '', sideOpen = false, W = 1920, H = 1080;

function betsBelowCar() {
  const sc = KD * .78, w = 425 * sc, h1 = BET_H.full * sc, gap = 6, bottom = 58;
  if (betMode(2) === 'closed') return {
    bet1: { ax: 'c', x: 0, ay: 'b', y: bottom, s: sc },
    bet2: { ax: 'c', x: w + gap, ay: 'b', y: bottom + h1 - BET_H.closed * sc, s: sc, w: 425, h: BET_H.closed },
  };
  return {
    // as duas abertas: o par fica entre o velocímetro (até x≈604) e o turbo (de x≈1461), por isso desloca 72 para a direita
    bet1: { ax: 'c', x: 72 - (w + gap) / 2, ay: 'b', y: bottom, s: sc },
    bet2: { ax: 'c', x: 72 + (w + gap) / 2, ay: 'b', y: bottom, s: sc, w: 425, h: BET_H.full },
  };
}
function layoutFor(m) {
  if (m === 'desktop') return {
    title: { ax: 'c', x: -4, ay: 't', y: 0, s: 1 }, balance: { ax: 'l', x: 9, ay: 't', y: 0, s: 1 },
    history: { ax: 'r', x: 5, ay: 't', y: 0, s: 1 }, side: { ax: 'l', x: 8, ay: 't', y: 119, s: 1 },
    speed: { ax: 'l', x: 6, ay: 'b', y: 18, s: 1 }, turbo: { ax: 'r', x: 40, ay: 'b', y: 46, s: 1 },
    foot: { ax: 'c', x: 1.5, ay: 'b', y: 8, s: 1 }, tag: { ax: 'r', x: 44, ay: 'b', y: 8, s: 1 },
    phase: { ax: 'c', x: 0, ay: 't', y: 78 * KD, s: KD }, live: { ax: 'r', x: 8 * KD, ay: 't', y: 141 * KD, s: KD * .9 },    // secundário, um pouco menor; letras maiores no CSS (Celio, 14/10: "não consigo ler")
    // Apostas no centro, logo abaixo do carro (Celio, 14/10: "ali embaixo está o momento de eu parar"; virar o rosto tira o foco).
    // Provisório até a faixa horizontal do Codex (item 13): painel atual um pouco menor, a APOSTA 2 ao lado quando aberta.
    ...betsBelowCar(),
    toast: { ax: 'c', x: 0, ay: 't', y: 300 * KD, s: KD },
  };
  if (m === 'portrait') {
    const k = 374 / 425, hl = liveOpen ? 92 : 44;   // barra recolhida com 44 de altura: alvo de toque mínimo
    const h2 = BET_H[betMode(2)] * k, h1 = BET_H[betMode(1)] * k;
    return {
      mhead: { ax: 'l', x: 8, ay: 't', y: 8, s: 1, w: 374, h: 46 }, phase: { ax: 'l', x: 8, ay: 't', y: 60, s: 1 },
      live: { ax: 'l', x: 8, ay: 't', y: 136, s: 1, w: 374, h: hl }, toast: { ax: 'l', x: 8, ay: 't', y: 136 + hl + 6, s: 1 },
      // sem a linha de telemetria (Jev, 14/10): o espaço vai para o carro e as apostas
      bet2: { ax: 'l', x: 8, ay: 'b', y: 8, s: k, w: 425, h: BET_H[betMode(2)] },
      bet1: { ax: 'l', x: 8, ay: 'b', y: 8 + h2 + 6, s: k, w: 425, h: BET_H[betMode(1)] },
      mturbo: { ax: 'r', x: 8, ay: 'b', y: 8 + h2 + 6 + h1 + 6, s: 1, w: 116, h: 44 },   // logo acima das apostas, à direita
    };
  }
  return {
    mbal: { ax: 'l', x: 8, ay: 't', y: 8, s: 1, w: 196, h: 72 }, mhist: { ax: 'r', x: 8, ay: 't', y: 8, s: 1, w: 196, h: 72 },
    phase: { ax: 'c', x: 0, ay: 't', y: 8, s: 1 }, live: { ax: 'c', x: 0, ay: 't', y: 82, s: 1 },
    bet1: { ax: 'l', x: 8, ay: 't', y: 98, s: 1 }, bet2: { ax: 'r', x: 8, ay: 't', y: 98, s: 1, w: 196, h: betMode(2) === 'closed' ? 52 : 284 },
    toast: { ax: 'c', x: 0, ay: 't', y: 170, s: 1 }, tele: { ax: 'c', x: 0, ay: 'b', y: 8, s: 1, w: 412, h: 26 },
    mturbo: { ax: 'c', x: 0, ay: 'b', y: 40, s: 1, w: 116, h: 44 },   // acima da telemetria, no centro (as apostas ocupam as laterais)
  };
}
const compSize = name => {
  const key = name.startsWith('bet') ? 'bet' : name;
  return FMT_SIZE[key] ? FMT_SIZE[key][fmt] : null;
};

function layout() {
  const vw = innerWidth, vh = innerHeight, ar = vw / vh;
  // Cada layout tem um espaço mínimo (em pé: 390×760; deitado do celular: 844×390). A escala respeita os dois lados,
  // senão as peças se sobrepõem (Celio, 14/10: 768×640 e 640×390). Em pé numa tela larga, a coluna fica centrada.
  let K, ox = 0;
  if (ar < 0.9) { mode = 'portrait'; K = Math.min(vw / 390, vh / 760); W = 390; H = vh / K; ox = (vw - W * K) / 2; }
  else if (vh < 620 || ar < 1.25) { mode = 'compact'; K = Math.min(vh / 390, vw / 844); H = vh / K; W = vw / K; }
  else { mode = 'desktop'; K = Math.min(vw / 1920, vh / 1080); W = vw / K; H = vh / K; }
  const fmtChanged = fmt !== mode; fmt = mode;
  stage.style.width = W + 'px'; stage.style.height = H + 'px'; stage.style.transform = `translateX(${ox}px) scale(${K})`;
  game.dataset.layout = mode;
  // Vídeo: a menor versão que ainda fica nítida nesta tela; se não existir, o vídeo único.
  const portrait = mode === 'portrait', px = vw * Math.min(devicePixelRatio || 1, 2);
  const shot = portrait ? (px <= 1100 ? 'retrato-720' : 'retrato-1080') : (px <= 1400 ? 'paisagem-1280' : px <= 2100 ? 'paisagem-1920' : 'paisagem-2560');
  if (video.dataset.shot !== shot) {
    const t = video.currentTime, playing = !video.paused; video.dataset.shot = shot;
    video.poster = `assets/video/capa-${portrait ? 'retrato' : 'paisagem'}.jpg?${VID_V}`; video.src = `assets/video/corrida-${shot}.mp4?${VID_V}`;
    video.addEventListener('loadeddata', () => { video.currentTime = t || 2; if (playing) video.play().catch(() => {}); }, { once: true });
    video.onerror = () => { const fb = `assets/video/corrida-${portrait ? 'retrato' : 'paisagem'}.mp4?${VID_V}`; if (!video.src.endsWith(fb)) video.src = fb; };
  }
  // Vídeo da quebra no mesmo formato (o tipo de quebra da rodada pode trocar o arquivo quando houver as três cenas).
  for (const [hz, cv] of Object.entries(CRASH_VIDS)) {
    const src = `assets/video/${CRASH_FILE[hz]}-${portrait ? 'retrato' : 'paisagem'}.mp4?${VID_V}`;
    if (cv.dataset.src === src) continue;
    cv.dataset.src = src; cv.dataset.ok = '0'; cv.src = src;
    cv.onloadeddata = () => { cv.dataset.ok = '1'; }; cv.onerror = () => { cv.dataset.ok = '0'; };
  }
  const band = $('footBand');
  band.hidden = mode !== 'desktop';
  if (mode === 'desktop') { band.style.left = '563px'; band.style.width = (W - 563) + 'px'; band.style.top = (H - 52) + 'px'; }
  if (fmtChanged) renderAll();
  const L = layoutFor(mode);
  for (const [name, gr] of Object.entries(GROUPS)) {
    let p = L[name];
    if (name === 'side' && mode !== 'desktop') {
      p = sideOpen ? (mode === 'portrait' ? { ax: 'c', x: 0, ay: 't', y: 60, s: 374 / 488 } : { ax: 'c', x: 0, ay: 't', y: 8, s: 374 / 424 }) : null;
    }
    if (name === 'toast' && p) gr.el.dataset.on = '1';
    gr.el.hidden = !p;
    if (!p) continue;
    const size = gr.comp ? (p.w ? [p.w, p.h] : compSize(name)) : [gr.w, gr.h];
    if (gr.comp) { gr.el.style.width = size[0] + 'px'; gr.el.style.height = size[1] + 'px'; }
    const w = size[0] * p.s, h = size[1] * p.s;
    const left = p.ax === 'l' ? p.x : p.ax === 'r' ? W - p.x - w : (W - w) / 2 + p.x;
    const top = p.ay === 't' ? p.y : H - p.y - h;
    gr.el.style.transform = `translate(${left}px,${top}px) scale(${p.s})`;
    gr.el.style.zIndex = name === 'side' && sideOpen ? 5 : name === 'toast' ? 4 : '';
  }
  $('backdrop').hidden = !(sideOpen && mode !== 'desktop');
  game.classList.toggle('menu-open', sideOpen && mode !== 'desktop');   // menu aberto: QUEBROU/NO BOLSO não passam por cima (Celio, 14/10)
  placeCrash(); placeWin();
}
function toggleSide(open = !sideOpen) { sideOpen = open; layout(); }
$('backdrop').addEventListener('click', () => toggleSide(false));
addEventListener('resize', layout);

// ================= Renderização =================
function renderBets() {
  for (const n of [1, 2]) {
    const g = $('g-bet' + n), focus = document.activeElement?.dataset?.auto === String(n);
    if (focus) continue;                       // não redesenha enquanto o jogador digita o alvo
    g.innerHTML = betHTML(n); g.dataset.state = slotState(n); fitAll(g);
  }
  relayout();
}
function renderPhase() { const g = $('g-phase'); g.innerHTML = phaseHTML(); fitAll(g); }
function renderLive() { const g = $('g-live'); g.innerHTML = liveHTML(); g.classList.toggle('dim', fmt === 'desktop'); }
let lastShape = '';
function relayout() { const k = [fmt, liveOpen, betMode(1), betMode(2)].join(); if (k !== lastShape) { lastShape = k; layout(); } }
function renderMobile() {
  $('g-mhead').innerHTML = mheadHTML(); $('g-mbal').innerHTML = mbalHTML(); $('g-mhist').innerHTML = mhistHTML(); $('g-tele').innerHTML = teleHTML();
  fitAll($('g-mhead')); fitAll($('g-mbal'));
}
function renderAll() {
  renderBets(); renderPhase(); renderLive(); renderMobile(); renderHistory(); renderSide();
}
let lastBal = null, countingUntil = 0;
function setBalance(v) {
  if (v == null) return;
  const before = S.balance; S.balance = v;
  if (before != null && v > before && performance.now() > countingUntil) countUp(before, v);
  else if (performance.now() > countingUntil) for (const id of BAL_IDS) if ($(id)) $(id).textContent = M(v);
}
// Ganhou: o saldo "roda" rápido até o valor novo e brilha, em todos os formatos (Celio, 14/10).
const BAL_IDS = ['balance', 'mBal1', 'mBal2'];
function countUp(from, to) {
  const t1 = performance.now(), dur = 650; countingUntil = t1 + dur + 60;
  for (const id of BAL_IDS) $(id)?.classList.add('rolling');
  const step = t => {
    const k = Math.min(1, (t - t1) / dur), e = 1 - Math.pow(1 - k, 2);
    for (const id of BAL_IDS) if ($(id)) $(id).textContent = M(from + (to - from) * e);   // os ids são relidos: o celular redesenha o cabeçalho
    if (k < 1) requestAnimationFrame(step); else for (const id of BAL_IDS) $(id)?.classList.remove('rolling');
  };
  requestAnimationFrame(step);
}
// "+R$ X" ao lado do saldo visível, subindo e sumindo: mostra o que ele ganhou a mais.
function showGain(amount) {
  const bal = BAL_IDS.map($).find(e => e && e.getBoundingClientRect().width > 0 && !e.closest('[hidden]'));
  if (!bal || !(amount > 0)) return;
  const r = bal.getBoundingClientRect(), fs = parseFloat(getComputedStyle(bal).fontSize) * (r.width / (bal.offsetWidth || r.width));
  const g = document.createElement('div'); g.className = 'gain'; g.textContent = '+' + M(amount);
  const rg = document.createRange(); rg.selectNodeContents(bal); const t = rg.getBoundingClientRect();   // largura do texto, não da caixa
  Object.assign(g.style, { left: Math.round(t.right + fs * .35) + 'px', top: Math.round(r.top + r.height / 2) + 'px', fontSize: Math.max(13, fs * .62) + 'px' });
  document.body.appendChild(g); setTimeout(() => g.remove(), 2600);
}
const HIST_X = [1363, 1467, 1570, 1672, 1778];
function renderHistory() {
  const ol = $('history');
  if (!S.history.length) { ol.replaceChildren(); ol.setAttribute('aria-label', T('none')); return; }
  ol.removeAttribute('aria-label');
  ol.replaceChildren(...S.history.slice(0, 5).map((v, i) => {
    const li = document.createElement('li'); li.style.left = HIST_X[i] + 'px'; li.textContent = mx(v); li.dataset.tier = v < 2 ? 'low' : 'mid'; return li;
  }));
}
const fmtMin = m => (m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min');
function renderSide() {
  const demo = S.moneyMode === 'demo';
  $('demoTitle').hidden = $('demoMark').hidden = $('playerDemo').hidden = !demo;
  $('autoVal').textContent = fxOn ? 'ON' : 'OFF'; $('autoDown').disabled = $('autoUp').disabled = false;
  $('audioVal').textContent = SFX.on ? 'ON' : 'OFF';
  $('langVal').textContent = I18N[lang].name;
  // leitor de tela: "Efeitos: ON" em vez de só "ON" (auditoria de acessibilidade, 14/10)
  $('autoVal').setAttribute('aria-label', `${T('effects').replace(/:$/, '')}: ${fxOn ? 'ON' : 'OFF'}`);
  $('audioVal').setAttribute('aria-label', `${T('audio').replace(/:$/, '')}: ${SFX.on ? 'ON' : 'OFF'}`);
  $('langVal').setAttribute('aria-label', `${T('language').replace(/:$/, '')}: ${I18N[lang].name}`);
  $('playerName').textContent = T('you');
  const ss = S.session;
  $('playerRounds').textContent = T('round', { n: S.round?.seq ?? 0 });
  if (ss) {
    $('sessTime').textContent = fmtMin(ss.minutesPlayed); $('sessRounds').textContent = ss.rounds;
    $('sessNet').textContent = (ss.net > 0 ? '+' : '') + M(ss.net);
  }
  const lim = S.limits?.effective?.lossLimitDay ?? S.limits?.lossLimitDay;     // vale o mais restritivo (jogador × operador)
  $('sessLimit').textContent = lim != null ? M(lim) : T('noLimit');
}

// ================= Registro de eventos =================
const LOG_Y = [406, 444, 482];
const EVENT_ICON = { evBet: 'bet-confirmed', evStart: 'round-started', evTurbo: 'turbo-activated', evCrash: 'crashed',
  evBrake: 'brake-pulled', evAuto: 'auto-brake', evBreak: 'session-paused', evCancel: 'session-paused' };
const events = [];
let t0Round = performance.now();
const clock = () => { const s = Math.max(0, (performance.now() - t0Round) / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
function log(key, vars) { events.unshift({ time: clock(), key, vars }); if (events.length > 14) events.length = 14; renderLog(); }
function renderLog() {
  const text = e => T(e.key, e.vars || {});
  if (!events.length) { $('log').innerHTML = ''; const li = document.createElement('li'); li.className = 'muted'; li.textContent = T('noEvents'); $('log').append(li); }
  else $('log').replaceChildren(...events.map(e => { const li = document.createElement('li'); li.innerHTML = '<time></time><span></span>'; li.firstChild.textContent = e.time; li.lastChild.textContent = text(e); return li; }));
  $('miniLog').replaceChildren(...events.slice(0, 3).map((e, i) => {
    const li = document.createElement('li'); li.style.top = LOG_Y[i] + 'px'; li.innerHTML = '<time></time><img alt=""><span></span>';
    li.firstChild.textContent = e.time; li.lastChild.textContent = text(e);
    li.children[1].src = `assets/hud/eventos/${EVENT_ICON[e.key]}.png`; return li;
  }));
}

// ================= Idioma =================
function applyLang() {
  setFormats();
  document.documentElement.lang = I18N[lang].locale;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = T(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', T(el.dataset.i18nAria)));   // leitor de tela no idioma do jogo
  $('limitIn').placeholder = T('limitPh');
  $('balance').textContent = S.balance == null ? '—' : M(S.balance);
  renderAll(); renderLog();
  document.querySelectorAll('.stage .t:not(.chip), .stage [data-fit]').forEach(fitText);
}
function stepLang(d) { lang = LANGS[(LANGS.indexOf(lang) + d + LANGS.length) % LANGS.length]; store.set('oc-lang', lang); applyLang(); }

// ================= Som =================
const SFX = (() => {
  const FILES = { motor: 'motor-loop', rev: 'acelerada', brake: 'freio', crash: 'batida', intro: 'vinheta', win: 'vitoria' };
  let ctx = null, master = null, buf = {}, engineSrc = null, engineGain = null, introPlayed = false;
  let on = store.get('oc-audio') !== 'off';
  // O navegador só libera áudio depois de um toque/tecla do jogador. Um contexto criado sem gesto (a rodada começa
  // sozinha pelo servidor) nasce suspenso e fica mudo: por isso o contexto só nasce num gesto, e cada gesto o reativa.
  async function init() {
    if (ctx) { if (ctx.state === 'suspended') await ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(ctx.destination);
    await Promise.all(Object.entries(FILES).map(async ([k, f]) => {
      try { buf[k] = await ctx.decodeAudioData(await (await fetch(`assets/sfx/${f}.mp3`)).arrayBuffer()); } catch {}
    }));
    if (!introPlayed && S.round?.status !== 'running') { introPlayed = true; play('intro', .35); }
    // Primeiro toque no meio de uma corrida: o motor entra na hora.
    if (S.round?.status === 'running' && stoppedRound !== S.round.id) engineStart();
  }
  function play(k, vol = 1) {
    if (!ctx || !buf[k]) return null;
    const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf[k]; g.gain.value = vol;
    src.connect(g).connect(master); src.start(); return { src, g };
  }
  function engineStart() {
    if (!ctx || !buf.motor) return; engineStop(0);
    engineSrc = ctx.createBufferSource(); engineSrc.buffer = buf.motor; engineSrc.loop = true;
    engineGain = ctx.createGain(); engineGain.gain.setValueAtTime(0, ctx.currentTime); engineGain.gain.linearRampToValueAtTime(.55, ctx.currentTime + .25);
    engineSrc.connect(engineGain).connect(master); engineSrc.start();
  }
  function engineStop(fade = .25) {
    if (!engineSrc) return; const s = engineSrc, g = engineGain; engineSrc = engineGain = null;
    try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(g.gain.value, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + fade); s.stop(ctx.currentTime + fade + .02); } catch {}
  }
  function engineSpeed(kmh) { if (engineSrc) engineSrc.playbackRate.value = .75 + Math.min(300, kmh) / 300 * .9; }
  function setOn(v) {
    on = v; store.set('oc-audio', v ? 'on' : 'off');
    if (master) master.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, .05);
    if (v) init();
  }
  const ready = () => !!ctx && ctx.state === 'running';
  addEventListener('pointerdown', init); addEventListener('keydown', init);
  // Aba escondida ou janela minimizada: o som pausa; volta quando a aba aparece de novo.
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); });
  return { play, engineStart, engineStop, engineSpeed, setOn, get on() { return on; }, init, ready,
    estado: () => ({ contexto: ctx?.state ?? 'sem contexto', ligado: on, volume: master?.gain.value ?? null, sons: Object.keys(buf).length }) };
})();

// ================= Velocímetro e telemetria =================
const ARC = { cx: 133.4, cy: 927.7, r0: 95, r1: 110, start: 138.2, step: 7.17, width: 5.4, n: 38 };
const arcSegs = [];
for (let i = 0; i < ARC.n; i++) {
  const a0 = (ARC.start + i * ARC.step) * Math.PI / 180, a1 = a0 + ARC.width * Math.PI / 180;
  const p = (r, a) => `${(ARC.cx + r * Math.cos(a)).toFixed(1)} ${(ARC.cy + r * Math.sin(a)).toFixed(1)}`;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M${p(ARC.r0, a0)}L${p(ARC.r1, a0)}A${ARC.r1} ${ARC.r1} 0 0 1 ${p(ARC.r1, a1)}L${p(ARC.r0, a1)}A${ARC.r0} ${ARC.r0} 0 0 0 ${p(ARC.r0, a0)}Z`);
  $('arc').append(path); arcSegs.push(path);
}
for (const id of ['fuel', 'tires', 'hull']) for (let i = 0; i < 10; i++) $(id).append(document.createElement('i'));
function setSegs(id, v) {
  const n = Math.round(v / 10); [...$(id).children].forEach((x, i) => x.classList.toggle('on', i < n)); $(id).classList.toggle('low', v < 38);
  $(id + 'N').textContent = Math.round(v);
  const t = { fuel: 'tFuel', tires: 'tTires', hull: 'tHull' }[id]; if ($(t)) $(t).textContent = Math.round(v);
}

// ================= Turbo (só visual) =================
let turboUntil = 0;
function renderTurbo(active) {
  if (renderTurbo.last === active) return; renderTurbo.last = active;
  $('turbo').setAttribute('aria-checked', String(active));
  $('turboOn').classList.toggle('on', active);
  $('mTurbo').classList.toggle('on', active);
  const place = (img, [x, y, w, h]) => Object.assign(img.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  if (active) { place($('turboGlow'), [1726, 962, 100, 59]); place($('turboPlain'), [1628, 967, 94, 51]); }
  else { place($('turboGlow'), [1625, 963, 100, 59]); place($('turboPlain'), [1729, 966, 94, 51]); }
}
function turboPress() {
  if (S.round?.status !== 'running' || performance.now() < turboUntil) return;
  turboUntil = performance.now() + 2500; playFx('speed', 900); SFX.play('rev', .7); log('evTurbo');
}
$('turbo').addEventListener('click', turboPress);
$('mTurbo').addEventListener('click', turboPress);

// ================= Quebra e vitória (fim da rodada) =================
function placeCrash() {
  const s = Math.min(innerWidth * .96 / 1248, innerHeight * .7 / 702, Math.max(innerWidth / 1920, innerHeight / 1080));
  // Em pé, centrado na faixa livre do carro (Codex: y 230–424 de 844), acima dos painéis de aposta.
  const cy = innerHeight * (mode === 'portrait' ? 0.36 : 481 / 1080);
  $('crashBox').style.transform = `translate(${innerWidth / 2 - 624 * s}px,${cy - 351 * s}px) scale(${s})`;
}
function showCrash(point) {
  const el = $('crash'); clearTimeout(hideCrashT);            // um esconder pendente não pode apagar a quebra nova
  $('crashArt').src = `assets/resultado/${LETTERS.lose[lang]}.png`; $('crashArt').alt = T('crashTitle');
  $('crashMult').textContent = T('crashAt', { x: mx(point) }); $('crashCap').textContent = T('roundOver');
  el.classList.remove('out', 'shake'); el.hidden = true; void el.offsetWidth; el.hidden = false;
  if (!reduced.matches && fxOn) el.classList.add('shake');
  placeCrash();
}
let hideCrashT = 0;
function hideCrash() { const el = $('crash'); if (el.hidden) return; el.classList.add('out'); clearTimeout(hideCrashT); hideCrashT = setTimeout(() => { el.hidden = true; el.classList.remove('out'); }, 260); }
function placeWin() {
  const rs = Math.min(innerWidth * .98 / 960, innerHeight * .78 / 540, 2.2);
  $('winBox').style.setProperty('--rs', rs);
  $('winBox').style.transform = `translate(${(innerWidth - 960 * rs) / 2}px,${innerHeight * .42 - 270 * rs}px) scale(${rs})`;
}
// Fim da rodada com retirada: tela escura com NO BOLSO e o total (Celio, 13/10/2026).
function showWin(wins, crashPoint) {
  const total = wins.reduce((a, w) => a + w.amount, 0);
  $('winArt').src = `assets/resultado/${LETTERS.win[lang]}.png`; $('winArt').alt = T('winTitle');
  $('winMain').textContent = '+' + M(total);
  updateWinText(wins, crashPoint);
  SFX.play('win', .8);
  const el = $('result'); el.hidden = true; void el.offsetWidth; el.hidden = false; placeWin(); delete $('winText').dataset.fs; fitText($('winText'));
}
function updateWinText(wins, crashPoint) {
  const el = $('winText');
  el.textContent = crashPoint == null
    ? (wins.length === 1 ? T('winBraked', { x: mx(wins[0].multiplier) }) : '')
    : (wins.length === 1 ? T('winText', { x: mx(wins[0].multiplier), y: mx(crashPoint) }) : T('winTextMany', { y: mx(crashPoint) }));
  delete el.dataset.fs; fitText(el);
}
function hideWin() { $('result').hidden = true; }
$('again').addEventListener('click', hideWin);

// ================= Efeitos =================
const fxEl = $('fx');
let fxOn = store.get('oc-fx') !== 'off';                  // EFEITOS: tremor, flash vermelho, linhas de velocidade (vidro e fragmentos ficam sempre)
function setFx(v) { fxOn = v; store.set('oc-fx', v ? 'on' : 'off'); game.classList.toggle('no-fx', !v); renderSide(); }
function playFx(kind, ms) { if (!fxOn) return; fxEl.className = 'fx'; void fxEl.offsetWidth; fxEl.classList.add(kind); clearTimeout(playFx.t); playFx.t = setTimeout(() => { fxEl.className = 'fx'; }, ms); }
function freeze(ms) {
  if (reduced.matches || !fxOn) return;
  video.pause(); video.classList.add('frozen');
  setTimeout(() => video.classList.remove('frozen'), ms);
}
let speed = 0, braking = false, stoppedRound = null;

// ================= Mensagens =================
let statusTimer = 0;
function status(text, ms = 0) {
  const el = $('status'); el.textContent = text; el.hidden = !text;
  clearTimeout(statusTimer); if (text && ms) statusTimer = setTimeout(() => { el.hidden = true; }, ms);
}
function modal(text, btn, onOk) {
  $('modalText').textContent = text; $('modalBtn').textContent = btn; $('modal').hidden = false;
  $('modalOk').onclick = () => { $('modal').hidden = true; onOk && onOk(); };
}
function showReality(sum) {
  modal(T('reality', { m: sum?.minutesPlayed ?? 0, r: sum?.rounds ?? 0, n: M(sum?.net ?? 0) }), T('continue'),
    () => api('POST', '/v1/reality-check/ack').then(s => { S.session = s; renderSide(); }).catch(e => status(e.message, 3500)));
}

// ================= Entrada =================
stage.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t || t.disabled) return;
  if (t.dataset.act) act(+t.dataset.act);
  else if (t.dataset.chip) setStake(+t.closest('.g').id.slice(-1), +t.dataset.chip);
  else if (t.dataset.autoon) toggleAuto(+t.dataset.autoon);
  else if ('menu' in t.dataset) toggleSide();
  else if ('openBet2' in t.dataset) { bet2Open = true; renderBets(); }
  else if ('closeBet2' in t.dataset) { bet2Open = false; renderBets(); }
  else if ('liveToggle' in t.dataset) { liveOpen = !liveOpen; renderLive(); relayout(); }
});
stage.addEventListener('input', e => { if (e.target.dataset?.auto) cleanAuto(e.target); });
// toque em qualquer ponto do campo da retirada automática foca a digitação (o campo em si tem só ~20 px de altura no celular)
stage.addEventListener('click', e => { const f = e.target.closest?.('.field'); const inp = f?.querySelector('[data-auto]'); if (inp && e.target !== inp && !e.target.closest('[data-autoon]') && !inp.disabled) inp.focus(); });
stage.addEventListener('focusin', e => { const t = e.target; if (t.dataset?.auto) { t.value = t.value.replace('×', ''); t.select(); } });
stage.addEventListener('change', e => { const t = e.target; if (t.dataset.auto) setAuto(+t.dataset.auto, t.value.replace('×', '')); });
stage.addEventListener('focusin', e => { const t = e.target; if (t.dataset.auto) t.select(); });
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
  const tab = b.dataset.tab, tabPos = { config: [14, 124, 177, 61], player: [190, 126, 151, 57], events: [341, 126, 150, 57] };
  const place = (img, [x, y, w, h]) => Object.assign(img.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  document.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== tab);
  $('tabArtOff').hidden = $('tabArtOn').hidden = tab === 'config';
  if (tab !== 'config') { place($('tabArtOff'), tabPos.config); place($('tabArtOn'), tabPos[tab]); }
}));
document.querySelectorAll('[data-toggle="audio"]').forEach(b => b.addEventListener('click', () => { SFX.setOn(!SFX.on); renderSide(); }));
for (const id of ['autoDown', 'autoUp', 'autoVal']) $(id).addEventListener('click', () => setFx(!fxOn));
document.querySelectorAll('[data-lang-step]').forEach(b => b.addEventListener('click', () => stepLang(+b.dataset.langStep)));
$('limitSet').addEventListener('click', async () => {
  const v = Math.round(Number(String($('limitIn').value).replace(',', '.')) * 100); $('limitIn').value = '';
  if (!(v > 0)) return;
  try { S.limits = await api('PUT', '/v1/limits', { lossLimitDay: v }); renderSide(); } catch (e) { status(e.message, 3500); }
});
$('sessionEnd').addEventListener('click', async () => {
  try { await api('POST', '/v1/session/end'); log('evBreak'); modal(T('ended'), T('playAgain'), reopenSession); } catch (e) { status(e.message, 3500); }
});
document.addEventListener('keydown', e => {
  if (e.code === 'Escape' && sideOpen) { toggleSide(false); return; }
  if (e.code !== 'Space' || e.repeat || document.activeElement !== document.body) return;
  e.preventDefault(); act(S.slots[1].bet || slotState(1) === 'idle' ? 1 : 2);
});

// ================= Quadro a quadro =================
let last = performance.now(), lastPhaseKey = '';
function frame(t) {
  const dt = Math.min(.25, Math.max(0, (t - last) / 1000)); last = t;
  const r = S.round, running = r?.status === 'running';
  const elapsed = running && r.startedAt ? Math.max(0, (now() - r.startedAt) / 1000) : 0;
  const turbo = running && t < turboUntil;
  const stopped = running && stoppedRound === r.id;
  const target = running && !stopped ? Math.min(250, 140 + elapsed * 7) + (turbo ? 45 : 0) : 0;
  speed += (target - speed) * (1 - Math.exp(-dt * (stopped ? 1.8 : running ? 1.6 : 4)));
  if (running && !stopped && video.paused && !video.classList.contains('frozen')) video.play().catch(() => {});
  if (running) { const pr = Math.round(Math.max(.5, Math.min(1.8, speed / 170)) * 20) / 20; if (Math.abs(video.playbackRate - pr) >= .05) video.playbackRate = pr; } // iOS trava se a velocidade muda todo quadro
  if (stopped && speed < 3 && !video.paused) video.pause();
  $('speed').textContent = Math.round(speed); SFX.engineSpeed(speed);
  if ($('tSpeed')) $('tSpeed').textContent = Math.round(speed) + ' KM/H';
  const lit = Math.round(Math.min(300, speed) / 300 * ARC.n); arcSegs.forEach((p, i) => p.classList.toggle('on', i < lit));
  setSegs('fuel', 30 + 66 * Math.exp(-elapsed * .10)); setSegs('tires', 28 + 68 * Math.exp(-elapsed * .12));
  setSegs('hull', r?.status === 'crashed' ? 4 : 30 + 66 * Math.exp(-elapsed * .09));
  renderTurbo(turbo);
  $('turboFill').style.width = (turbo ? (turboUntil - t) / 2500 * 170 : 0) + 'px';
  // Fase: redesenha quando o texto muda (contagem a cada segundo, multiplicador a cada centésimo).
  const key = !r ? '-' : r.status === 'betting' ? 'b' + Math.ceil((r.bettingEndsAt - now()) / 1000) : r.status === 'running' ? 'r' + liveMultiplier() : 'c' + r.id;
  if (key !== lastPhaseKey) { lastPhaseKey = key; renderPhase(); if (running) updateCashoutValues(); }
  requestAnimationFrame(frame);
}
// Só o valor do botão RETIRAR muda a cada centésimo; o resto do painel fica.
function updateCashoutValues() {
  const m = liveMultiplier();
  for (const n of [1, 2]) {
    const b = S.slots[n].bet; if (b?.status !== 'running') continue;
    const a2 = $('g-bet' + n).querySelector('.b-act .a2'); if (a2) a2.textContent = M(payoutAt(b.stake, m));
  }
}

// ================= Início =================
game.classList.toggle('no-fx', !fxOn);
setFormats(); layout(); renderTurbo(false); applyLang();
document.fonts && document.fonts.ready.then(() => document.querySelectorAll('.stage .t:not(.chip), .stage [data-fit]').forEach(fitText));
requestAnimationFrame(frame);
if (DEMO) {
  // a demo só é carregada quando pedida: no jogo com dinheiro real este arquivo nem é baixado
  const sc = document.createElement('script'); sc.src = 'demo-local.js?v=2'; sc.onload = connect; document.head.appendChild(sc);
} else if (!TOKEN) modal(T('noServer'), 'OK');
else connect();
window.overcrashHUD = { S, layout, renderAll, onMessage, som: () => SFX.estado(), setLang: l => { if (LANGS.includes(l)) { lang = l; applyLang(); } } };
})();
