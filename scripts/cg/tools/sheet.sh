#!/bin/sh
# 静止画を 2x2 に並べた確認用の1枚を作る： sh scripts/cg/tools/sheet.sh out.jpg a.jpg b.jpg c.jpg d.jpg
out=$1; shift
ffmpeg -y -loglevel error -i "$1" -i "$2" -i "$3" -i "$4" -filter_complex "[0]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:0[a];[1]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:0[b];[2]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:0[c];[3]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:0[d];[a][b]hstack[t];[c][d]hstack[u];[t][u]vstack" "$out"
