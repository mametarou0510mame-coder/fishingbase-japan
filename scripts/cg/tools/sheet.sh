#!/bin/sh
# 静止画を 2x2 に並べた確認用の1枚を作る： sh scripts/cg/tools/sheet.sh out.jpg a.jpg b.jpg c.jpg d.jpg
# 1枚の大きさは W×H（ふだんは 640×360。2026-11-22 効率化：確認で見る画像を小さくする。細部を見るときは W=960 H=540）
out=$1; shift
W=${W:-640}; H=${H:-360}
ffmpeg -y -loglevel error -i "$1" -i "$2" -i "$3" -i "$4" -filter_complex "[0]scale=$W:$H:force_original_aspect_ratio=decrease,pad=$W:$H:(ow-iw)/2:0[a];[1]scale=$W:$H:force_original_aspect_ratio=decrease,pad=$W:$H:(ow-iw)/2:0[b];[2]scale=$W:$H:force_original_aspect_ratio=decrease,pad=$W:$H:(ow-iw)/2:0[c];[3]scale=$W:$H:force_original_aspect_ratio=decrease,pad=$W:$H:(ow-iw)/2:0[d];[a][b]hstack[t];[c][d]hstack[u];[t][u]vstack" "$out"
