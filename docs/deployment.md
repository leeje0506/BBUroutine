# 뿌루틴 배포 메모

## 추천 구조

- 모바일 앱: Expo Go 테스트, 이후 EAS Build/TestFlight 또는 APK로 공유
- 백엔드: Render Web Service
- DB:
  - 빠른 테스트: Render 서버 + SQLite 파일
  - 친구 테스트 이상: Supabase Postgres로 전환 권장
- Vercel: 모바일 앱 배포용이 아니라 웹 미리보기용으로만 사용

## 지금 바로 가능한 테스트 배포

현재 백엔드는 SQLite를 사용한다. Render에서 테스트하려면 DB 파일 경로를 환경변수로 지정할 수 있다.

```bash
PPUROUTINE_DB_PATH=/var/data/ppuroutine.db
```

Render 설정 예시:

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment:
  - `PPUROUTINE_DB_PATH=/var/data/ppuroutine.db`

SQLite 파일 저장이 유지되어야 하므로 Render에서 persistent disk를 붙여야 한다. 디스크 없이 배포하면 서버 재시작 때 기록이 사라질 수 있다.

## 권장 배포

친구에게 테스트를 맡길 정도라면 Supabase Postgres로 옮기는 것이 좋다.

1. Supabase 프로젝트 생성
2. Postgres connection string 준비
3. 백엔드 DB 레이어를 SQLite에서 Postgres로 전환
4. Render 환경변수에 DB URL 설정
5. Expo 앱의 `EXPO_PUBLIC_API_URL`을 Render API 주소로 변경

모바일 실행 예시:

```bash
EXPO_PUBLIC_API_URL=https://your-ppuroutine-api.onrender.com pnpm expo start
```

## 엑셀 내보내기

백엔드에서 제공한다.

```text
GET /api/export/excel
```

프로필 화면의 `데이터 내보내기` 버튼은 이 URL을 연다.
