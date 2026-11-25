#!/usr/bin/env python3
"""Cut the person out of a video, frame by frame, on this Mac (free, nothing is uploaded).

usage: ~/.local/share/studio/venv/bin/python person_cutout.py <video> <out.mov> [--start S] [--dur S] [--still T out.png]

Writes a ProRes 4444 .mov with transparency (same size and frame rate as the source) that sits on a track
above the original: put text between the two and it appears behind the person.
--still T out.png saves the cutout of one frame (at T seconds) first, to check the edge before a long run.
Model: birefnet-portrait through rembg, stored in ~/.local/share/studio/models. A few seconds a frame on CPU:
the script prints an estimate after the first frames.
"""
import argparse, json, os, subprocess, sys, time

os.environ.setdefault("U2NET_HOME", os.path.expanduser("~/.local/share/studio/models"))
import numpy as np
from PIL import Image
from rembg import new_session, remove

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("out")
ap.add_argument("--start", type=float, default=0.0); ap.add_argument("--dur", type=float, default=None)
ap.add_argument("--still", nargs=2, metavar=("T", "PNG"))
a = ap.parse_args()

info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=width,height,r_frame_rate,duration:stream_side_data=rotation", "-of", "json", a.video],
    capture_output=True, text=True, check=True).stdout)["streams"][0]
W, H = int(info["width"]), int(info["height"])
rot = next((abs(int(float(d["rotation"]))) for d in info.get("side_data_list", []) if "rotation" in d), 0)
if rot in (90, 270): W, H = H, W          # ffmpeg applies phone rotation when decoding
fps = info["r_frame_rate"]
session = new_session("birefnet-portrait")

def matte(rgb: np.ndarray) -> np.ndarray:
    mask = remove(Image.fromarray(rgb), session=session, only_mask=True)
    return np.dstack([rgb, np.asarray(mask.resize((W, H)))])

def reader(start, dur=None, frames=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start)] + (["-t", str(dur)] if dur else []) + ["-i", a.video]
    cmd += (["-frames:v", str(frames)] if frames else []) + ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    return subprocess.Popen(cmd, stdout=subprocess.PIPE)

if a.still:
    p = reader(float(a.still[0]), frames=1); buf = p.stdout.read(W * H * 3); p.wait()
    if len(buf) < W * H * 3: sys.exit("no frame at that time")
    Image.fromarray(matte(np.frombuffer(buf, np.uint8).reshape(H, W, 3)), "RGBA").save(a.still[1])
    print("still ->", a.still[1])

src = reader(a.start, a.dur)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", fps,
    "-i", "-", "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-vendor", "apl0", a.out], stdin=subprocess.PIPE)
n, t0 = 0, time.time()
num, den = (fps.split("/") + ["1"])[:2]
total = int((a.dur or float(info.get("duration", 0)) - a.start) * float(num) / float(den)) or None
while True:
    buf = src.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    enc.stdin.write(matte(np.frombuffer(buf, np.uint8).reshape(H, W, 3)).tobytes()); n += 1
    if n == 3 and total:
        per = (time.time() - t0) / 3; print(f"{per:.1f} s a frame, about {per * total / 60:.1f} min for {total} frames", flush=True)
enc.stdin.close(); enc.wait(); src.wait()
print(f"cutout -> {a.out}  ({n} frames, {(time.time() - t0) / 60:.1f} min)")
