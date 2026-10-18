export const taskImageCdnHost =
  process.env.NEXT_PUBLIC_CDN_HOSTNAME ?? "d3bjd59ge2rr0k.cloudfront.net";
const bucketHost = "decentralized-fiverr-jp.s3.ap-south-1.amazonaws.com";

// Shared with next.config.ts so the UI accepts only configured remote hosts.
export const taskImagePatterns = [
  {
    protocol: "https" as const,
    hostname: taskImageCdnHost,
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: bucketHost,
    port: "",
    pathname: "/**",
  },
];

export function taskImageSource(source: string): string | null {
  if (!source) return null;
  if (
    source.startsWith("/") &&
    !source.startsWith("//") &&
    !source.includes("\\")
  )
    return source;
  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.port || url.username || url.password)
      return null;
    if (url.hostname === bucketHost)
      return `https://${taskImageCdnHost}${url.pathname}`;
    return url.hostname === taskImageCdnHost ? url.href : null;
  } catch {
    return null;
  }
}
