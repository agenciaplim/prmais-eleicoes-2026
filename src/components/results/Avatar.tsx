"use client";

import { useEffect, useRef, useState } from "react";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
}

// Official TSE photo served from our cache; falls back to initials when it is not available yet.
export function Avatar({ id, name }: { id: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);

  // The server-rendered <img> may fail before hydration attaches onError.
  useEffect(() => {
    const element = image.current;
    if (element?.complete && element.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <span className="avatar" aria-hidden="true">
      {failed ? (
        initials(name)
      ) : (
        <img ref={image} src={`/api/photos/${id}`} alt="" loading="lazy" width={36} height={36} onError={() => setFailed(true)} />
      )}
    </span>
  );
}
