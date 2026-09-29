import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLiveEmbed } from "../src/lib/live";

const embed = (id: string) => ({
  provider: "youtube",
  src: `https://www.youtube-nocookie.com/embed/${id}`,
  watchUrl: `https://www.youtube.com/watch?v=${id}`
});

test("accepts the common YouTube URL formats", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/embed/dQw4w9WgXcQ"
  ]) {
    assert.deepEqual(parseLiveEmbed("youtube", url), embed("dQw4w9WgXcQ"), url);
  }
});

test("accepts a channel live stream", () => {
  const result = parseLiveEmbed("youtube", "https://www.youtube.com/embed/live_stream?channel=UC1234567890abcdefghijKL");
  assert.equal(result?.src, "https://www.youtube-nocookie.com/embed/live_stream?channel=UC1234567890abcdefghijKL");
});

test("rejects other providers, hosts, protocols and malformed ids", () => {
  assert.equal(parseLiveEmbed("instagram", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseLiveEmbed("youtube", undefined), null);
  assert.equal(parseLiveEmbed("youtube", "https://evil.example/embed/dQw4w9WgXcQ"), null);
  assert.equal(parseLiveEmbed("youtube", "http://www.youtube.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseLiveEmbed("youtube", "https://www.youtube.com/watch?v=abc\"><script>"), null);
  assert.equal(parseLiveEmbed("youtube", "javascript:alert(1)"), null);
});
