import { areaOfSpot } from "@/lib/areas";
import { spotLatLon } from "@/lib/shioData";
import { publishedSpots } from "@/lib/spots";

// アプリの地図に出す釣り場の一覧
export const dynamic = "force-static";

export function GET() {
  const list = publishedSpots().map((s) => {
    const c = spotLatLon(s);
    return { slug: s.slug, name: s.name, type: s.type, area: areaOfSpot(s.slug)?.name ?? s.area, lat: c.lat, lon: c.lon };
  });
  return Response.json({ spots: list });
}
