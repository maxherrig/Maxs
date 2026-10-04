#!/bin/bash
set -e
O=/home/user/Maxs/out
for f in "1080 1920 9x16" "1080 1080 1x1" "1920 1080 16x9"; do
  set -- $f
  node render.mjs $1 $2 $O/_v_$3.mp4 30 10 3
  ffmpeg -y -loglevel error -i $O/_v_$3.mp4 -i $O/oace_score_120bpm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart $O/oace_reel_$3.mp4
  rm $O/_v_$3.mp4
  echo "FINISHED $3"
done
