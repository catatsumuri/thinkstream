# ThinkStream 評価メモ（2026-04-28 更新）

この文書は以下を突き合わせて更新した。

- `http://localhost:8000/meta/analysis` の実表示
- `http://localhost:8000/meta/analysis.md` の配布 Markdown
- 現在の実装（Laravel / Inertia / React / Markdown / admin / sync / search / backup 周辺）

---

## 先に結論

ThinkStream は **「Markdown を公開するアプリ」** というより、**「階層 URL と公開制御を中核にした、DB ドリブンなドキュメント / ナレッジ出版基盤」** として評価するのが正しい。

特に強いのは次の 4 点。

1. **`full_path` を中心にした情報設計**
2. **namespace 単位のバックアップ / リストアとローカル同期**
3. **公開・非公開・予約公開を含む出版モデル**
4. **Zenn / Mintlify 系を吸収する Markdown パイプライン**

一方で、競争上の弱点も明確。

1. **Obsidian 的な知識ネットワーク体験が弱い**
2. **チームコラボ / 権限 / レビューの層がまだ薄い**
3. **検索は動くが、発見体験の厚みはまだ不足**
4. **AI は入り始めたが、まだ補助機能に留まる**

---

## `meta/analysis` からの重要な更新点

現在の `meta/analysis(.md)` は全体として良いが、**現行コードとのズレ** がある。

### 1. AI は「未活用」ではない

`meta/analysis.md` では AI が未活用寄りに書かれているが、現行実装ではすでに以下が入っている。

- namespace cover image 用の **AI プロンプト生成 + 画像生成**
- post 編集画面での **選択範囲の Markdown structure**
- post 編集画面での **選択範囲の翻訳**
- Thinkstream の thought 群を **1 本の Scrap 向け Markdown に再構成**
- Thinkstream canvas の内容から **タイトルを磨く**

つまり現状は **AI 未導入** ではなく、**編集補助と下書き整理に導入済み・ただし戦略の中心にはまだなっていない** が正確。

### 2. 編集体験は「単純な textarea だけ」ではない

今のエディタはプレーンではあるが、少なくとも以下は備える。

- Markdown / Preview の切り替え
- 画像の paste / drag&drop upload
- unsaved changes 警告
- sync mode 中の編集禁止
- AI structure / translate の選択範囲操作

ただし、それでも **Obsidian / Notion / Outline 的な編集体験** と比べるとまだ弱い。

### 3. プロダクトの中心は「静的サイト代替」ではなく「運用可能な出版系 CMS」

Docusaurus / VitePress のような静的ビルド前提よりも、ThinkStream は

- DB 更新即反映
- 管理 UI での操作
- preview / draft / scheduled の扱い
- backup / restore / import

を持っており、**ドキュメント CMS / knowledge publishing system** と捉えるほうが適切。

### 4. Thinkstream により「公開前の思考整理」レイヤが入った

今回の実装で、ThinkStream は公開済みコンテンツの管理だけでなく、**公開前の思考を溜めて整える私的ワークスペース** を持った。

- Thinkstream canvas に短い thought を時系列で蓄積
- 複数 thought を AI で Scrap 向け Markdown に構造化
- 構造化結果を **system namespace の Scrap** に draft として保存
- Scrap 側から通常 namespace へ移して公開フローに乗せられる

これは単なる「メモ欄追加」ではなく、**発想 -> 整理 -> 下書き化 -> 公開系 namespace へ移送** という前段導線が製品内に入ったことを意味する。

---

## 現在のプロダクト評価

## 1. 情報設計

### 強み

- `PostNamespace` と `Post` の両方に `full_path` があり、URL 解決が明快
- root segment の予約制御がある
- namespace 非公開時に子孫全体を止める出版モデルがある
- admin 側でも namespace を軸に構造を保っている

### 評価

これは ThinkStream の最重要資産。
単なるカテゴリ機能ではなく、**URL・公開制御・ナビゲーション・バックアップ単位が同じ構造に揃っている** のが強い。

### 弱み

- Obsidian 的な **ノート間の横断リンク網** は主役ではない
- 構造は強いが、**構造を超えた発見** はまだ弱い

---

## 2. 出版 / 公開モデル

### 強み

- public / preview の切り替えが実装に一貫している
- draft / scheduled / unpublished namespace を扱える
- system namespace として **Scrap を常時 private** に保てる
- `.md` エンドポイントで raw markdown 配布ができる
- private mode でクローズド運用に切り替えられる
- SSR を前提に OGP / Twitter Card まで見ている

### 評価

ThinkStream は **「個人メモアプリ」ではなく「公開可能な知識ベース」** として設計されている。
Obsidian が強いのはローカル知識整理だが、ThinkStream は **公開責務を持った知識運用** に向く。

### 弱み

- 公開サイトのテーマ / ブランディング自由度はまだ限定的
- コメント、フィードバック、レビュー、公開ワークフローは未整備

---

## 3. 編集 / 運用体験

### 強み

- リビジョン復元がある
- sync mode によるローカル `.md` 編集フローがある
- Zenn import がある
- backup / restore が UI と CLI の両方にある
- Thinkstream により **短文 thought の収集 -> AI 整理 -> Scrap 保存** が UI で完結する

### 評価

運用体験はかなり実務寄り。
特に **sync mode + backup/restore + import** のセットは、一般的なノートアプリより **移行性・保全性・再構築性** が高い。

### 弱み

- 複数人編集時の権限・承認・レビューがない
- コンテンツ比較 / 差分 / 変更理由の運用はまだ薄い
- UI は実用的だが、長文編集の快適さはまだ改善余地が大きい

---

## 4. Markdown プラットフォーム

### 強み

- Zenn / Mintlify 系の記法を curated に吸収している
- syntax manifest でサーフェスを固定している
- Mermaid、cards、tabs、steps、API fields など docs 向け部品が揃っている
- raw markdown export と public rendering が接続している

### 評価

ここは **単なる Markdown renderer ではなく、軽量な docs authoring platform** と見てよい。

### 弱み

- 双方向リンク・埋め込み・ノート参照など、Obsidian の knowledge graph 的表現は弱い
- plugin ecosystem で拡張する世界ではなく、**製品側が curated に増やす方式**

---

## 5. 検索 / 発見

### 強み

- Scout database engine で最小構成の検索を持つ
- namespace 絞り込みと tag 絞り込みがある
- 公開済みコンテンツだけを対象にしている

### 評価

「使える検索」はある。
ただし今は **検索 UX の最低限** であり、プロダクト差別化の主戦場ではない。

### 弱み

- typo tolerance や relevance tuning が弱い
- backlinks / related notes / graph suggestions のような発見導線がない
- Obsidian の Dataview 的な「動的な見つけ方」はない

---

## Obsidian との比較を含む競争評価

## 1. ThinkStream が Obsidian より強い点

### 公開と運用

- 公開 URL モデルが最初からある
- 非公開 / 予約公開 / namespace 公開制御がある
- OGP / SSR / public rendering まで一気通貫
- backup / restore / import が「運用機能」として存在する

Obsidian は publish できるが、**publish はノートの延長**。
ThinkStream は **出版システムとしての整合性** が強い。

### 情報設計の統制

- `full_path` を軸に URL / 構造 / バックアップ単位が揃う
- 管理 UI から構造を維持できる

Obsidian は柔軟だが、構造の統制はユーザー規律や plugin 依存になりやすい。
ThinkStream は **構造化された docs / KB を壊れにくく運用する** 方向で優位。

### チームへの移譲しやすさ

- DB と admin を前提にしている
- private mode、auth、2FA、restore、revision がある

Obsidian は個人最適が強く、チーム共有は工夫が必要。
ThinkStream は現状でも **「個人の第二脳」より「運用される知識ベース」** に近い。

## 2. Obsidian が ThinkStream より強い点

### 知識ネットワーク体験

- 双方向リンク
- graph view
- note-first な探索
- YAML / Dataview / plugin による柔軟な二次ビュー

ThinkStream は tree と path が強いが、**graph と emergent discovery** が弱い。

### ローカルファースト体験

- vault がファイルそのもの
- オフライン編集が自然
- Git / Sync / plugin による個人運用が成熟

ThinkStream にも sync mode はあるが、既存 post に対する同期であり、Obsidian ほど「すべてがローカル資産」ではない。

### エディタ拡張の厚み

- plugin ecosystem が巨大
- ノート作成支援、テンプレート、タスク、クエリ、図表、埋め込みが豊富

ThinkStream は製品内で保証された機能は強いが、拡張の厚みでは Obsidian に劣る。

## 3. どう住み分けるべきか

### Obsidian の主戦場

- 個人の第二脳
- リサーチノート
- 草稿の蓄積
- 非線形な知識探索

### ThinkStream の主戦場

- 公開前提の docs / knowledge base
- 構造を保って運用するコンテンツ
- チームやサービスの公式ナレッジ
- バックアップ / restore / import を含めた運用

### つまり

ThinkStream が Obsidian と真っ向から戦うべきなのは **「ノートアプリとして」** ではない。
戦うべきなのは **「公開・運用・構造統制を持つ knowledge publishing system として」**。

---

## 現在のポジショニング案

ThinkStream の説明は、今後は次のように寄せたほうが良い。

> ThinkStream is a structured knowledge publishing system for teams and individuals who want Markdown-native authoring, stable URLs, branch-level publishing control, and operational safety such as sync, backup, and restore.

日本語なら:

> ThinkStream は、Markdown ネイティブな執筆体験を保ちながら、安定 URL、階層構造、公開制御、同期、バックアップ/復元を一体で扱える構造化ナレッジ出版基盤。

---

## 優先 TODO（更新版）

## P0: 方向性を明確にする TODO

### 1. README / meta/analysis / FEATURES の語り口を揃える

- 「Markdown アプリ」ではなく「knowledge publishing system」に寄せる
- AI 未使用など、現況とズレた記述を更新する
- Obsidian と真っ向勝負するのではなく、住み分けを明記する

### 2. 「構造」と「運用」がコアであることを前面に出す

- full_path
- branch publish control
- sync
- backup / restore
- import

この 5 点を製品コアとして再定義したい。

## P1: 競争力を増す TODO

### 3. 検索を「発見体験」まで伸ばす

- related posts
- 同 namespace / 同 tag / 同リンク元による推薦
- Meilisearch 検討
- 検索結果の relevance 改善

### 4. Obsidian に対抗できる「知識接続」層を作る

- 双方向リンク or note references
- backlinks 表示
- ページ間の関連グラフ
- 引用 / embeds の一貫した扱い

tree だけでなく graph 側の導線が必要。

### 5. AI を編集補助から知識運用補助へ拡張する

- namespace / post の要約
- related content suggestion
- title / taxonomy / tags 提案
- import 後の structure repair
- 公開前チェック

今の AI は、編集補助だけでなく **思考整理と下書き化** にも入ってきた。
それでもまだ **検索 / 発見 / 公開品質管理まで横断する中核価値** には達していない。

## P2: 運用プロダクトとして強化する TODO

### 6. レビュー / 承認 / 権限

- role / permission
- namespace ごとの編集権限
- reviewer / approver フロー
- publish approval

チーム向けに伸ばすなら最重要候補。

### 7. 変更履歴の実務性を上げる

- revision diff をもっと見やすく
- change summary / reason
- restore 前後の比較
- activity log

### 8. backup / restore を製品価値として強化する

- 定期バックアップ
- 外部ストレージ出力
- Git export / import
- namespace 単位の移管フロー

これは ThinkStream 独自性をさらに伸ばせる。

## P3: UX 改善 TODO

### 9. 長文編集 UX の改善

- 見出しアウトライン
- slash command / quick insert
- keyboard shortcuts
- block-level 補助
- richer split view / focus mode

### 10. 公開サイトの presentation を強くする

- theme / branding
- landing / doc homepage variations
- richer namespace covers
- better mobile reading polish

---

## 最終評価

ThinkStream は、現時点で **Obsidian の代替** というより、

- Obsidian より **公開と運用に強く**
- Docusaurus / VitePress より **動的運用に強く**
- Wiki 系より **Markdown と構造 URL の統制に強い**

という中間地帯にいる。

最も良い勝ち筋は、

**「個人のノートアプリを目指さず、構造化された知識を安全に公開・運用できる Markdown-native publishing system を磨くこと」**

である。

その上で、Obsidian 的な強みである

- knowledge graph
- backlinks
- discovery
- local-first 的安心感

を必要な範囲だけ吸収すると、かなり独自のポジションが作れる。
