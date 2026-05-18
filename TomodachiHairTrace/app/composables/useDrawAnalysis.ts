import type { Contour } from "./useOpenCV";
import type { BangRegion } from "./useHairSegment";

export type DifficultyGrade = "S" | "A" | "B" | "C" | "D";

export interface DrawAnalysis {
  grade: DifficultyGrade;
  score: number;
  tips: string[];
  drawingOrder: string[];
}

export function analyzeDrawDifficulty(
  simplifiedContours: Contour[],
  bangRegion: BangRegion | null,
): DrawAnalysis {
  const totalPoints = simplifiedContours.reduce((s, c) => s + c.length, 0);
  const allPoints = simplifiedContours.flat();

  let score = 100;
  const tips: string[] = [];

  if (totalPoints > 180) {
    score -= 25;
    tips.push(
      "線数が多く複雑です。スライダーで単純化を強めると描きやすくなります",
    );
  } else if (totalPoints > 90) {
    score -= 10;
    tips.push("やや複雑な形状です");
  } else if (totalPoints < 20) {
    tips.push("シンプルな形状で描きやすいです");
  }

  // Left-right asymmetry check
  if (allPoints.length >= 6) {
    const xs = allPoints.map((p) => p.x);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const left = allPoints.filter((p) => p.x < cx).length;
    const right = allPoints.filter((p) => p.x >= cx).length;
    const ratio = Math.min(left, right) / (Math.max(left, right) || 1);
    if (ratio < 0.55) {
      score -= 15;
      tips.push("左右非対称な形状です。非対称部分に注意して描いてください");
    }
  }

  if (bangRegion?.bangPixelCount && bangRegion.bangPixelCount > 8000) {
    score -= 5;
    tips.push("前髪の面積が広めです");
  }

  score = Math.max(0, Math.min(100, score));

  const grade: DifficultyGrade =
    score >= 88
      ? "S"
      : score >= 70
        ? "A"
        : score >= 50
          ? "B"
          : score >= 30
            ? "C"
            : "D";

  if (tips.length === 0) tips.push("バランスの良い髪型です");

  const drawingOrder: string[] = ["1. シルエット塗り"];
  if (bangRegion?.bangPixelCount) {
    drawingOrder.push("2. 前髪ライン");
    drawingOrder.push("3. 横髪追加");
  } else {
    drawingOrder.push("2. 全体輪郭ライン");
    drawingOrder.push("3. 細部追加");
  }
  drawingOrder.push(`${drawingOrder.length + 1}. ハイライト`);
  drawingOrder.push(`${drawingOrder.length + 1}. 微調整`);

  return { grade, score, tips, drawingOrder };
}
