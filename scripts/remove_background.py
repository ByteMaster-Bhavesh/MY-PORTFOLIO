#!/usr/bin/env python3
"""Remove black background from assets/images/myimg.jpeg with anti-aliasing."""
from PIL import Image, ImageFilter
from collections import deque
import math

def remove_background(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()

    # Step 1: Find pure/near background via BFS flood-fill from outside borders
    # Only enqueue borders above the suit:
    # y=0: all x
    # x=0: y from 0 to 800
    # x=w-1: y from 0 to 800
    bg_visited = set()
    q = deque()

    for x in range(w):
        if max(pixels[x, 0][:3]) <= 12:
            bg_visited.add((x, 0))
            q.append((x, 0))

    for y in range(800):
        if (0, y) not in bg_visited and max(pixels[0, y][:3]) <= 12:
            bg_visited.add((0, y))
            q.append((0, y))
        if (w - 1, y) not in bg_visited and max(pixels[w - 1, y][:3]) <= 12:
            bg_visited.add((w - 1, y))
            q.append((w - 1, y))

    # Flood fill
    # A pixel is considered background if it is connected and max(R,G,B) <= 14
    while q:
        x, y = q.popleft()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in bg_visited:
                r, g, b, _ = pixels[nx, ny]
                if max(r, g, b) <= 14:
                    bg_visited.add((nx, ny))
                    q.append((nx, ny))

    print(f"Background pixels found: {len(bg_visited)} ({len(bg_visited) / (w * h):.2%})")

    # Step 2: Build raw binary mask (0 for bg, 255 for fg)
    mask = Image.new("L", (w, h), 255)
    mask_pixels = mask.load()
    for (x, y) in bg_visited:
        mask_pixels[x, y] = 0

    # Step 3: Anti-aliasing / Defringing
    # Find boundary pixels in the foreground adjacent to background
    # Smooth the mask slightly at edges with GaussianBlur
    # Blur only the boundary to prevent softening internal details
    blurred_mask = mask.filter(ImageFilter.GaussianBlur(radius=1.2))
    blurred_pixels = blurred_mask.load()

    # Step 4: Create final cutout
    result = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    res_pixels = result.load()

    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            a = blurred_pixels[x, y]

            if (x, y) in bg_visited:
                # If definitely in the background component
                if a < 15:
                    a = 0
            
            if a == 0:
                res_pixels[x, y] = (0, 0, 0, 0)
            elif a == 255:
                res_pixels[x, y] = (r, g, b, 255)
            else:
                # Edge pixel: defringe by un-premultiplying dark spill
                alpha_norm = a / 255.0
                # Compensate for dark edge to avoid black fringe on white/light backgrounds
                rf = min(255, int(r / max(0.2, alpha_norm)))
                gf = min(255, int(g / max(0.2, alpha_norm)))
                bf = min(255, int(b / max(0.2, alpha_norm)))
                res_pixels[x, y] = (rf, gf, bf, a)

    result.save(output_path, "PNG")
    print(f"Saved transparent cutout to: {output_path}")

if __name__ == "__main__":
    remove_background("assets/images/myimg.jpeg", "assets/images/myimg.png")
