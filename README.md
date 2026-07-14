# Chronova

AIエージェントと人間が混在するチームのためのタスク管理ツール。
Linear風の軽快なUI/UXと、Wrike的な仕組み(プロジェクト ⊃ タスク、複数担当者、ステータス/優先度/期限)を持ちます。

メンバーは**人間**と**AIエージェント**を区別して管理でき、エージェントもタスクの担当者として割り当てられます。将来的にAIエージェントが同じREST APIを直接叩いてタスクを操作できる、API-firstな構成です(現バージョンではエージェント連携の実行機能は含みません)。

## 主な機能

- **リストビュー** — ステータス別グループ表示、折りたたみ、行内でのステータス/優先度インライン変更
- **カンバンボード** — ドラッグ&ドロップ(マウス/キーボード両対応)でステータス変更・並べ替え。順序はサーバーに永続化
- **ピークパネル** — `?task=` で開くタスク詳細。タイトル/説明のインライン編集、プロパティ変更
- **コマンドパレット** — `Cmd/Ctrl+K`。ナビゲーション、タスク作成、選択中タスクのステータス/優先度/担当者変更
- **キーボードショートカット** — `C` 新規タスク、`J/K/↑↓` 選択移動、`Enter/O` 開く、`S/P/A` プロパティ変更、`Esc` 閉じる
- **楽観的更新** — すべての操作が即時反映。失敗時は自動ロールバック+トースト通知
- **メンバー管理** — 人間/AIエージェントの区別(エージェントは角丸スクエア+Botアイコンで表示)
- **操作メンバー切替** — サイドバー下部で「誰として操作するか」を選択(認証の代替)。マイタスクに反映

## 技術スタック

| レイヤー | 技術 |
|---|---|
| バックエンド | Go 1.24 / [chi](https://github.com/go-chi/chi) / SQLite ([modernc.org/sqlite](https://gitlab.com/cznic/sqlite), CGO不要) |
| フロントエンド | React 19 / TypeScript / Vite / Tailwind CSS v4 |
| データ取得 | TanStack Query(楽観的更新) |
| UI | Radix UI primitives / dnd-kit / cmdk / lucide-react |
| テスト | Go httptest / Playwright |

## セットアップ

```sh
make setup   # go mod download + npm install
make dev     # API (:8080) と Vite (:5173) を同時起動
```

ブラウザで http://localhost:5173 を開きます。初回起動時にデモデータ(人間3名 + AIエージェント3体、プロジェクト3件、タスク16件)が自動投入されます。

```sh
make test      # backend(go vet + go test) + frontend単体(vitest) + 本番ビルド
make e2e       # Playwright e2e(サーバーは自動起動)
make build     # 本番ビルド(backend/bin/server + frontend/dist)
make db-reset  # DBを削除(次回起動時に再シード)
```

## テスト

テストピラミッドを3層で構成し、GitHub Actions(`.github/workflows/ci.yml`)で自動実行します。

| 層 | 対象 | 実行 |
|---|---|---|
| backend 単体 / API | store層(rank算法・カスケード・採番)、seed冪等性、REST API(CRUD・バリデーション・CORS・フィルタ) | `cd backend && go test ./...` |
| frontend 単体 / コンポーネント / フック | 純粋ロジック(rank・楽観適用・日付)、zustandストア、Radix UI操作、TanStack Query楽観的更新 | `cd frontend && npm run test`(Vitest + RTL) |
| e2e | 起動・タスク作成・インライン編集・カンバンD&D・パレット・ショートカット・プロジェクト/メンバーCRUD・マイタスク絞り込み | `make e2e`(Playwright) |

- e2eはローカルではプリインストールのChromium(`PLAYWRIGHT_CHROMIUM_PATH`)を使い、`e2e/global-setup.ts` が使い捨てDBを削除して毎回決定的にシードします。CIでは `npx playwright install` で導入します。
- `cd frontend && npm run typecheck` でテストコードを含む型検査ができます。

## REST API

ベースURL: `/api/v1`(JSON)。エラーは `{"error":{"code","message"}}` 形式。

| メソッド & パス | 説明 |
|---|---|
| `GET /health` | ヘルスチェック |
| `GET /workspace` | ワークスペース情報(タスクIDプレフィックス等) |
| `GET \| POST /members` | メンバー一覧 / 作成(`type: "human" \| "agent"`) |
| `PATCH \| DELETE /members/{id}` | メンバー更新 / 削除 |
| `GET \| POST /projects` | プロジェクト一覧(未完了タスク数付き)/ 作成 |
| `GET \| PATCH \| DELETE /projects/{id}` | プロジェクト取得 / 更新 / 削除(タスクは孤児化) |
| `GET /tasks` | タスク一覧。`?project_id=` `?assignee_id=` `?status=`(複数可)`?q=` |
| `POST /tasks` | タスク作成(`assignee_ids: number[]` 対応、`CHR-n` を自動採番) |
| `GET \| PATCH \| DELETE /tasks/{id}` | タスク取得 / 部分更新(`assignee_ids` は全置換)/ 削除 |
| `POST /tasks/{id}/move` | `{"status", "after_id"}` — 並べ替え兼カラム移動(`after_id: null` = 先頭) |

タスクの並び順は疎な整数rank(step 1024)で管理し、中点挿入・隙間枯渇時の自動リナンバーをサーバー側で行います。

## ディレクトリ構成

```
backend/   Go API サーバー(cmd/server, internal/{api,model,store,seed})
frontend/  React SPA(src/{api,components,hooks,lib,routes,stores}, e2e/)
```

## 今後の予定

- 認証・権限管理
- AIエージェント連携の実行機能(エージェントによるタスクの自動遷移・レポート)
- コメント / アクティビティフィード
- サブタスク
- カスタムステータス・ワークフロー
- フォルダ階層(スペース > フォルダ > プロジェクト)
- 通知
- リアルタイム同期
