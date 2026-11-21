#!/bin/sh
# Actions の実行を、終わるまで黙って待ち、結果だけ短く出す（2026-11-22 制作の効率化：長いログを読まない）
#   sh scripts/cg/tools/run_brief.sh <実行ID>            … 終わるまで待って要約
#   sh scripts/cg/tools/run_brief.sh <ワークフロー.yml>   … そのワークフローの最新の実行
# 出すもの：ジョブごとの結果と所要時間、::notice:: と ##[error] の行、失敗したジョブのログの最後の15行だけ
R=${REPO:-mametarou0510mame-coder/fishingbase-japan}
ID=$1
case "$ID" in *.yml) ID=$(gh api "repos/$R/actions/workflows/$ID/runs?per_page=1" -q '.workflow_runs[0].id');; esac
while [ "$(gh api repos/$R/actions/runs/$ID -q .status)" != completed ]; do sleep 30; done
gh api repos/$R/actions/runs/$ID -q '"run \(.id) \(.name): \(.conclusion)  \(.created_at[11:16])→\(.updated_at[11:16]) UTC"'
gh api "repos/$R/actions/runs/$ID/jobs?per_page=100" -q '.jobs[] | "  \(.conclusion // .status)\t\(((((.completed_at // .started_at) | fromdate) - (.started_at | fromdate)) / 60 | floor))分\t\(.name)"'
LOG=$(mktemp)
gh run view "$ID" -R "$R" --log > "$LOG" 2>/dev/null
grep -E "##\[(notice|error)\]" "$LOG" | sed -E 's/^[^\t]*\t[^\t]*\t[0-9TZ:.-]+ //' | grep -v "^##\[error\]Process completed" | sort -u | head -30
for J in $(gh api "repos/$R/actions/runs/$ID/jobs?per_page=100" -q '.jobs[] | select(.conclusion=="failure") | .name' | tr ' ' '~'); do
  N=$(echo "$J" | tr '~' ' ')
  echo "--- 失敗: $N（最後の15行）"
  grep -F "$N" "$LOG" | sed -E 's/^[^\t]*\t[^\t]*\t[0-9TZ:.-]+ //' | tail -15
done
rm -f "$LOG"
