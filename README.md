# BBUroutine / 뿌루틴

반려동물의 매일 케어, 병원 기록, 의료비를 한곳에서 관리하는 건강 루틴 앱 프로토타입.

## Structure

```txt
apps/mobile   Expo React Native app
backend       FastAPI API scaffold
docs          product, wireframe, visual direction
assets        generated design assets
```

## Mobile

Expo SDK 54 기반이라 SDK 54를 지원하는 Expo Go에서 열 수 있다.

```bash
cd apps/mobile
pnpm install
pnpm start
```

백엔드까지 연결해서 보려면 FastAPI 서버를 먼저 띄운 뒤, 휴대폰에서 접근 가능한 Mac의 로컬 IP를 넣어 실행한다.

```bash
EXPO_PUBLIC_API_URL=http://<YOUR_MAC_LAN_IP>:8000 pnpm start
```

예를 들어 Mac IP가 `192.168.0.10`이면:

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.10:8000 pnpm start
```

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
