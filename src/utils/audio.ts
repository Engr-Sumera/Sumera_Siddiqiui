let audioCtx: AudioContext | null = null;

export function playAlertChime(level: 'crit' | 'mod') {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx?.resume();
    }
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = level === 'crit' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(level === 'crit' ? 880 : 520, audioCtx.currentTime);
    if (level === 'crit') {
      osc.frequency.setValueAtTime(987.77, audioCtx.currentTime + 0.1);
    }

    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (level === 'crit' ? 0.35 : 0.2));

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + (level === 'crit' ? 0.36 : 0.22));
  } catch (e) {
    // Gracefully handle browser autoplay policy
  }
}
