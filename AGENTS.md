# Things 開発ガイド

## 基本方針

- 応答は日本語で行います。
- 作業前に `package.json` を確認し、既存ライブラリを優先して利用します。
- このアプリケーションは個人用の GTD・クリップ管理アプリケーションです。
- 修正・機能追加では、画面遷移や入力を妨げない軽快な操作感を重視します。
- JSX では `react-bootstrap` に定義されているコンポーネントを優先します。
- PocketBase のデータ型は自動生成された `src/lib/pb_types.ts` を正とします。スキーマ変更後は `npm run typegen` で再生成します。
- `src/routeTree.gen.ts` と `pocketbase/pb_public` は生成物です。前者を直接編集せず、後者は本番ビルド時に更新します。

## 技術構成

- React 19 / TypeScript / Vite
- TanStack Router（ファイルベースルーティング）
- TanStack Query（取得データと更新後キャッシュの管理）
- PocketBase（認証、データベース、ファイル保存、静的ファイル配信）
- PocketBase JS hooks（認証付きのローカルWindowsランチャーAPI）
- React Bootstrap / Bootstrap / Lucide React
- dnd-kit（タスクのドラッグ並べ替え）
- react-markdown / remark-gfm（クリップ本文の Markdown 表示）
- PDF.js legacy build（旧ブラウザ互換を含むPDFクリップの1ページ目プレビュー）

## 現在の機能

### 認証・共通UI

- `/login` で PocketBase のユーザー認証を行います。
- HOME、GTD、Clips は認証必須で、セッションを更新できない場合はログイン画面へ戻します。
- ヘッダーから HOME、GTD、Clips を移動でき、現在日時とログアウト操作を表示します。
- 横断検索ではクリップ名・本文、タスク名、プロジェクト名を検索できます。クリップとタスクは編集モーダル、プロジェクトは詳細画面を開きます。

### HOME

- プロジェクト未設定の Inbox、全プロジェクトの Next・Waiting、未完了の期限付きタスクを一覧表示します。
- タスクを素早く Inbox に追加できます。
- 行操作で Inbox、Next、Waiting、Someday、Completed の間を移動できます。
- タスクのタイトル、メモ、優先度、期限、所属プロジェクト、関連クリップを編集できます。
- 完了タスクは完了日を表示し、日付変更と Inbox への復元ができます。

### GTD

- プロジェクトを作成・編集し、Active / Archived を切り替えられます。
- Active / Archived の表示状態はURLに保持し、プロジェクト詳細から戻っても維持します。
- プロジェクト一覧にはメモ、期間、関連クリップ数、完了タスク数と進捗率を表示します。
- プロジェクト詳細ではタスク追加、編集、状態変更、ドラッグによる並べ替えを行えます。
- プロジェクト名、メモ、開始日、終了日、関連クリップを編集できます。
- プロジェクトとタスク一式を複製できます。複製タスクの状態は Inbox に戻し、並び順・メモ・優先度・関連クリップを引き継ぎます。
- 最終更新からの経過日数をレビュー目安として表示し、レビュー済み操作で更新日時を更新します。5日を超えるとレビューを促します。
- 週次レビューでは、期限超過、未整理Inbox、7日以上停滞したWaiting、Someday、Nextがない／更新から5日を超えたActiveプロジェクトを一覧で確認できます。

### Clips

- 入力欄以外での paste イベントを監視し、テキスト・画像・ファイルをプレビューして保存します。
- テキストClipはPlateベースのビジュアル編集とMarkdownソース編集を切り替えられます。保存形式はMarkdown文字列のままです。HTMLを含む場合は内容保護のためソース編集を使います。
- 画像注釈はV2 JSON（`{ version: 2, items: [...] }`）で保存し、四角・矢印・手描き・文字、色と線幅、移動、削除、Undo/Redo、ズームを扱います。旧形式の四角配列は読込時に移行します。
- Plateエディタは必要時に遅延読込し、通常画面の初期ロードを重くしないようにします。
- クリップ一覧は新しい順に9件ずつ読み込み、スクロールに応じて続きを取得します。
- PDFは表示領域に近づいた時だけPDF.jsを読み込み、OSに依存せず1ページ目を表紙として描画します。
- クリップの名前・テキスト・画像注釈を編集でき、削除、元ファイル表示、ダウンロードができます。
- プロジェクトとタスクの編集画面から既存クリップを選択し、関連付けられます。

### Launcher / Clock

- `/launcher` でURL、アプリ、ファイル、フォルダの起動項目を登録・編集・並べ替えできます。横断検索からも起動できます。
- 実行要求は登録済みIDだけを認証付きAPIへ送り、PocketBaseと同じWindows端末のループバック接続だけを許可します。
- ヘッダー時計からタイマー1件と一回限りのアラーム1件を設定できます。設定は `things.clock.v1` としてlocalStorageへ保存し、音を使わず色と動きで通知します。
- `OooPEN.ps1` と `_menu.txt` はThingsのランチャーとは同期しません。

## PocketBase コレクション

- `users`: ログインユーザー。現在のデータ用コレクションは、認証済みユーザーだけが操作できます。
- `projects`: `name`、`memo`、`startDate`、`endDate`、`isActive`、`reviewToggle`、複数の `clips` を保持します。
- `tasks`: `title`、`memo`、`status`、`priority`、`duedate`、`completed`、`sort`、単一の `project`、複数の `clips` を保持します。
- `clips`: `name`、`text`、`file`、元ファイル名、画像注釈を保持します。
- `launchers`: `name`、`kind`、`target`、`arguments`、`sort` を保持します。
- `projects` と `tasks` は、タスク側の単一 `project` フィールドによる 1:N です。
- プロジェクトとタスクの `clips` は複数IDを保持する関連フィールドです。同じクリップを複数箇所から参照できます。
- `contexts` コレクションとタスクの contexts フィールドは削除済みです。

## 主なコマンド

- `npm run dev`: Vite 開発サーバーを起動します。別途 PocketBase を起動する必要があります。
- `npm run lint`: ESLint を実行します。
- `npm test`: Vitest の単体テストを実行します。
- `npm run build`: TypeScript を検査し、配布物を `pocketbase/pb_public` に生成します。
- `npm run preview`: Vite のプレビューサーバーを起動します。
- `npm run typegen`: PocketBase のローカルDBから `src/lib/pb_types.ts` を再生成します。

## 実装時の注意

- PocketBase 更新後は、影響する TanStack Query の全キャッシュを無効化します。タスクの件数・状態・所属が変わる場合はプロジェクト進捗も更新します。
- 通信中も既存入力を保持し、二重送信を防止し、失敗時は画面内に再試行可能なエラーを表示します。
- 検索など並行する非同期処理では、古い応答で最新の画面状態を上書きしないようにします。
- 既存データとの互換性を優先し、スキーマ変更時はマイグレーションと生成型を同時に更新します。
