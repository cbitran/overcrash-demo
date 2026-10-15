// OverCrash: modo DEMO local, sem servidor (kit de venda, Celio 14/10/2026).
// Roda a rodada compartilhada inteira no navegador, com FICHAS DE DEMONSTRAÇÃO, para o jogo ser mostrado ou publicado sem
// hospedagem. Não serve para dinheiro real: aqui o sorteio fica no navegador (copiável). Com dinheiro real, quem decide
// é sempre o servidor do jogo (logic/backend), e esta demo nem é carregada.
// Mesma matemática do servidor (logic/backend/src/fair.ts e game.ts):
//   ponto de falha: P(falha ≥ m) = (1 − margem)/m, truncado em 2 casas, mínimo 1,00×; teto 1000×;
//   multiplicador(t) = e^(g·t), truncado em 2 casas; empate (alvo = falha) ganha; retirada manual só abaixo da falha.
// Sem jogadores falsos: a lista de apostas ao vivo fica vazia.
(() => {
  'use strict';
  const CFG = {
    houseEdge: 0.03, growthRate: 0.07, maxMultiplier: 1000, bettingSeconds: 8, crashPauseSeconds: 3,
    stakeOptions: [1000, 2500, 5000, 10_000, 25_000], minStake: 100, maxStake: 100_000, initialBalance: 125_000,
  };
  const CUR = (new URLSearchParams(location.search).get('currency') || 'USD').toUpperCase().slice(0, 3);   // ?currency=BRL
  // mensagens no idioma da demo (?lang=pt|en|es; padrão inglês)
  const LG = ['pt', 'en', 'es'].includes(new URLSearchParams(location.search).get('lang')) ? new URLSearchParams(location.search).get('lang') : 'en';
  const TXT = {
    closed: { pt: 'As apostas desta rodada estão fechadas.', en: 'Betting for this round is closed.', es: 'Las apuestas de esta ronda están cerradas.' },
    range: { pt: 'Valor fora dos limites.', en: 'Amount outside the limits.', es: 'Monto fuera de los límites.' },
    slot: { pt: 'Já existe uma aposta neste espaço.', en: 'There is already a bet in this slot.', es: 'Ya hay una apuesta en este espacio.' },
    funds: { pt: 'Saldo insuficiente.', en: 'Insufficient balance.', es: 'Saldo insuficiente.' },
    cancel: { pt: 'Não dá mais para cancelar.', en: 'It can no longer be cancelled.', es: 'Ya no se puede cancelar.' },
    settled: { pt: 'Aposta já encerrada.', en: 'Bet already settled.', es: 'Apuesta ya cerrada.' },
    late: { pt: 'Tarde demais: o carro já quebrou.', en: 'Too late: the car already crashed.', es: 'Demasiado tarde: el coche ya chocó.' },
    na: { pt: 'Não disponível na demo.', en: 'Not available in the demo.', es: 'No disponible en la demo.' },
  };
  const MSG = (k) => TXT[k][LG];
  const floor2 = (x) => Math.floor(x * 100 + 1e-9) / 100;
  const multAt = (s) => floor2(Math.exp(Math.max(0, s) * CFG.growthRate));
  const secTo = (m) => Math.log(m) / CFG.growthRate;
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  const HAZ = ['wall', 'bridge', 'cliff'];
  // 52 bits do gerador criptográfico do navegador, como no servidor
  function drawCrash() {
    const a = new Uint32Array(2); crypto.getRandomValues(a);
    const r = ((a[0] & 0xfffff) * 2 ** 32 + a[1]) / 2 ** 52;
    return Math.max(1, Math.floor(((1 - CFG.houseEdge) / (1 - r)) * 100 + 1e-9) / 100);
  }
  const err = (code, status, message, data = {}) => Object.assign(new Error(message), { code, status, data: { error: code, ...data } });

  const subs = new Set();
  const emit = (m) => { for (const f of subs) { try { f(m); } catch (e) { console.error(e); } } };
  let balance = CFG.initialBalance, seq = 0, round = null, crash = 1, hazard = 'wall', timer = 0;
  const history = [], bets = new Map();      // id → aposta do jogador desta rodada
  const t0 = Date.now(); let rounds = 0, net = 0;

  const roundView = () => ({
    id: round.id, seq: round.seq, status: round.status, houseEdge: CFG.houseEdge, growthRate: CFG.growthRate,
    maxMultiplier: CFG.maxMultiplier, bettingEndsAt: round.bettingEndsAt, startedAt: round.startedAt,
    crashedAt: round.status === 'crashed' ? round.crashedAt : null,
    crashPoint: round.status === 'crashed' ? Math.min(crash, CFG.maxMultiplier) : null,
    drawnCrashPoint: round.status === 'crashed' ? crash : null, hazard: round.status === 'crashed' ? hazard : null, seed: null,
  });
  const betView = (b) => ({ ...b, crashPoint: b.status === 'won' || b.status === 'lost' ? (round.status === 'crashed' ? Math.min(crash, CFG.maxMultiplier) : null) : null });
  const setBalance = (v) => { balance = v; emit({ type: 'balance', balance }); };

  function schedule(fn, ms) { clearTimeout(timer); timer = setTimeout(fn, Math.max(0, ms)); }
  function newRound() {
    crash = drawCrash(); hazard = HAZ[Math.floor(Math.random() * 3)];
    round = { id: uid(), seq: ++seq, status: 'betting', bettingEndsAt: Date.now() + CFG.bettingSeconds * 1000, startedAt: null, crashedAt: null };
    bets.clear();
    emit({ type: 'round_betting', round: roundView() });
    schedule(start, CFG.bettingSeconds * 1000);
  }
  function start() {
    round.status = 'running'; round.startedAt = Date.now();
    for (const b of bets.values()) if (b.status === 'placed') { b.status = 'running'; b.startedAt = round.startedAt; emit({ type: 'bet_running', bet: betView(b) }); }
    emit({ type: 'round_started', round: roundView() });
    for (const b of bets.values()) if (b.status === 'running') scheduleBet(b);
    const end = Math.min(crash, CFG.maxMultiplier);
    setTimeout(endRound, secTo(end) * 1000);
  }
  function scheduleBet(b) {
    const target = b.autoCashout !== null && b.autoCashout <= CFG.maxMultiplier ? b.autoCashout : CFG.maxMultiplier;
    if (target <= crash) b.t = setTimeout(() => settle(b, target, target === b.autoCashout ? 'auto' : 'max'), secTo(target) * 1000);
  }
  function settle(b, m, reason) {
    if (b.status !== 'running') return;
    clearTimeout(b.t);
    b.status = 'won'; b.cashoutMultiplier = m; b.payout = Math.floor(b.stake * Math.round(m * 100) / 100); b.settleReason = reason; b.settledAt = Date.now();
    net += b.payout - b.stake;
    setBalance(balance + b.payout);
    emit({ type: 'bet_settled', bet: betView(b) });
  }
  function endRound() {
    round.status = 'crashed'; round.crashedAt = Date.now();
    history.unshift(Math.min(crash, CFG.maxMultiplier)); history.length = Math.min(history.length, 20);
    emit({ type: 'round_crashed', round: roundView() });          // o aviso sai antes de liquidar, como no servidor
    for (const b of bets.values()) if (b.status === 'running') { clearTimeout(b.t); b.status = 'lost'; b.settledAt = Date.now(); net -= b.stake; emit({ type: 'bet_settled', bet: betView(b) }); }
    rounds++;
    schedule(newRound, CFG.crashPauseSeconds * 1000);
  }

  function state() {
    return {
      serverNow: Date.now(), moneyMode: 'demo', currency: CUR, locale: null, balance,
      config: { minStake: CFG.minStake, maxStake: CFG.maxStake, stakeOptions: CFG.stakeOptions, maxConcurrentBets: 2, autoCashoutAllowed: true,
        maxMultiplier: CFG.maxMultiplier, maxWinAmount: null, growthRate: CFG.growthRate, rtp: 1 - CFG.houseEdge,
        bettingSeconds: CFG.bettingSeconds, crashPauseSeconds: CFG.crashPauseSeconds },
      jurisdiction: { code: 'DEMO', timeZone: null },
      openBets: [...bets.values()].filter((b) => b.status === 'placed' || b.status === 'running').map(betView),
      history: [...history], round: round ? roundView() : null, liveBets: [], chain: null,
      limits: { lossLimitDay: null, effective: { lossLimitDay: null } },
      session: { minutesPlayed: Math.floor((Date.now() - t0) / 60000), rounds, net },
    };
  }

  async function request(method, path, body = {}) {
    await new Promise((r) => setTimeout(r, 30));                 // como uma ida e volta curta
    if (method === 'GET' && path === '/v1/state') return state();
    if (method === 'POST' && path === '/v1/bets') {
      const { stake, autoCashout = null, slot = 1, roundId } = body;
      if (!round || round.status !== 'betting' || (roundId && roundId !== round.id)) throw err('BETTING_CLOSED', 409, MSG('closed'));
      if (!Number.isInteger(stake) || stake < CFG.minStake || stake > CFG.maxStake) throw err('STAKE_OUT_OF_RANGE', 400, MSG('range'));
      if ([...bets.values()].some((b) => b.slot === slot)) throw err('BET_SLOT_TAKEN', 409, MSG('slot'));
      if (stake > balance) throw err('INSUFFICIENT_FUNDS', 402, MSG('funds'));
      const auto = autoCashout === null ? null : Math.max(1.01, floor2(autoCashout));
      const b = { id: uid(), roundId: round.id, slot, status: 'placed', stake, currency: state().currency, autoCashout: auto, startedAt: null,
        growthRate: CFG.growthRate, maxMultiplier: CFG.maxMultiplier, maxWinAmount: null, cashoutMultiplier: null, payout: 0, settleReason: null, settledAt: null };
      bets.set(b.id, b); setBalance(balance - stake);
      emit({ type: 'bet_placed', bet: betView(b) });
      return betView(b);
    }
    let m = path.match(/^\/v1\/bets\/([^/]+)\/cancel$/);
    if (method === 'POST' && m) {
      const b = bets.get(m[1]);
      if (!b || b.status !== 'placed' || round.status !== 'betting') throw err('CANNOT_CANCEL', 409, MSG('cancel'));
      bets.delete(b.id); b.status = 'cancelled'; setBalance(balance + b.stake);
      emit({ type: 'bet_cancelled', bet: betView(b) });
      return betView(b);
    }
    m = path.match(/^\/v1\/bets\/([^/]+)\/cashout$/);
    if (method === 'POST' && m) {
      const b = bets.get(m[1]);
      if (!b || b.status !== 'running') throw err('ALREADY_SETTLED', 409, MSG('settled'), { bet: b ? betView(b) : null });
      const now = multAt((Date.now() - round.startedAt) / 1000);
      if (now >= crash) throw err('TOO_LATE', 409, MSG('late'), { bet: betView(b) });
      settle(b, Math.max(1, now), 'manual');
      return betView(b);
    }
    if (path === '/v1/limits') return state().limits;
    if (path === '/v1/reality-check/ack') return state().session;
    if (path === '/v1/session/end' || path === '/v1/session/reopen') return { ended: true, token: 'demo' };
    throw err('BAD_REQUEST', 400, MSG('na'));
  }

  window.OverCrashDemo = {
    request,
    subscribe(fn) {
      subs.add(fn);
      if (!round) newRound();
      setTimeout(() => fn({ type: 'hello', state: state() }), 0);
      return () => subs.delete(fn);
    },
  };
})();
