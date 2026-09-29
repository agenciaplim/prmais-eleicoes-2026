import { getCache } from "@/lib/cache";
import { cacheUnavailable } from "@/lib/cache/unavailable";
import { isCandidateId, readPhoto } from "@/lib/tse/photos";

// Serves candidate photos collected server-side; the browser never requests the TSE.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCandidateId(id)) return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });

  let photo: Awaited<ReturnType<typeof readPhoto>>;
  try {
    photo = await readPhoto(await getCache(), id);
  } catch (error) {
    return cacheUnavailable("photos", error);
  }
  if (!photo) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  return new Response(photo, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
