// Live stream configuration. Only YouTube is supported; any other value disables the embed.
export type LiveEmbed = { provider: "youtube"; src: string; watchUrl: string } | null;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"]);

// Accepts watch, youtu.be, /live/, /embed/ and channel live_stream URLs and rebuilds a
// youtube-nocookie embed URL from the extracted id, so no user-provided URL is used as-is.
export function parseLiveEmbed(provider: string | undefined, url: string | undefined): LiveEmbed {
  if (provider !== "youtube" || !url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !YOUTUBE_HOSTS.has(parsed.hostname)) return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  const channel = parsed.searchParams.get("channel");
  if (segments[0] === "embed" && segments[1] === "live_stream" && channel && CHANNEL_ID.test(channel)) {
    return {
      provider: "youtube",
      src: `https://www.youtube-nocookie.com/embed/live_stream?channel=${channel}`,
      watchUrl: `https://www.youtube.com/channel/${channel}/live`
    };
  }

  const id =
    parsed.hostname === "youtu.be"
      ? segments[0]
      : segments[0] === "watch"
        ? parsed.searchParams.get("v")
        : segments[0] === "embed" || segments[0] === "live"
          ? segments[1]
          : null;

  if (!id || !VIDEO_ID.test(id)) return null;
  return {
    provider: "youtube",
    src: `https://www.youtube-nocookie.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`
  };
}

export const liveEmbed = () => parseLiveEmbed(process.env.LIVE_PROVIDER, process.env.LIVE_EMBED_URL);
