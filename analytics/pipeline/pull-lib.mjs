/**
 * ════════════════════════════════════════════════════════════════════
 * pull-lib.mjs — shared onchain-pull logic
 * ════════════════════════════════════════════════════════════════════
 * Everything weekly-pull.mjs (the weekly-scheduled, current-period job)
 * and backfill.mjs (the one-off historical job) both need: the Starkscan
 * client, the Supabase client, block/date helpers, and the core
 * `pullPeriod()` routine that turns one Monday-to-Sunday period into
 * upserted rows.
 *
 * Neither caller talks to Starkscan or Supabase directly — they both
 * just call pullPeriod(). That's what keeps the two scripts from
 * drifting out of sync on rate-limiting, NULL-on-failure, or caching.
 */

export const { SUPABASE_URL, SUPABASE_SERVICE_KEY, STARKSCAN_API_KEY } = process.env;

export const STARKSCAN = "https://api.starkscan.co/v1/SN_MAIN";

/* ── date helpers (UTC Monday boundaries) ─────────────────────────── */
export function mondayOf(d) {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() - dow + 1);
  return day;
}
export const currentWeekMonday = (now = new Date()) => mondayOf(now);
export const iso = d => d.toISOString().slice(0, 10);
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const addDays = (d, n) => new Date(d.getTime() + n * 864e5);

/* ── supabase REST ────────────────────────────────────────────────── */
export const sb = async (path, init = {}) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
      ...(init.headers || {})
    }
  });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`);
  const text = await r.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
};

/* ── Starkscan REST, rate-limited ────────────────────────────────── */
// Free plan: 2 req/s light, 1 req/s heavy. One shared throttle keeps us
// safely under both without needing to classify every route by hand.
const STARKSCAN_INTERVAL_MS = 1100;
let lastCall = 0;
async function throttle() {
  const wait = lastCall + STARKSCAN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}

export async function starkscan(path, tries = 4) {
  const url = `${STARKSCAN}${path}`;
  for (let i = 0; i < tries; i++) {
    await throttle();
    try {
      const r = await fetch(url, { headers: { "X-Starkscan-Api-Key": STARKSCAN_API_KEY, accept: "application/json" } });
      if (r.status === 429) {
        const ra = Number(r.headers.get("retry-after"));
        await sleep(ra ? ra * 1000 : 3000 * (i + 1));
        continue;
      }
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status}${body ? " — " + body.slice(0, 200) : ""}`);
      }
      return await r.json();
    } catch (e) {
      if (i === tries - 1) { console.warn(`    ↳ ${path.split("?")[0]} failed: ${e.message}`); return null; }
      await sleep(900 * (i + 1));
    }
  }
  return null;
}

/** Resolve a moment in time to the nearest indexed block. */
export async function blockAtTimestamp(dateMs, closest) {
  const ts = Math.floor(dateMs / 1000);
  const j = await starkscan(`/block-at-timestamp?timestamp=${ts}&closest=${closest}`);
  if (!j) return null;
  return j.block?.blockNumber ?? null;
}

/**
 * Look up who sent a transaction. Result is permanent — a transaction's
 * sender never changes — so every hash is only ever resolved once,
 * ever, across all future runs.
 */
export async function resolveSender(hash) {
  const j = await starkscan(`/tx/${hash}`);
  if (!j) return null;
  return j.fromAddress ?? null;
}

/** Fetch already-known senders for a batch of hashes, chunked to keep URLs reasonable. */
export async function getCachedSenders(hashes) {
  const arr = [...hashes], out = new Map(), CHUNK = 80;
  for (let i = 0; i < arr.length; i += CHUNK) {
    const chunk = arr.slice(i, i + CHUNK);
    const j = await sb(`tx_senders?select=tx_hash,sender&tx_hash=in.(${chunk.map(h => `"${h}"`).join(",")})`);
    for (const row of j || []) out.set(row.tx_hash, row.sender);
  }
  return out;
}

export async function contractTxHashesInRange(address, fromBlock, toBlock) {
  const hashes = new Set();
  let cursor = null, pages = 0;
  do {
    const q = new URLSearchParams({ from_block: fromBlock, to_block: toBlock, limit: "100" });
    if (cursor) q.set("cursor", cursor);
    const j = await starkscan(`/contract/${address}/events?${q}`);
    if (!j) return null;                          // hard fail for this contract
    for (const item of j.items || []) {
      const h = item.txHash ?? item.tx_hash ?? item.transactionHash;
      if (h) hashes.add(h);
    }
    cursor = j.nextCursor ?? null;
  } while (cursor && ++pages < 500);               // sane page cap
  return hashes;
}

/**
 * Cheap existence check — does this contract have ANY event in
 * [fromBlock, toBlock]? limit=1 means this costs one request regardless
 * of how much real activity sits in that range. Used by backfill.mjs to
 * binary-search a contract's first-activity block without ever paging
 * through its full history.
 */
export async function hasActivityInRange(address, fromBlock, toBlock) {
  const q = new URLSearchParams({ from_block: fromBlock, to_block: toBlock, limit: "1" });
  const j = await starkscan(`/contract/${address}/events?${q}`);
  if (j === null) return null;                    // failed — caller decides how to treat this
  return (j.items || []).length > 0;
}

/**
 * Pull one Monday-to-Sunday(ish) period for a set of games and upsert
 * one weekly_snapshots row per game. This is the exact body both
 * weekly-pull.mjs and backfill.mjs run — the only difference between
 * "today's number nudging up" and "a historical row landing for the
 * first time" is which period and which games get passed in here.
 *
 * @param {Date} monday        UTC Monday that opens the period
 * @param {Date} to            end of the period (exclusive-ish; either
 *                              `monday + 7 days` for a closed period, or
 *                              `Date.now()` for the still-open one)
 * @param {Set<string>|null} gameSlugs  restrict to these slugs, or null
 *                              for every active game
 * @param {number} lookupBudget max NEW sender lookups this call may
 *                              spend. The scheduled job passes a small
 *                              number (a busy period's player count
 *                              finishes resolving over a few scheduled
 *                              runs). Backfill passes Infinity —
 *                              a historical period should never be left
 *                              half-resolved, since nothing will ever
 *                              run for it again.
 */
export async function pullPeriod(monday, to, gameSlugs, lookupBudget) {
  const week = iso(monday);
  const from = monday.getTime();

  const fromBlock = await blockAtTimestamp(from, "after");
  const toBlock   = await blockAtTimestamp(Math.min(to, Date.now()), "before");
  if (fromBlock === null || toBlock === null) {
    console.error(`  ✗ ${week}: could not resolve the block range — skipping without writing anything.`);
    return { week, ok: 0, total: 0 };
  }

  let q = `game_contracts?select=game_slug,address,games!inner(id,name,active)&counts_toward_activity=eq.true&is_shared_infra=eq.false&games.active=eq.true`;
  const rows_raw = await sb(q);
  if (!rows_raw || !rows_raw.length) { console.log(`  ${week}: no active game contracts found`); return { week, ok: 0, total: 0 }; }

  const byGame = new Map();
  for (const r of rows_raw) {
    const g = r.games;
    if (gameSlugs && !gameSlugs.has(r.game_slug)) continue;
    if (!byGame.has(g.id)) byGame.set(g.id, { id: g.id, name: g.name, contracts: [] });
    byGame.get(g.id).contracts.push(r.address);
  }
  if (!byGame.size) { console.log(`  ${week}: no matching games for this run`); return { week, ok: 0, total: 0 }; }

  const rows = [];
  const newlyResolved = [];
  const games = [...byGame.values()];
  const gameHashes = new Map();
  const anyContractFailed = new Set();

  for (const g of games) {
    let allHashes = new Set(), failed = false;
    for (const addr of g.contracts) {
      const hashes = await contractTxHashesInRange(addr, fromBlock, toBlock);
      if (hashes === null) { failed = true; break; }
      hashes.forEach(h => allHashes.add(h));
    }
    if (failed) anyContractFailed.add(g.id);
    gameHashes.set(g.id, allHashes);
  }

  games.sort((a, b) => gameHashes.get(a.id).size - gameHashes.get(b.id).size);

  let lookupsUsed = 0;
  for (const g of games) {
    const allHashes = gameHashes.get(g.id);

    if (anyContractFailed.has(g.id)) {
      console.warn(`  ✗ ${week} · ${g.name}: a contract lookup failed — writing NULLs`);
      rows.push({ game_id: g.id, week_start: week, unique_wallets: null, tx_count: null, volume: null, source: "failed" });
      continue;
    }

    if (allHashes.size === 0) {
      console.log(`  ✓ ${week} · ${g.name}: 0 transactions`);
      rows.push({ game_id: g.id, week_start: week, unique_wallets: 0, tx_count: 0, volume: null, source: "starkscan" });
      continue;
    }

    const cached = await getCachedSenders(allHashes);
    const missing = [...allHashes].filter(h => !cached.has(h));
    const senders = new Set(cached.values());
    let processedThisGame = 0, ranOutOfBudget = false;

    for (const h of missing) {
      if (lookupsUsed >= lookupBudget) { ranOutOfBudget = true; break; }
      const s = await resolveSender(h);
      lookupsUsed++; processedThisGame++;
      if (s) { senders.add(s); newlyResolved.push({ tx_hash: h, sender: s }); }
    }

    if (ranOutOfBudget) {
      const left = missing.length - processedThisGame;
      console.log(`  ✓ ${week} · ${g.name}: ${allHashes.size} transactions, ${senders.size}+ players so far (${left} wallets still resolving)`);
      // Write what we've actually resolved so far (cached + newly looked-up), not null.
      // source:"partial" marks it as a floor, not a final count, so a later run with
      // budget to spare will pick this period back up and finish it (see backfill.mjs skip check).
      rows.push({ game_id: g.id, week_start: week, unique_wallets: senders.size, tx_count: allHashes.size, volume: null, source: "partial" });
    } else {
      console.log(`  ✓ ${week} · ${g.name}: ${allHashes.size} transactions, ${senders.size} players`);
      rows.push({ game_id: g.id, week_start: week, unique_wallets: senders.size, tx_count: allHashes.size, volume: null, source: "starkscan" });
    }
  }

  if (newlyResolved.length) {
    for (let i = 0; i < newlyResolved.length; i += 500) {
      await sb("tx_senders", { method: "POST", body: JSON.stringify(newlyResolved.slice(i, i + 500)) });
    }
  }

  if (rows.length) {
    await sb("weekly_snapshots?on_conflict=game_id,week_start", { method: "POST", body: JSON.stringify(rows) });
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/roll_up_offchain`, {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ target_week: week })
    });
  }

  const ok = rows.filter(r => r.tx_count !== null).length;
  return { week, ok, total: rows.length };
}
