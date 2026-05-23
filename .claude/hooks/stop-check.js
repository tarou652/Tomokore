#!/usr/bin/env node
// Stop hook: 未コミット変更を確認し、メモリ更新リマインダーを表示する
const { execSync } = require("child_process");

try {
  const status = execSync("git status --short", {
    cwd: "c:/code/tomokore",
    encoding: "utf8",
  });

  // ノイズファイルを除外（mediapipe, 旧ファイル, 未追跡ファイル）
  const IGNORE = /(mediapipe-wasm|useFaceDetection|useHairTraceCanvas)/;
  const changes = status
    .split("\n")
    .filter((l) => l && !IGNORE.test(l) && !l.startsWith("??"));

  let msg =
    changes.length > 0
      ? "📝 未コミットの変更があります:\n" +
        changes.slice(0, 8).join("\n") +
        "\n\n  /commit でコミットしてください"
      : "✅ コミット済み";

  msg += "\n\n💾 重要な作業をしたら「MEMORYを更新して」と伝えてください";

  process.stdout.write(JSON.stringify({ systemMessage: msg }));
} catch (_e) {
  process.stdout.write("{}");
}
