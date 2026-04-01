# 🎲 YAHTZEE 야추 다이스 — Netlify 배포 가이드

## 1단계: Firebase 설정 (무료, 5분)

1. [Firebase Console](https://console.firebase.google.com) 접속
2. **새 프로젝트 만들기** (Google Analytics 선택 해제해도 됨)
3. 왼쪽 메뉴 → **Realtime Database** → **데이터베이스 만들기**
4. **테스트 모드**로 시작 (30일 후 규칙 설정 필요)
5. 데이터베이스 URL 복사 (형태: `https://xxx-default-rtdb.firebaseio.com`)

## 2단계: 환경변수 설정

`.env.example`을 `.env`로 복사 후 URL 입력:
```
VITE_FIREBASE_URL=https://YOUR-PROJECT-default-rtdb.firebaseio.com
```

## 3단계: Netlify 배포

### 방법 A — Netlify Drop (가장 빠름, 2분)
```bash
npm install
npm run build
```
→ `dist` 폴더를 [app.netlify.com/drop](https://app.netlify.com/drop) 에 드래그&드롭

**단, 환경변수가 빌드 시 포함되므로:**  
`.env` 파일을 만든 뒤 빌드해야 Firebase URL이 적용됩니다.

### 방법 B — GitHub 연동 (권장, 자동 배포)
1. 이 폴더를 GitHub repo에 push
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → GitHub 연결
3. Build command: `npm run build` / Publish directory: `dist`
4. **Site settings → Environment variables** 에서 `VITE_FIREBASE_URL` 추가
5. **Deploy** 클릭

## 로컬 테스트
```bash
npm install
cp .env.example .env   # URL 입력 후
npm run dev
```
