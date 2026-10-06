"""
Análise de áudio para gerar beatmaps (requer ffmpeg e numpy).

  python3 scripts/analyze-audio.py <mp3> structure
      BPM global, mapa de energia e fronteiras de seção (para escolher a
      janela da partida, ex.: o início do refrão).

  python3 scripts/analyze-audio.py <mp3> beatmap <id> <título> <início_aprox> [duração=50]
      Rastreia as batidas reais (andamento local, bom para bateria ao vivo)
      a partir da batida mais próxima de <início_aprox> e grava
      src/beatmaps/<id>.json. Rode "structure" antes.
"""
import json, os, subprocess, sys, tempfile
import numpy as np

SR, HOP, FPS = 11025, 110, 100
PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def cache(path, suffix):
    """Arquivos intermediários ficam no diretório temporário, fora do projeto."""
    name = os.path.basename(path) + suffix
    return os.path.join(tempfile.gettempdir(), 'ragatanga-analysis-' + name)


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def onset_flux(x):
    win = np.hanning(512)
    frames = np.lib.stride_tricks.sliding_window_view(x, 512)[::HOP]
    spec = np.abs(np.fft.rfft(frames * win, axis=1))[:, :60]
    flux = np.maximum(0, np.diff(spec, axis=0)).sum(axis=1)
    return np.maximum(flux - np.convolve(flux, np.ones(50) / 50, mode='same'), 0)


def grid_score(flux, bpm, t0, a, b):
    ts = np.arange(t0, b, 60 / bpm)
    ts = ts[ts >= a]
    idx = (ts * FPS).astype(int)
    idx = idx[idx < len(flux)]
    return flux[idx].mean() if len(idx) else 0


def global_tempo(flux, a, b, lo=80, hi=150):
    coarse = []
    for bpm in np.arange(lo, hi, 0.1):
        p = 60 / bpm
        coarse.append((max(grid_score(flux, bpm, t0, a, b) for t0 in np.arange(0, p, 0.02)), bpm))
    coarse.sort(reverse=True)
    top = coarse[0][1]
    best = max((grid_score(flux, bpm, t0, a, b), bpm, t0)
               for bpm in np.arange(top - 0.15, top + 0.15, 0.01)
               for t0 in np.arange(0, 60 / bpm, 0.005))
    return best[1], best[2], [(round(b, 1), round(s, 1)) for s, b in coarse[:5]]


def fmt(t):
    return f'{int(t // 60)}:{t % 60:05.2f}'


def sections(x, bpm, t0, dur):
    p = 60 / bpm
    beats = np.arange(t0, dur - p, p)
    n = 1024
    freqs = np.fft.rfftfreq(n, 1 / SR)
    edges = np.geomspace(60, 5000, 25)
    pc = (np.round(12 * np.log2(np.maximum(freqs, 1) / 440)) % 12).astype(int)
    feats = []
    for bt in beats:
        i = int(bt * SR)
        seg = x[i:i + int(p * SR)]
        frames = np.lib.stride_tricks.sliding_window_view(seg, n)[::256]
        S = np.abs(np.fft.rfft(frames * np.hanning(n), axis=1)).mean(axis=0)
        env = np.log1p([S[(freqs >= edges[k]) & (freqs < edges[k + 1])].mean() for k in range(24)])
        ch = np.array([S[(pc == c) & (freqs > 80) & (freqs < 2000)].sum() for c in range(12)])
        ch /= ch.sum() + 1e-9
        feats.append(np.concatenate([env / np.linalg.norm(env), ch * 1.5]))
    F = np.array(feats)
    F = (F - F.mean(0)) / (F.std(0) + 1e-9)
    bars = len(F) // 4
    B = F[:bars * 4].reshape(bars, 4, -1).mean(1)
    Bn = B / np.linalg.norm(B, axis=1, keepdims=True)
    S = Bn @ Bn.T
    k = 8
    kern = np.outer(np.r_[-np.ones(k), np.ones(k)], np.r_[-np.ones(k), np.ones(k)])
    nov = np.zeros(bars)
    for i in range(k, bars - k):
        nov[i] = (S[i - k:i + k, i - k:i + k] * kern).sum()
    peaks = [i for i in range(1, bars - 1) if nov[i] > nov[i - 1] and nov[i] >= nov[i + 1] and nov[i] > np.percentile(nov, 70)]
    return [(beats[i * 4], nov[i]) for i in peaks]


def structure(path):
    x = decode(path)
    dur = len(x) / SR
    flux = onset_flux(x)
    np.save(cache(path, '.flux.npy'), flux)
    # fim real da música (antes do silêncio)
    rms = [np.sqrt((x[int(s * SR):int((s + 1) * SR)] ** 2).mean()) for s in range(int(dur))]
    loud = max(rms)
    end = max(i for i, r in enumerate(rms) if r > loud * 0.05) + 1
    bpm, t0, top = global_tempo(flux, 5, end - 5)
    print(f'duração {fmt(dur)} · música até ~{fmt(end)} · BPM {bpm:.2f} (fase {t0:.3f}) · candidatos {top}')
    line = []
    for s0 in range(0, int(dur), 5):
        seg = x[s0 * SR:(s0 + 5) * SR]
        line.append(f'{fmt(s0)[:-3]} {20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9):5.1f}')
    for i in range(0, len(line), 8):
        print('  ' + ' | '.join(line[i:i + 8]))
    print('fronteiras de seção:', ', '.join(f'{fmt(t)}({v:.0f})' for t, v in sections(x, bpm, t0, end)))
    json.dump({'bpm': bpm, 't0': t0, 'end': end}, open(cache(path, '.grid.json'), 'w'))


def beatmap(path, song_id, title, approx, dur=50.0):
    flux = np.load(cache(path, '.flux.npy'))
    grid = json.load(open(cache(path, '.grid.json')))
    p0 = 60 / grid['bpm']
    # batida da grade global mais próxima do início pedido
    k0 = round((approx - grid['t0']) / p0)
    first_guess = grid['t0'] + k0 * p0
    lo, hi = first_guess - 0.3, first_guess + dur + 0.5
    thr = np.percentile(flux[int(lo * FPS):int(hi * FPS)], 70)
    candidates = first_guess + np.arange(-1, int(dur / p0) + 2) * p0
    on = np.full(len(candidates), np.nan)
    for k, t in enumerate(candidates):
        i = int(round(t * FPS))
        w = flux[i - 7:i + 8]
        j = int(np.argmax(w))
        if w[j] > thr:
            d = 0
            if 0 < j < len(w) - 1:
                a, b, c = w[j - 1], w[j], w[j + 1]
                den = a - 2 * b + c
                d = 0.5 * (a - c) / den if den else 0
            on[k] = (i - 7 + j + d) / FPS
    ks = np.arange(len(candidates))
    ok = ~np.isnan(on)
    est = np.zeros(len(candidates))
    for k in ks:
        m = ok & (np.abs(ks - k) <= 4)
        kk, oo = ks[m], on[m]
        for _ in range(2):
            c = np.polyfit(kk, oo, 1)
            r = oo - np.polyval(c, kk)
            keep = np.abs(r) < max(0.015, 2.5 * np.std(r))
            kk, oo = kk[keep], oo[keep]
        est[k] = np.polyval(np.polyfit(kk, oo, 1), k)
    # início 0,2 s antes da primeira batida (padrão do Ragatanga)
    start = round(float(est[1]) - 0.2, 2)
    beats = [round(float(t - start), 6) for t in est if 0 <= t - start < dur]
    res = (on - est)[ok]
    fixed = (on - candidates)[ok]
    fixed -= fixed.mean()
    iv = np.diff(est)
    print(f'{ok.sum()}/{len(candidates)} ataques · resíduo rms {np.sqrt((res ** 2).mean()) * 1000:.1f} ms '
          f'(grade fixa: {np.sqrt((fixed ** 2).mean()) * 1000:.1f} ms, máx {np.abs(fixed).max() * 1000:.0f}) · '
          f'BPM local {60 / iv.max():.1f}–{60 / iv.min():.1f}')
    data = {'songId': song_id, 'title': title, 'audioStart': start, 'audioEnd': round(start + dur, 3),
            'duration': dur, 'detectedBpm': round(60 / iv.mean(), 2), 'beatCount': len(beats), 'beats': beats}
    json.dump(data, open(f'{PROJECT}/src/beatmaps/{song_id}.json', 'w'), indent=2)
    print(f'beatmap {song_id}: {fmt(start)} → {fmt(start + dur)} · {len(beats)} batidas · '
          f'primeira {beats[0]:.3f} s · BPM médio {data["detectedBpm"]}')


if __name__ == '__main__':
    path, cmd = sys.argv[1], sys.argv[2]
    if cmd == 'structure':
        structure(path)
    else:
        beatmap(path, sys.argv[3], sys.argv[4], float(sys.argv[5]), float(sys.argv[6]) if len(sys.argv) > 6 else 50.0)
