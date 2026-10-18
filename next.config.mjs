/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages に静的ファイルとして配置する（出力先: out/）
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
