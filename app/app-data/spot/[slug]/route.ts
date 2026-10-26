import { amazonSearchUrl, rakutenSearchUrl } from "@/lib/affiliate";
import { allowed } from "@/lib/gear";
import { summarize } from "@/lib/catches";
import { findGuide, guideYoutubeId, guidesForSpot, type Guide } from "@/lib/guides";
import { nearestWindStation } from "@/lib/liveWind";
import { methodsBySpecies } from "@/lib/patterns";
import { buildBoard, spotLatLon } from "@/lib/shioData";
import { speciesFromCatchName } from "@/lib/species";
import { publishedSpots, type Spot } from "@/lib/spots";

// アプリで釣り場を選んだときに読むデータ（潮・天気・風・波の7日分、おすすめの釣り方と道具）
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  // 静的に書き出すとき「<slug>.json」というファイルにする
  return publishedSpots().map((s) => ({ slug: `${s.slug}.json` }));
}

// その釣り場の「まずはこれ」：家族向けの施設・公園はサビキ、それ以外はショアジギング（禁止事項に合わないものは外す）
function primaryGuides(spot: Spot): Guide[] {
  const ok = (slug: string) => {
    const g = findGuide(slug);
    return g && allowed(g.gearTags, spot.restrictions) ? g : null;
  };
  if (spot.type === "海上釣り堀") return [];
  const family = spot.type === "海釣り施設" || spot.type === "公園の釣り場";
  const order = family ? ["sabiki", "choinage", "ukizuri", "shore-jigging"] : ["shore-jigging", "sabiki", "choinage", "ukizuri"];
  for (const s of order) {
    const g = ok(s);
    if (g) return [g];
  }
  return [];
}

function methodView(g: Guide, why: string) {
  const tier = g.tackle[0];
  return {
    slug: g.slug,
    title: g.title,
    summary: g.summary,
    why,
    youtube: guideYoutubeId(g.slug),
    budget: tier?.budget ?? "",
    gear: (tier?.items ?? []).map((it) => ({ name: it.name, spec: it.spec, rakuten: rakutenSearchUrl(it.keyword), amazon: amazonSearchUrl(it.keyword) })),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug.replace(/\.json$/, "");
  const spot = publishedSpots().find((s) => s.slug === slug)!;
  const board = buildBoard(spot);
  const summary = summarize([spot.slug]);
  const methods = methodsBySpecies(spot.slug).list;
  const tips: Record<string, unknown> = {};
  for (const name of new Set(board.days.flatMap((d) => d.species ?? []).map((s) => s.species))) {
    const parts = name.replace(/（.*?）/g, "").split("・");
    const merged = new Map<string, number>();
    for (const m of methods) {
      if (!parts.some((p) => m.species === p || m.species.includes(p))) continue;
      for (const x of m.methods) merged.set(x.name, (merged.get(x.name) ?? 0) + x.count);
    }
    const sp = speciesFromCatchName(name)[0];
    tips[name] = {
      species: name,
      methods: [...merged.entries()].map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count),
      guide: sp ? { slug: sp.slug, name: sp.name, method: sp.methods[0]?.name ?? "" } : null,
    };
  }
  const recentSpecies = summary.list.map((s) => s.species);
  const prim = primaryGuides(spot);
  const family = spot.type === "海釣り施設" || spot.type === "公園の釣り場";
  const more = guidesForSpot(spot, recentSpecies, 4).filter((g) => !prim.some((p) => p.slug === g.slug)).slice(0, 2);
  const c = spotLatLon(spot);
  return Response.json({
    slug: spot.slug,
    name: spot.name,
    type: spot.type,
    area: spot.area,
    pref: spot.pref,
    hours: spot.hours,
    fee: spot.fees[0] ? `${spot.fees[0].label}：${spot.fees[0].value}` : "",
    restrictions: spot.restrictions ?? [],
    rules: spot.rules.slice(0, 4),
    station: nearestWindStation(c.lat, c.lon, spot.slug),
    board: { days: board.days, stationName: board.station.name, weatherLabel: board.weatherLabel },
    tips,
    recent: summary.list.map((s) => ({ species: s.species, days: s.days, maxSizeCm: s.maxSizeCm })),
    recentFrom: summary.from,
    recentTo: summary.to,
    methods: [
      ...prim.map((g) => methodView(g, family ? "家族・初めての人向けの定番" : "この釣り場の基本の釣り方")),
      ...more.map((g) => methodView(g, recentSpecies.length ? "最近の釣果に合う釣り方" : "この釣り場でできる釣り方")),
    ],
  });
}
