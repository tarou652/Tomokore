/** BFS キューの要素の型 */
type Point = [number, number];

/** pixels の指定インデックスの RGBA が (r,g,b,a) と完全一致するか返す */
function matchColor(
  pixels: Uint8ClampedArray,
  idx: number,
  r: number,
  g: number,
  b: number,
  a: number,
): boolean {
  return (
    pixels[idx] === r &&
    pixels[idx + 1] === g &&
    pixels[idx + 2] === b &&
    pixels[idx + 3] === a
  );
}

/**
 * BFS で (startX, startY) からターゲット色と同じ色の連続領域を
 * 新しい色 (newR, newG, newB, newA) に塗り替える
 */
export function floodFill(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  newR: number,
  newG: number,
  newB: number,
  newA = 255,
): void {
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const startIdx = (startY * width + startX) * 4;
  const targetR = pixels[startIdx] ?? 0;
  const targetG = pixels[startIdx + 1] ?? 0;
  const targetB = pixels[startIdx + 2] ?? 0;
  const targetA = pixels[startIdx + 3] ?? 255;

  // ターゲット色と新色が同じなら何もしない
  if (
    targetR === newR &&
    targetG === newG &&
    targetB === newB &&
    targetA === newA
  )
    return;

  const visited = new Uint8Array(width * height);
  const queue: Point[] = [[startX, startY]];
  visited[startY * width + startX] = 1;

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const idx = (y * width + x) * 4;
    pixels[idx] = newR;
    pixels[idx + 1] = newG;
    pixels[idx + 2] = newB;
    pixels[idx + 3] = newA;

    // 4近傍を探索する
    const neighbors: Point[] = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const ni = ny * width + nx;
      if (visited[ni]) continue;
      if (!matchColor(pixels, ni * 4, targetR, targetG, targetB, targetA))
        continue;
      visited[ni] = 1;
      queue.push([nx, ny]);
    }
  }
}
