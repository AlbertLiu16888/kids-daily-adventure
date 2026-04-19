import { getSettings } from './state.js';

export function buzz(pattern = [40]) {
  if (!getSettings().vibration) return;
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

export const hapTap     = () => buzz([30]);
export const hapSuccess = () => buzz([80, 40, 80]);
export const hapCandy   = () => buzz([100, 60, 100, 60, 200]);
export const hapFail    = () => buzz([200]);
