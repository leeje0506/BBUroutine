# 뿌루틴 배포 메모

## 추천 구조

- 모바일 앱: Expo Go 테스트, 이후 EAS Build/TestFlight 또는 APK로 공유
- 백엔드: Render Web Service
- DB: 로컬은 SQLite, 배포는 Supabase Postgres 권장
- Vercel: 모바일 앱 배포용이 아니라 웹 미리보기용으로만 사용

## 로컬 개발

`DATABASE_URL`이 없으면 백엔드는 SQLite를 사용한다.

```bash
PPUROUTINE_DB_PATH=./data/ppuroutine.db
```

## Render + Supabase 배포

친구에게 테스트를 맡길 정도라면 Supabase Postgres를 사용한다. Render 서버가 재시작되어도 기록이 유지된다.

1. Supabase 프로젝트 생성
2. Project Settings > Database에서 Postgres connection string 준비
3. Render Web Service 생성
4. Render 환경변수에 `DATABASE_URL` 설정
5. Expo 앱의 `EXPO_PUBLIC_API_URL`을 Render API 주소로 변경

Render 설정 예시:

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment:
  - `DATABASE_URL=postgresql://...?...sslmode=require`

모바일 실행 예시:

```bash
EXPO_PUBLIC_API_URL=https://your-ppuroutine-api.onrender.com pnpm expo start
```

SQLite로 Render를 테스트할 수도 있지만, 이 경우 persistent disk를 붙이지 않으면 서버 재시작 때 기록이 사라질 수 있다.

## 엑셀 내보내기

백엔드에서 제공한다.

```text
GET /api/export/excel
```

프로필 화면의 `데이터 내보내기` 버튼은 이 URL을 연다.
