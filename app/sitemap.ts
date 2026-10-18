import type { MetadataRoute } from "next";
import { AREAS } from "@/lib/areas";
import { SITE } from "@/lib/site";
import { SPECIES } from "@/lib/species";
import { publishedSpots } from "@/lib/spots";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string) => `${SITE.url}${p}`;
  const now = new Date();
  return [
    { url: u("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: u("/kansai/"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: u("/kansai/area/"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...AREAS.map((a) => ({ url: u(`/kansai/area/${a.slug}/`), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...publishedSpots().map((s) => ({
      url: u(`/kansai/${s.pref}/${s.slug}/`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: u("/species/"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...SPECIES.map((s) => ({ url: u(`/species/${s.slug}/`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: u("/kansai/month/"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...Array.from({ length: 12 }, (_, i) => ({
      url: u(`/kansai/month/${i + 1}/`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...["/gear/", "/gear/sale/", "/about/", "/pr-policy/", "/privacy/", "/terms/", "/disclaimer/", "/contact/"].map((p) => ({
      url: u(p),
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
