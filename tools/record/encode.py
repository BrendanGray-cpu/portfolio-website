import json, sys, subprocess, os
name, width, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0   # >1 plays faster
fr = json.load(open(f'out-{name}/frames.json'))
hold_end = 1.4
lines = []
for i, f in enumerate(fr):
    d = ((fr[i+1]['t'] - f['t']) / speed) if i + 1 < len(fr) else hold_end
    lines.append(f"file '{os.path.abspath(f['file'])}'\nduration {max(d, 0.001):.4f}")
lines.append(f"file '{os.path.abspath(fr[-1]['file'])}'")
open(f'{name}.txt', 'w').write('\n'.join(lines))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', f'{name}.txt',
  '-vf', f'fps=30,scale={width}:-2:flags=lanczos,setsar=1,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
  '-tune', 'animation', '-movflags', '+faststart', '-an', out], check=True)
print(out, os.path.getsize(out) // 1024, 'KB')
