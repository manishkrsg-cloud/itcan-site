#!/usr/bin/env bash
# ITCAN story film: download inputs, draw graphics, cut, mix, encode, upload.
# Runs in the Higgsfield sandbox (ffmpeg, sox, node + Playwright). Needs urls.env with
# UP_1080, UP_720, UP_POSTER, UP_SHEET (presigned PUT URLs) next to it.
set -euo pipefail
cd "$(dirname "$0")"
source ./urls.env
B=https://d8j0ntlcm91z4.cloudfront.net/user_2zirxwP6e4obj22XOM5lG6LDlk1
S=https://relay-site-production.up.railway.app
mkdir -p a seg
echo "== inputs"
curl -sf -o vo.wav  $B/hf_20261001_031113_368dec61-f412-4160-9ea8-1906a07b75ed.wav
curl -sf -o c1.mp4  $B/hf_20261001_031134_aa8513a4-3f4d-4c55-9bcc-f7cc254c7962.mp4
curl -sf -o c2.mp4  $B/hf_20261001_031134_62765b93-9bbf-46d1-8e57-c2b5082e567e.mp4
curl -sf -o c3.mp4  $B/hf_20261001_031134_fa74e71a-18e3-4287-8110-61e454fd69d7.mp4
curl -sf -o a/consult.png $B/hf_20260930_115616_a13c4e26-dd7a-438d-bad5-7e3aa80e138c.png
curl -sf -o a/build.png   $B/hf_20260930_115615_bdfe54f5-90b2-4b86-b691-a7282a245737.png
curl -sf -o a/staff.webp  $S/assets/services/staff-880.webp
curl -sf -o a/logo.png    $S/assets/brand/itcan-logo-dark.png
curl -sf -o a/geist.woff2 $S/assets/fonts/geist-latin-wght-normal.woff2
ffmpeg -loglevel error -y -i a/staff.webp a/staff.png
i=1; for s in $(curl -sf $S/data/awards.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(' '.join([a['slug'] for a in sorted(d, key=lambda a: -a['year']) if a['cat']=='e50'][:4]))"); do
  curl -sf -o a/aw$i.jpg $S/awards/$s.jpg; i=$((i+1)); done
ls -la a | head -20

echo "== graphics"
PW=$(npm root -g)/playwright node render.mjs

echo "== segments"
V="-c:v libx264 -preset veryfast -crf 16 -pix_fmt yuv420p -r 30"
clip() { # clip.mp4 overlay-scene seconds out
  ffmpeg -loglevel error -y -i "$1" -framerate 30 -i "frames/$2/%05d.png" -filter_complex \
    "[0:v]setpts=1.45*PTS,scale=1920:1080:flags=lanczos,framerate=fps=30,eq=contrast=1.06:saturation=1.08:brightness=-0.02,trim=duration=$3,setpts=PTS-STARTPTS[v];[v][1:v]overlay=0:0:shortest=1,fade=t=in:st=0:d=0.45,fade=t=out:st=$(awk "BEGIN{print $3-0.45}"):d=0.45[o]" \
    -map "[o]" $V -t "$3" "$4"
}
still() { ffmpeg -loglevel error -y -framerate 30 -i "frames/$1/%05d.jpg" $V "$2"; }
clip c1.mp4 s1 7.3 seg/01.mp4
clip c2.mp4 s2 7.3 seg/02.mp4
still s3 seg/03.mp4
still s4 seg/04.mp4
still s5 seg/05.mp4
clip c3.mp4 s6 7.3 seg/06.mp4
still s7a seg/07.mp4
still s7b seg/08.mp4
still s8 seg/09.mp4
printf "file 'seg/%s'\n" 01.mp4 02.mp4 03.mp4 04.mp4 05.mp4 06.mp4 07.mp4 08.mp4 09.mp4 > list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i list.txt -c copy picture.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 picture.mp4

echo "== voice"
# [start end] in vo.wav  ->  placed at seconds in the film
PIECES="0.40 2.90 1.0|3.45 5.55 7.8|6.38 9.20 10.6|9.93 14.30 14.9|15.05 17.90 21.3|18.66 24.60 27.3|25.28 28.73 34.5|29.45 32.22 41.6|32.69 34.12 46.0|34.72 35.71 48.4|36.31 41.90 51.3"
n=0; IN=""; FC=""; MIX=""
IFS='|'; for p in $PIECES; do IFS=' ' read -r a b at <<< "$p"; ms=$(awk "BEGIN{printf \"%d\", $at*1000}")
  FC="$FC[0:a]atrim=$a:$b,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=$(awk "BEGIN{print $b-$a-0.06}"):d=0.06,adelay=${ms}|${ms}[v$n];"; MIX="$MIX[v$n]"; n=$((n+1)); done; IFS=' '
ffmpeg -loglevel error -y -i vo.wav -filter_complex "${FC}${MIX}amix=inputs=$n:normalize=0,apad,atrim=0:60,pan=stereo|c0=c0|c1=c0[o]" -map "[o]" -ar 48000 voice.wav

echo "== music"
mk() { sox -n -r 48000 -c 5 "$1" synth 17 sine $2 sine $3 sine $4 sine $5 sine $6 remix - gain -n -10 tremolo 0.12 18 lowpass 1600 chorus 0.6 0.9 55 0.4 0.25 2 -t fade q 5 17 6; }
mk m1.wav 110 164.81 220 261.63 329.63
mk m2.wav 87.31 130.81 174.61 220 261.63
mk m3.wav 130.81 196 261.63 329.63 392
mk m4.wav 98 146.83 196 246.94 293.66
mk m5.wav 110 164.81 220 261.63 329.63
ffmpeg -loglevel error -y -i m1.wav -i m2.wav -i m3.wav -i m4.wav -i m5.wav -filter_complex \
  "[1]adelay=13000|13000[b];[2]adelay=26000|26000[c];[3]adelay=39000|39000[d];[4]adelay=50000|50000[e];[0][b][c][d][e]amix=inputs=5:normalize=0,aecho=0.8:0.85:120|240:0.25|0.15,highpass=60,atrim=0:60,afade=t=in:d=2,afade=t=out:st=57:d=3,pan=stereo|c0=c0|c1=c0[o]" \
  -map "[o]" -ar 48000 music.wav
ffmpeg -loglevel error -y -i voice.wav -i music.wav -filter_complex \
  "[1:a]volume=0.22[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];[0:a][md]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9[o]" \
  -map "[o]" -ar 48000 mix.wav

echo "== encode"
ffmpeg -loglevel error -y -i picture.mp4 -i mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 23 -profile:v high -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k -shortest itcan-story-1080.mp4
ffmpeg -loglevel error -y -i itcan-story-1080.mp4 -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 25 -profile:v high -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k itcan-story-720.mp4
ffmpeg -loglevel error -y -ss 16.2 -i itcan-story-1080.mp4 -frames:v 1 -vf scale=1280:-2 -q:v 3 itcan-story-poster.jpg
ffmpeg -loglevel error -y -i itcan-story-1080.mp4 -vf "fps=1/3,scale=480:-2,tile=5x4:padding=6:color=0x111111" -frames:v 1 -q:v 4 itcan-story-sheet.jpg
ls -la itcan-story-*

echo "== upload"
put() { curl -sf -o /dev/null -w "$1 %{http_code}\n" -X PUT -H "Content-Type: $2" --upload-file "$1" "$3"; }
put itcan-story-1080.mp4 video/mp4 "$UP_1080"
put itcan-story-720.mp4 video/mp4 "$UP_720"
put itcan-story-poster.jpg image/jpeg "$UP_POSTER"
put itcan-story-sheet.jpg image/jpeg "$UP_SHEET"
echo "== all done"
