---
name: reference-harness-engineering
description: Claude Code ハーネスエンジニアリングの全体像。3層構造・フックイベント一覧・実装パターン集
metadata: 
  node_type: memory
  type: reference
  originSessionId: 03d1dea0-525f-41b6-8d53-9e60d7317bdb
---

## ハーネスとは

Claude Code において「ハーネス」= Claude（モデル）をエージェントに変える実行環境全体。
ファイルアクセス・シェル実行・パーミッション制御・メモリ・ライフサイクルフックを含む。

> 「Claude Code がハーネス、Claude がその中のモデル」

---

## 3層構造

| 層 | ファイル | 仕組み | 強度 | 用途 |
|---|---|---|---|---|
| **Settings** | `.claude/settings.json` | JSON設定・クライアント強制 | 強（必ず適用） | ツール制限・サンドボックス・環境変数 |
| **CLAUDE.md** | `./CLAUDE.md` / `.claude/rules/` | コンテキストとして注入 | 中（Claudeが判断） | 規約・アーキテクチャ方針 |
| **Hooks** | settings.json の hooks キー | ライフサイクルで確実実行 | 強（固定タイミング） | 自動フォーマット・ブロック・通知 |

**CLAUDE.md vs Hooks の使い分け**:
- CLAUDE.md → 「こうしてほしい」ガイダンス（Claudeが状況判断）
- Hooks → 「必ずこれを実行」強制（ライフサイクルで確実に動く）

---

## Settings 優先順位（高→低）

1. Managed（IT管理・組織全体）
2. コマンドライン引数
3. Local (`.claude/settings.local.json`、非共有)
4. Project (`.claude/settings.json`、チーム共有)
5. User (`~/.claude/settings.json`、全プロジェクト共通)

---

## CLAUDE.md スコープ

| スコープ | 場所 | 用途 |
|---|---|---|
| Managed | システムパス | 組織全体ルール |
| User | `~/.claude/CLAUDE.md` | 全プロジェクト共通の個人設定 |
| Project | `./CLAUDE.md` | チーム共有の規約 |
| Local | `./CLAUDE.local.md` | 個人のプロジェクトメモ（gitignore） |
| Subdirectory | `subdirectory/CLAUDE.md` | ディレクトリ遷移時に遅延ロード |

**パススコープルール** (`.claude/rules/` 以下):
```markdown
---
paths:
  - "src/api/**/*.ts"
---
# このルールはsrc/api/配下のファイルを読む時だけロードされる
```
→ コンテキスト節約に有効。

---

## 主要 Hook イベント（29+種類）

### セッション系
| イベント | タイミング | 主な用途 |
|---|---|---|
| `SessionStart` | セッション開始時 | 環境変数ロード・初期化 |
| `SessionEnd` | セッション終了時 | ログ・クリーンアップ |

### ツール実行系（コア）
| イベント | タイミング | ブロック可 | 主な用途 |
|---|---|---|---|
| `PreToolUse` | ツール実行前 | ✅ | 危険コマンドブロック |
| `PostToolUse` | ツール実行後 | ✅ | 自動フォーマット・lint |
| `PostToolUseFailure` | ツール失敗後 | ✅ | エラーログ・修正提案 |
| `PermissionRequest` | 許可ダイアログ表示時 | ✅ | 安全な操作の自動承認 |

### コンパクション・メモリ系
| イベント | タイミング | 主な用途 |
|---|---|---|
| `PreCompact` | コンテキスト圧縮前 | 重要コンテキスト保護 |
| `PostCompact` | 圧縮後 | 指示の再注入 |

### ファイル・設定変更系
| イベント | タイミング | 主な用途 |
|---|---|---|
| `FileChanged` | ファイル変更時 | `.env`の自動リロード |
| `CwdChanged` | カレントディレクトリ変更時 | ディレクトリ固有コンテキスト |

### その他
| イベント | タイミング | 主な用途 |
|---|---|---|
| `Stop` | Claude応答終了時 | Slack通知・後処理 |
| `Notification` | 通知送信時 | 外部サービス連携 |
| `UserPromptSubmit` | ユーザー入力後（Claude処理前） | コンテキスト追加・入力検証 |

---

## 実装パターン集

### パターン1: 自動フォーマット（PostToolUse）
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit",
      "hooks": [{
        "type": "command",
        "command": "prettier --write ${tool_input.file_path}"
      }]
    }]
  }
}
```

### パターン2: 危険コマンドブロック（PreToolUse）
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "if": "Bash(rm -rf *)",
      "hooks": [{
        "type": "command",
        "command": "block-rm.sh"
      }]
    }]
  }
}
```

### パターン3: 安全操作の自動承認（PermissionRequest）
```json
{
  "permissions": {
    "allow": ["Bash(npm run *)", "Bash(git log)", "Bash(git status)"],
    "deny": ["Bash(rm -rf *)", "Write(.env*)"]
  }
}
```

### パターン4: コンパクション後の再注入（PostCompact）
```json
{
  "hooks": {
    "PostCompact": [{
      "type": "command",
      "command": "inject-context.sh"
    }]
  }
}
```

---

## Hook の出力形式

フックスクリプトはJSON出力でハーネスに指示を返せる:
```bash
# ブロックする場合
jq -n '{hookSpecificOutput: {permissionDecision: "deny", permissionDecisionReason: "理由"}}'

# コンテキスト注入
jq -n '{systemMessage: "追加コンテキスト"}'
```

---

## 学習リソース

- Claude Code 公式ドキュメント（Anthropic）
- `update-config` スキル: settings.json のフック設定に使用
- [[project-tomokore]] — 実践プロジェクト
