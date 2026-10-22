import { SITE } from "@/lib/site";

// AdSense の ads.txt（サイト運営者ID を設定すると中身が入る）
export const dynamic = "force-static";

export function GET() {
  const pub = SITE.adsenseClient.replace(/^ca-/, "");
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : "# AdSense 未設定\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
