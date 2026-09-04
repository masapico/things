export type MermaidTemplate = {
  id: "flow-vertical" | "flow-horizontal" | "flow-branch" | "gantt" | "sequence" | "mindmap";
  name: string;
  description: string;
  source: string;
};

export const MERMAID_TEMPLATES: MermaidTemplate[] = [
  {
    id: "flow-vertical",
    name: "縦フローチャート",
    description: "上から下へ進む基本的な手順",
    source: `flowchart TD
  start([開始]) --> task[作業]
  task --> finish([完了])`,
  },
  {
    id: "flow-horizontal",
    name: "横フローチャート",
    description: "左から右へ進む基本的な手順",
    source: `flowchart LR
  start([開始]) --> task[作業]
  task --> finish([完了])`,
  },
  {
    id: "flow-branch",
    name: "条件分岐",
    description: "Yes／Noで処理を分けるフロー",
    source: `flowchart TD
  start([開始]) --> decision{条件を満たす?}
  decision -- Yes --> success[処理A]
  decision -- No --> retry[処理B]
  success --> finish([完了])
  retry --> finish`,
  },
  {
    id: "gantt",
    name: "ガントチャート",
    description: "日付と依存関係を持つ作業計画",
    source: `gantt
  title プロジェクト計画
  dateFormat YYYY-MM-DD
  section 準備
  要件整理 :done, requirements, 2026-01-01, 3d
  section 実装
  開発 :active, development, after requirements, 5d
  確認 :review, after development, 2d`,
  },
  {
    id: "sequence",
    name: "シーケンス図",
    description: "参加者間の要求と応答",
    source: `sequenceDiagram
  participant User as ユーザー
  participant App as アプリ
  User->>App: リクエスト
  App-->>User: レスポンス`,
  },
  {
    id: "mindmap",
    name: "マインドマップ",
    description: "中心テーマから考えを展開",
    source: `mindmap
  root((中心テーマ))
    アイデアA
      詳細A-1
      詳細A-2
    アイデアB
      詳細B-1`,
  },
];

export function isMermaidLanguage(value?: string) {
  return value?.toLowerCase() === "mermaid";
}
