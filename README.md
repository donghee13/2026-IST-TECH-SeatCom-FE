# SeatCom 프론트엔드

도서관 열람실에서 **나에게 맞는 빈자리**를 추천하는 서비스의 웹 화면입니다.

로그인 → 4문항 취향 설문(선택: 카카오톡 대화 분석) → 열람실 자리표에서 추천 자리 확인 → 앉은 자리·거절 이유가 다음 추천에 반영됩니다.

- 프론트엔드(이 저장소): <https://github.com/donghee13/2026-IST-TECH-SeatCom-FE>
- 백엔드: <https://github.com/yojun313/2026-IST-TECH-SeatCom-Model>

## 구성

```
브라우저 ──▶ seatcom-frontend (0.0.0.0:8000)  ──/api──▶ seatcom-backend (:8001)
            이 저장소의 dist + API 프록시               백엔드 저장소
```

- React 19 + TypeScript + Vite + Tailwind CSS 4
- 빌드 결과(`dist/`)를 이 저장소의 `server.mjs`(`npm start`, 의존성 없음)가 제공하고 `/api`·`/health`를 백엔드로 전달합니다. 브라우저는 같은 주소로만 요청하므로 CORS 설정이 필요 없습니다.
- 어느 서버에서 클론해도 같은 결과가 나오도록 고정돼 있습니다: 의존성 버전 `package-lock.json`(`npm ci`), Node 버전 `.nvmrc`(24), 배포용 값 `.env.production`.

## 빠른 배포 (처음 한 번)

**배포는 백엔드 저장소에서 한 번에 합니다.** 프론트 빌드도 그 스크립트가 해 줍니다.

**준비물:** Node.js 24(`.nvmrc`, 최소 20.19), 그리고 백엔드 README의 준비물(Python 3.11+, uv, pm2)

**1. 두 저장소를 같은 폴더에 나란히 클론합니다.** 폴더 이름도 그대로 둡니다.

```bash
git clone https://github.com/yojun313/2026-IST-TECH-SeatCom-Model.git
git clone https://github.com/donghee13/2026-IST-TECH-SeatCom-FE.git
```

```
작업폴더/
├── 2026-IST-TECH-SeatCom-Model/   ← 배포 스크립트가 여기 있음
└── 2026-IST-TECH-SeatCom-FE/      ← 이 저장소
```

**2. 백엔드 설정 후 배포 스크립트를 실행합니다.** (설정 방법: [백엔드 README](https://github.com/yojun313/2026-IST-TECH-SeatCom-Model#빠른-배포-처음-한-번))

```bash
cd 2026-IST-TECH-SeatCom-Model
cp backend/.env.example backend/.env    # 값 채우기
bash deploy/deploy.sh
```

스크립트가 프론트 쪽에서 하는 일:
1. `npm ci`로 `package-lock.json`과 똑같은 버전을 설치합니다.
2. `npm run build`로 `dist/`를 만듭니다. 배포용 값은 커밋된 `.env.production`을 씁니다.
3. pm2의 `seatcom-frontend`(8000)가 이 저장소의 `server.mjs`로 `dist/`를 제공합니다.

**3. 브라우저로 `http://서버주소:8000`에 접속합니다.** (데이터셋 뷰어는 백엔드 `http://서버주소:8001/`)

> 공개 서비스는 앞단에 HTTPS(nginx·Caddy 등)를 두고 8000으로 전달하세요.

### 프론트만 따로 켜기

백엔드가 이미 다른 곳에서 돌고 있으면 이 저장소만으로 켤 수 있습니다.

```bash
npm ci
npm run build
BACKEND_URL=http://127.0.0.1:8001 npm start           # http://0.0.0.0:8000
# 계속 켜 두려면: BACKEND_URL=... pm2 start server.mjs --name seatcom-frontend
```

| 값 | 기본 | 설명 |
|---|---|---|
| `BACKEND_URL` | `http://127.0.0.1:8001` | `/api`·`/health`를 전달할 백엔드 |
| `PORT`, `HOST` | `8000`, `0.0.0.0` | 프론트 서버 주소 |
| `FE_DIST` | `./dist` | 제공할 빌드 폴더 |

## 업데이트 배포

```bash
cd 2026-IST-TECH-SeatCom-FE && git pull
cd ../2026-IST-TECH-SeatCom-Model && bash deploy/deploy.sh
```

화면이 예전 그대로면 브라우저에서 강력 새로고침(Ctrl+Shift+R)을 하세요.

## 로컬 개발

```bash
npm ci
npm run dev          # http://localhost:5173
```

개발 서버는 `/api` 요청을 `VITE_API_TARGET`으로 넘깁니다. 실제 백엔드에 붙이려면 백엔드를 띄우고 `.env.local`을 만드세요.

```bash
# 백엔드 저장소에서
uv sync --frozen && uv run --frozen python -m backend    # 127.0.0.1:8001
```

```bash
# 이 저장소의 .env.local
VITE_API_TARGET=http://127.0.0.1:8001
VITE_MOCK_AUTH=false
```

| 명령 | 내용 |
|---|---|
| `npm run dev` | 개발 서버(수정하면 바로 반영) |
| `npm run build` | 타입 검사 + `dist/` 빌드 |
| `npm run preview` | 빌드 결과 미리 보기 |
| `npm run lint` | oxlint 검사 |

## 설정

`VITE_` 값은 **빌드할 때 화면 코드에 그대로 들어가므로** 비밀값을 넣으면 안 됩니다. 개인 설정은 Git에 안 올라가는 `.env.local`에 쓰세요.

개발(`npm run dev`)은 `.env`, 배포 빌드(`npm run build`)는 `.env.production`이 우선합니다. 둘 다 커밋돼 있어서 클론하면 그대로 씁니다.

| 값 | 개발 `.env` | 배포 `.env.production` | 설명 |
|---|---|---|---|
| `VITE_API_TARGET` | `http://127.0.0.1:8001` | (안 씀) | 개발 서버의 `/api` 전달 대상 |
| `VITE_MOCK_AUTH` | `true` | `false` | `false`면 실제 회원가입·로그인 사용 |
| `VITE_DEV_TOKEN` | 비어 있음 | 비어 있음 | 가짜 로그인 때 쓸 개발용 토큰 |
| `VITE_ROOM_ID` | `DEMO-ROOM-A` | `yongin-giheung:room:1` | 처음 보여 줄 열람실 |

## 문제 해결

| 증상 | 해결 |
|---|---|
| `npm run dev`에서 API가 실패 | 백엔드가 켜져 있는지, `.env.local`의 `VITE_API_TARGET`이 `http://127.0.0.1:8001`인지 확인 |
| `npm ci` 실패 | Node 버전 확인(`node -v`, 20.19 이상·권장 24). `nvm use`로 맞추기 |
| 배포 화면이 로그인 없이 들어가짐 | `.env.production.local` 같은 덮어쓰는 파일이 있는지 확인 후 다시 빌드 |
| 배포했는데 화면이 그대로 | 강력 새로고침. 그래도 같으면 `deploy.sh`를 `--no-build` 없이 실행했는지 확인 |
| 배포 스크립트가 프론트를 못 찾음 | 두 저장소가 같은 폴더에 원래 이름으로 있는지 확인 |

## 폴더 구조

| 경로 | 역할 |
|---|---|
| `src/pages/` | 화면: 로그인·회원가입, 설문(`Questions`), 추천 결과(`Result`), 카카오톡 실험실(`Lab*`), 기록·계정 |
| `src/components/` | 공통 UI, 자리표(`FloorPlan`), 거절 이유 시트 |
| `src/api/` | 백엔드 API 호출 |
| `src/types.ts` | API 응답 타입 |
| `src/data/options.ts` | 설문 선택지, 카카오톡 내보내기 안내 |
| `public/` | 파비콘 등 정적 파일 |
| `server.mjs` | 배포용 서버: `dist/` 제공 + `/api` 프록시(`npm start`) |
| `hackathon/` | 2026 IT Arena 해커톤 발표 자료(`seatcom.pptx`)·상장(PDF) |

**카카오톡 실험실:** 사용자가 고른 TXT 파일은 브라우저에 저장하지 않고 서버로 바로 보냅니다. 서버도 원문을 저장하지 않습니다.

API 명세: 백엔드 저장소의 [backend/docs/API_SPEC_v2.1.md](https://github.com/yojun313/2026-IST-TECH-SeatCom-Model/blob/main/backend/docs/API_SPEC_v2.1.md)
