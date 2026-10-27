// ツレドキ：釣果投稿の受付（/api/*）。それ以外は静的ファイル（out/）をそのまま返す。
// - 投稿は選択式と数字だけ（自由記述なし）。名前などの個人情報は受け付けない。
// - スパム対策：Cloudflare Turnstile の確認と、同じ回線から1日10件まで。
// - IPアドレスは保存しない（日付ごとの塩を加えたハッシュだけを、1日の投稿数の確認に使う）。
import allowed from "./allowed.json";

type Env = {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  DB: D1Database;
  TURNSTILE_SECRET: string;
  ADMIN_TOKEN?: string;
};

// 最小限の型（@cloudflare/workers-types を入れずに済ませる）
type D1Result<T> = { results: T[] };
type D1Stmt = {
  bind: (...v: unknown[]) => D1Stmt;
  run: () => Promise<unknown>;
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
};
type D1Database = { prepare: (sql: string) => D1Stmt; exec: (sql: string) => Promise<unknown> };

const SPOTS = new Set(allowed.spots.map((s) => s.slug));
const SPECIES = new Set(allowed.species);
const METHODS = new Set(allowed.methods);
const TIMES = new Set(allowed.times);
const DAILY_LIMIT = 10;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const jstDate = (offsetDays = 0) => new Date(Date.now() + 9 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let ready = false;
async function ensureTable(db: D1Database) {
  if (ready) return;
  await db.exec(
    "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, date TEXT NOT NULL, spot TEXT NOT NULL, species TEXT NOT NULL, size_cm REAL, count INTEGER, method TEXT, time_band TEXT, client TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published')",
  );
  await db.exec("CREATE INDEX IF NOT EXISTS posts_spot_date ON posts (spot, date)");
  ready = true;
}

function optionalNumber(v: unknown, min: number, max: number, integer = false): number | null | "invalid" {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return "invalid";
  return integer ? Math.round(n) : Math.round(n * 10) / 10;
}

async function createPost(req: Request, env: Env) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "送信内容を読み取れませんでした。" }, 400);
  }
  const date = String(body.date ?? "");
  const spot = String(body.spot ?? "");
  const species = String(body.species ?? "");
  const method = body.method ? String(body.method) : null;
  const timeBand = body.timeBand ? String(body.timeBand) : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > jstDate() || date < jstDate(-7))
    return json({ error: "釣った日は、今日から7日前までの日付を選んでください。" }, 400);
  if (!SPOTS.has(spot)) return json({ error: "釣り場を一覧から選んでください。" }, 400);
  if (!SPECIES.has(species)) return json({ error: "魚種を一覧から選んでください。" }, 400);
  if (method && !METHODS.has(method)) return json({ error: "釣り方を一覧から選んでください。" }, 400);
  if (timeBand && !TIMES.has(timeBand)) return json({ error: "時間帯を一覧から選んでください。" }, 400);
  const size = optionalNumber(body.sizeCm, 1, 200);
  const count = optionalNumber(body.count, 1, 999, true);
  if (size === "invalid") return json({ error: "サイズは1〜200cmの数字で入力してください。" }, 400);
  if (count === "invalid") return json({ error: "匹数は1〜999の数字で入力してください。" }, 400);

  // Turnstile（人による操作かの確認）
  const ip = req.headers.get("CF-Connecting-IP") ?? "";
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET ?? "");
  form.append("response", String(body.turnstileToken ?? ""));
  if (ip) form.append("remoteip", ip);
  const verify = (await (
    await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form })
  ).json()) as { success: boolean };
  if (!verify.success) return json({ error: "確認に失敗しました。ページを読み込み直して、もう一度お試しください。" }, 403);

  await ensureTable(env.DB);
  const today = jstDate();
  const client = await sha256(`${today}|${ip}|tsuredoki`); // 日付が変わると別の値になり、追跡できない
  const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE client = ?").bind(client).first<{ n: number }>();
  if ((used?.n ?? 0) >= DAILY_LIMIT) return json({ error: "投稿は1日10件までです。また明日お願いします。" }, 429);

  await env.DB.prepare(
    "INSERT INTO posts (created_at, date, spot, species, size_cm, count, method, time_band, client) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(new Date().toISOString(), date, spot, species, size, count, method, timeBand, client)
    .run();
  return json({ ok: true });
}

async function listPosts(url: URL, env: Env) {
  await ensureTable(env.DB);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 14), 1), 90);
  const from = jstDate(-days + 1);
  const spot = url.searchParams.get("spot");
  const sql =
    "SELECT id, date, spot, species, size_cm AS sizeCm, count, method, time_band AS timeBand FROM posts WHERE status = 'published' AND date >= ?" +
    (spot ? " AND spot = ?" : "") +
    " ORDER BY date DESC, id DESC LIMIT 500";
  const stmt = spot ? env.DB.prepare(sql).bind(from, spot) : env.DB.prepare(sql).bind(from);
  const { results } = await stmt.all();
  return json({ posts: results });
}

// 管理者による非表示（ADMIN_TOKEN を知っている人だけ）
async function hidePost(id: string, req: Request, env: Env) {
  if (!env.ADMIN_TOKEN || req.headers.get("Authorization") !== `Bearer ${env.ADMIN_TOKEN}`)
    return json({ error: "権限がありません。" }, 401);
  await ensureTable(env.DB);
  await env.DB.prepare("UPDATE posts SET status = 'hidden' WHERE id = ?").bind(Number(id)).run();
  return json({ ok: true });
}

// ---------- 要望の書き込み箱（運営だけが見る） ----------
const REQUEST_CATEGORIES = new Set(["釣り場を追加してほしい", "釣果の取り込み先", "機能の要望", "情報のまちがい", "その他"]);

let requestsReady = false;
async function ensureRequests(db: D1Database) {
  if (requestsReady) return;
  await db.exec(
    "CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, category TEXT NOT NULL, body TEXT NOT NULL, page TEXT, client TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new')",
  );
  requestsReady = true;
}

async function createRequest(req: Request, env: Env) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "送信内容を読み取れませんでした。" }, 400);
  }
  const category = String(body.category ?? "");
  const text = String(body.body ?? "").trim();
  const page = body.page ? String(body.page).slice(0, 200) : null;
  if (!REQUEST_CATEGORIES.has(category)) return json({ error: "種類を選んでください。" }, 400);
  if (text.length < 5 || text.length > 1000) return json({ error: "内容は5〜1000文字で入力してください。" }, 400);
  const ip = req.headers.get("CF-Connecting-IP") ?? "";
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET ?? "");
  form.append("response", String(body.turnstileToken ?? ""));
  if (ip) form.append("remoteip", ip);
  const verify = (await (
    await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form })
  ).json()) as { success: boolean };
  if (!verify.success) return json({ error: "確認に失敗しました。ページを読み込み直して、もう一度お試しください。" }, 403);
  await ensureRequests(env.DB);
  const client = await sha256(`${jstDate()}|${ip}|tsuredoki-req`);
  const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM requests WHERE client = ?").bind(client).first<{ n: number }>();
  if ((used?.n ?? 0) >= 5) return json({ error: "送信は1日5件までです。また明日お願いします。" }, 429);
  await env.DB.prepare("INSERT INTO requests (created_at, category, body, page, client) VALUES (?, ?, ?, ?, ?)")
    .bind(new Date().toISOString(), category, text, page, client)
    .run();
  return json({ ok: true });
}

async function listRequests(req: Request, env: Env) {
  if (!env.ADMIN_TOKEN || req.headers.get("Authorization") !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: "権限がありません。" }, 401);
  await ensureRequests(env.DB);
  const { results } = await env.DB.prepare("SELECT id, created_at, category, body, page, status FROM requests ORDER BY id DESC LIMIT 200").all();
  return json({ requests: results });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/posts" && req.method === "POST") return await createPost(req, env);
        if (url.pathname === "/api/posts" && req.method === "GET") return await listPosts(url, env);
        if (url.pathname === "/api/requests" && req.method === "POST") return await createRequest(req, env);
        if (url.pathname === "/api/requests" && req.method === "GET") return await listRequests(req, env);
        const m = url.pathname.match(/^\/api\/posts\/(\d+)$/);
        if (m && req.method === "DELETE") return await hidePost(m[1], req, env);
        return json({ error: "見つかりません。" }, 404);
      } catch (e) {
        console.error(e);
        return json({ error: "サーバーで問題が起きました。時間をおいてお試しください。" }, 500);
      }
    }
    return env.ASSETS.fetch(req);
  },
};
