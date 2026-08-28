# Things

個人用タスク管理 & クリップボードインベントリ

- **gtd**: Getting Things Done の手法を支援するタスク管理
- **clips**: ペーストイベントを監視し、テキスト・画像・ファイルを保存
  - エクセル貼りつけデータ、CSVデータなどからデータクリップ作成可能

## TODO

- プロジェクトコピー機能
  - 既存プロジェクト（タスク内包）を新しい Activeプロジェクトとしてコピーする
  - 過去プロジェクトのテンプレート利用による利便性向上
  - 検討:
    - memo, clips, duedate までコピーに含むか？

## セットアップ

### 1. リポジトリのクローン & 依存関係のインストール

```bash
git clone <リポジトリURL> things
cd things
npm install
```

### 2. PocketBase の準備

#### 2-1. PocketBase 実行ファイルのダウンロード

[PocketBase のリリースページ](https://github.com/pocketbase/pocketbase/releases) からお使いのOSに合ったバイナリをダウンロードします。

#### 2-2. 実行ファイルを配置

ダウンロードした `pocketbase` 実行ファイルを `things/pocketbase/` ディレクトリに配置します。

```bash
# 例: macOS / Linux
mv ~/Downloads/pocketbase_0.xx.x_darwin_arm64/pocketbase things/pocketbase/
chmod +x things/pocketbase/pocketbase
```

> **注意**: PocketBaseの実行ファイルは利用者が用意してください。

### 3. PocketBase の起動と初期設定

#### 3-1. PocketBase を起動

```bash
cd things/pocketbase
./pocketbase serve
```

- `http://localhost:8090/_/` で管理画面にアクセスできるようになります。
- Windowsの場合、pocketbase.exe を実行してください。

#### 3-2. スーパーユーザー（管理者）の作成

PocketBase を起動した状態で、別のターミナルから以下のコマンドを実行します。

```bash
cd things/pocketbase
./pocketbase superuser create <メールアドレス> <パスワード>
```

または、ただ単に初回起動時に `http://localhost:8090/_/` にアクセスしスーパーユーザーを作成することもできます。

#### 3-3. 管理画面にログイン

`http://localhost:8090/_/` にアクセスし、作成したスーパーユーザーでログインします。

#### 3-4. 一般ユーザーを作成

管理画面の **Users** コレクションから、アプリで使用する一般ユーザーを作成します。

- **Email**: ログインに使用するメールアドレス
- **Password**: ログインに使用するパスワード
- **Name**: 表示名（利用しません）

> このユーザーでアプリにログインします。

### 4. 開発者向け

#### 開発サーバー

```bash
cd things
npm run dev
```

`http://localhost:5173` で開発サーバーが起動します。

PocketBase も起動しておく必要があります（手順3-1参照）。

#### 本番ビルド

```bash
cd things
npm run build
```

ビルド成果物は `pocketbase/pb_public/` に出力されます。PocketBase が自動的に静的ファイルとして配信するため、`http://localhost:8090` にアクセスすればアプリが表示されます。

## スクリプト

| コマンド | 説明 |
|---|---|
| `npm run dev` | Vite 開発サーバーを起動 |
| `npm run build` | TypeScript のチェック & 本番ビルド |
| `npm run preview` | ビルド成果物をプレビュー |
| `npm run lint` | ESLint でコードチェック |
| `npm run typegen` | PocketBase のスキーマから型定義を生成 |

## ディレクトリ構成

```
things/
├── pocketbase/          # PocketBase (サーバー + DB + 公開ファイル)
│   ├── pocketbase       # 実行ファイル (git管理外)
│   ├── pb_data/         # データベースファイル (git管理外)
│   ├── pb_migrations/   # マイグレーション定義
│   └── pb_public/       # ビルド成果物の出力先
├── src/                 # アプリケーションのソースコード
│   ├── components/      # 共通コンポーネント
│   ├── features/        # 機能モジュール (clips, gtd など)
│   ├── lib/             # ユーティリティ・設定
│   ├── routes/          # TanStack Router のルート定義
│   ├── main.tsx         # エントリーポイント
│   └── styles.css       # グローバルスタイル
├── index.html
├── vite.config.ts
└── package.json
```
