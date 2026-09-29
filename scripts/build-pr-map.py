#!/usr/bin/env python3
"""Builds public/maps/pr-municipios.json (SVG paths for the 399 municipalities of Paraná).

Source: tbrugz/geodata-br, geojson/geojs-41-mun.json (IBGE perimeters, CC0 1.0).
Usage:  python3 scripts/build-pr-map.py geojs-41-mun.json public/maps/pr-municipios.json
Standard library only. Equirectangular projection scaled by cos(latitude), Douglas-Peucker simplification.
"""
import json
import math
import sys

WIDTH = 1000
TOLERANCE = 0.6  # in output units


def simplify(points, tolerance):
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        start, end = stack.pop()
        (x1, y1), (x2, y2) = points[start], points[end]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy) or 1e-9
        best, index = 0.0, None
        for i in range(start + 1, end):
            x, y = points[i]
            distance = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
            if distance > best:
                best, index = distance, i
        if index is not None and best > tolerance:
            keep[index] = True
            stack += [(start, index), (index, end)]
    return [p for p, k in zip(points, keep) if k]


def simplify_ring(ring, tolerance):
    # Closed rings degenerate in Douglas-Peucker (first == last); split at the farthest point.
    points = ring[:-1] if ring[0] == ring[-1] else ring
    if len(points) < 4:
        return points
    x0, y0 = points[0]
    far = max(range(len(points)), key=lambda i: (points[i][0] - x0) ** 2 + (points[i][1] - y0) ** 2)
    first = simplify(points[: far + 1], tolerance)
    second = simplify(points[far:] + [points[0]], tolerance)
    return first[:-1] + second[:-1]


def rings(geometry):
    if geometry["type"] == "Polygon":
        return geometry["coordinates"]
    if geometry["type"] == "MultiPolygon":
        return [ring for polygon in geometry["coordinates"] for ring in polygon]
    raise ValueError(geometry["type"])


def main(source, target):
    features = json.load(open(source, encoding="utf-8"))["features"]
    all_points = [pt for f in features for ring in rings(f["geometry"]) for pt in ring]
    min_lon = min(p[0] for p in all_points); max_lon = max(p[0] for p in all_points)
    min_lat = min(p[1] for p in all_points); max_lat = max(p[1] for p in all_points)
    kx = math.cos(math.radians((min_lat + max_lat) / 2))
    scale = WIDTH / ((max_lon - min_lon) * kx)
    height = round((max_lat - min_lat) * scale, 1)

    def project(lon, lat):
        return ((lon - min_lon) * kx * scale, (max_lat - lat) * scale)

    out = []
    for feature in features:
        parts = []
        for ring in rings(feature["geometry"]):
            points = simplify_ring([project(*pt[:2]) for pt in ring], TOLERANCE)
            if len(points) < 3:
                continue
            parts.append("M" + "L".join(f"{x:.0f} {y:.0f}" for x, y in points) + "Z")
        out.append({"ibge": feature["properties"]["id"], "name": feature["properties"]["name"], "d": "".join(parts)})

    out.sort(key=lambda item: item["ibge"])
    assert len(out) == 399, len(out)
    json.dump({"source": "IBGE via tbrugz/geodata-br (CC0 1.0)", "viewBox": f"0 0 {WIDTH} {height}", "features": out},
              open(target, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
