// Metro returns a numeric asset ID on native, but a URL/URI object on web.
// Keep metadata without wrapping a web URL inside a numeric-only assetId.
export function educationMusicSource(
  asset: unknown,
  title: string,
  artist: string,
) {
  const metadata = { title, artist };
  if (typeof asset === "number" && Number.isFinite(asset))
    return { assetId: asset, metadata };
  if (typeof asset === "string" && asset) return { uri: asset, metadata };
  if (
    asset &&
    typeof asset === "object" &&
    "uri" in asset &&
    typeof asset.uri === "string" &&
    asset.uri
  )
    return { uri: asset.uri, metadata };
  throw new Error("Missing bundled music asset");
}
