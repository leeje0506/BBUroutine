# Ppuroutine Prototype

## Product Summary

**Name:** 뿌루틴

**One-liner:** 반려동물의 매일 케어, 병원 기록, 의료비를 한곳에서 관리하는 건강 루틴 앱.

**Origin story:** 노견 뿌나의 호흡 수, 복약, 병원 기록을 놓치지 않기 위해 시작한 앱.

**Product role:** 진단이나 치료 추천이 아니라, 보호자가 기록을 놓치지 않고 병원 상담에 필요한 정보를 정리하도록 돕는 앱.

## Target Users

- 노견, 노묘를 돌보는 보호자
- 심장, 신장, 당뇨, 발작 등 만성질환이 있는 반려동물 보호자
- 가족과 함께 복약, 식사, 병원 방문을 나눠 챙기는 보호자
- 병원 방문 전 최근 상태, 검사 수치, 비용을 정리하고 싶은 보호자

## Core Value

1. **오늘 할 일을 놓치지 않게**
   - 약, 식사, 물, 호흡 측정, 병원 예약을 한 화면에서 확인한다.

2. **상태 변화를 보기 쉽게**
   - 호흡 수, 체중, 검사 수치, 컨디션 메모를 시간순으로 모은다.

3. **병원 기록을 한곳에**
   - 방문일, 소견, 처방, 영수증, 검사 결과, 다음 예약일을 연결해서 남긴다.

4. **비용을 현실적으로 관리**
   - 진료비, 약값, 검사비, 처방식, 영양제 비용을 월별/카테고리별로 본다.

## MVP Scope

### Included

- 반려동물 프로필
- 오늘의 케어 대시보드
- 호흡 수 측정 및 기록
- 복약 루틴 및 완료 체크
- 병원 방문 기록
- 병원비 기록
- 다음 예약일 표시
- 날짜별 기록 타임라인

### Later

- 푸시 알림
- 가족/보호자 공유
- 영수증/검사 결과 사진 첨부
- 검사 수치 그래프
- PDF 리포트
- 여러 반려동물 관리
- OCR로 영수증/처방전 자동 입력
- 소셜 로그인

## First Prototype Screens

### 1. Onboarding

Goal: 앱의 목적을 짧게 알려주고 첫 반려동물을 등록하게 한다.

Primary content:
- 앱 이름: 뿌루틴
- 짧은 문구: "반려동물의 약, 식사, 병원 기록을 놓치지 않게"
- CTA: "반려동물 등록하기"

Fields:
- 이름
- 종: 강아지 / 고양이 / 기타
- 생년월일 또는 나이
- 몸무게
- 주요 질환 또는 주의사항

### 2. Home Dashboard

Goal: 오늘 필요한 정보를 가장 빠르게 확인한다.

Sections:
- 상단: 반려동물 이름, 오늘 날짜
- 오늘의 루틴
  - 약
  - 식사
  - 호흡 측정
  - 병원 예약
- 빠른 기록 버튼
  - 호흡 재기
  - 약 먹임
  - 식사 기록
  - 병원 기록
- 요약 카드
  - 최근 호흡 수
  - 다음 병원 예약
  - 이번 달 병원비
  - 최근 특이사항

### 3. Breathing Timer

Goal: 밤에 안정 상태에서 쉽게 호흡 수를 측정한다.

Controls:
- 측정 시간 선택: 15초 / 30초 / 60초
- 큰 탭 영역: 숨 쉴 때마다 탭
- 남은 시간
- 현재 카운트
- 완료 후 분당 호흡 수 자동 계산
- 메모 입력
- 저장

Important UX:
- 어두운 방에서도 편하게 보이는 차분한 화면
- 큰 터치 영역
- 실수했을 때 카운트 하나 되돌리기

### 4. Hospital Visit

Goal: 병원 방문 기록을 빠짐없이 남긴다.

Fields:
- 방문일
- 병원명
- 방문 이유
- 진단/소견
- 처방/변경된 약
- 검사 메모
- 다음 예약일
- 총 비용

### 5. Expenses

Goal: 반려동물 의료비를 월별로 확인한다.

Sections:
- 이번 달 총액
- 카테고리별 금액
  - 진료
  - 약
  - 검사
  - 처치/수술
  - 처방식
  - 영양제
  - 기타
- 최근 지출 내역

### 6. Timeline

Goal: 날짜별로 모든 기록을 한 번에 본다.

Record types:
- 호흡
- 약
- 식사
- 컨디션
- 병원 방문
- 비용

## Navigation

Bottom tabs:

1. **홈**
   - 오늘의 루틴과 요약

2. **기록**
   - 호흡, 약, 식사, 컨디션 타임라인

3. **병원**
   - 방문 기록, 예약, 처방, 검사

4. **비용**
   - 월별 지출, 카테고리별 지출

5. **프로필**
   - 반려동물 정보, 질환/주의사항, 설정

## Design Direction

### Mood

- 귀엽지만 유아적이지 않게
- 병원 앱처럼 차갑지 않게
- 보호자가 밤에도 편하게 쓸 수 있게
- 정보는 조밀하되 부담스럽지 않게

### Visual Keywords

- soft
- calm
- caring
- practical
- warm
- clear

### Color Direction

Avoid:
- 병원 느낌이 강한 차가운 파랑 중심 팔레트
- 너무 유아적인 원색
- 전체가 베이지/크림으로만 보이는 단조로운 팔레트

Use:
- Warm ivory background
- Sage green for care/success
- Coral for action
- Soft blue for medical records
- Warm gray text

Example palette:
- Background: `#FFF9F1`
- Surface: `#FFFFFF`
- Primary: `#5E8C6A`
- Accent: `#F28F6B`
- Info: `#7CA7C7`
- Warning: `#D89A3D`
- Text: `#2E2A27`
- Muted text: `#7A716B`
- Border: `#E8DED2`

### Typography

- Korean-friendly sans-serif
- Mobile-first readable sizes
- No tiny medical text for critical values
- Large numeric display for timer and costs

### Component Style

- Cards: 8px radius
- Buttons: clear labels with icons
- Inputs: roomy height, strong labels
- Timer tap area: very large, high contrast
- Status chips: compact, color-coded
- Empty states: warm, short, action-oriented

## UX Principles

1. **One-handed use**
   - Common actions should be reachable near the lower half of the screen.

2. **Night-friendly**
   - 호흡 측정 화면은 눈부심을 줄이고 버튼을 크게 둔다.

3. **Fast logging**
   - 기록은 10초 안에 남길 수 있어야 한다.

4. **No medical judgment**
   - 위험 판정, 치료 추천 대신 변화 확인과 상담 준비에 집중한다.

5. **Caregiver confidence**
   - "내가 오늘 해야 할 일을 놓치지 않았다"는 느낌을 준다.

## Data Model Draft

### Pet

- id
- name
- species
- breed
- birth_date
- weight_kg
- conditions
- caution_notes
- created_at
- updated_at

### BreathingRecord

- id
- pet_id
- measured_at
- duration_seconds
- breath_count
- breaths_per_minute
- memo
- created_at

### Medication

- id
- pet_id
- name
- dosage
- frequency
- start_date
- end_date
- memo
- is_active

### MedicationLog

- id
- medication_id
- pet_id
- scheduled_at
- taken_at
- status
- memo

### HospitalVisit

- id
- pet_id
- hospital_name
- visited_at
- reason
- diagnosis
- vet_note
- prescription_note
- next_visit_at
- total_cost
- memo
- created_at

### MedicalExpense

- id
- pet_id
- visit_id
- category
- amount
- paid_at
- memo

### LabResult

- id
- pet_id
- visit_id
- test_name
- value
- unit
- reference_min
- reference_max
- tested_at
- memo

### Attachment

- id
- pet_id
- visit_id
- type
- file_url
- uploaded_at

## Recommended Tech Stack

### Mobile

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- Zustand
- React Hook Form
- Zod

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- PostgreSQL
- Pytest

### Infra

- Supabase Postgres or Neon
- Render, Railway, or Fly.io for API deployment
- Expo EAS for mobile builds
- GitHub and GitHub Actions
- Docker for local backend/database setup

## First Build Milestone

**Milestone 1: usable breathing and hospital log prototype**

Screens:
- Pet setup
- Home dashboard
- Breathing timer
- Breathing history
- Hospital visit form
- Expense summary

Backend:
- Pet CRUD
- Breathing record create/list
- Hospital visit create/list
- Expense create/list/monthly summary

Success criteria:
- A user can register one pet.
- A user can measure breathing with a timer and save the result.
- A user can enter a hospital visit with cost and next appointment.
- Home shows recent breathing, next appointment, and this month's expense.
