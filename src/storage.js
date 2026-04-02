/**
 * storage.js
 * 
 * Firebase Realtime Database adapter.
 * Mirrors the window.storage API used in the Claude artifact.
 * 
 * HOW TO SET UP (무료):
 * 1. https://console.firebase.google.com → 새 프로젝트 만들기
 * 2. Realtime Database → 데이터베이스 만들기 → 테스트 모드
 * 3. 아래 FIREBASE_URL을 복사한 DB URL로 교체 (예: https://xxx-default-rtdb.firebaseio.com)
 */

const FIREBASE_URL = (import.meta.env.VITE_FIREBASE_URL || '').replace(/\/$/, '');

if (!FIREBASE_URL) {
  console.warn('[storage] VITE_FIREBASE_URL이 설정되지 않았습니다. 멀티플레이 기능을 사용하려면 Firebase Realtime Database URL을 환경 변수로 추가하세요.');
}

async function fbFetch(key, method, body) {
  if (!FIREBASE_URL) throw new Error('Firebase URL not configured');
  const url = `${FIREBASE_URL}/${encodeURIComponent(key)}.json`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Firebase ${method} failed: ${res.status}`);
  return res.json();
}

export const storage = {
  async get(key) {
    try {
      const val = await fbFetch(key, 'GET');
      if (val === null) return null;
      return { value: typeof val === 'string' ? val : JSON.stringify(val) };
    } catch { return null; }
  },
  async set(key, value) {
    try {
      await fbFetch(key, 'PUT', value);
      return { key, value };
    } catch { return null; }
  },
  async delete(key) {
    try {
      await fbFetch(key, 'DELETE');
      return { key, deleted: true };
    } catch { return null; }
  },
};
