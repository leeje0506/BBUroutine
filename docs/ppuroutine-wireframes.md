# Ppuroutine Wireframes

Low-fidelity mobile wireframes for **뿌루틴**.

Goal: confirm flow, information priority, and core interactions before visual design or implementation.

## App Structure

```txt
Onboarding
  -> Pet Setup
  -> Home

Bottom Tabs
  Home
  Records
  Hospital
  Expenses
  Profile

Primary Actions
  Home -> Measure Breathing
  Home -> Check Medication
  Home -> Log Meal
  Home -> Add Hospital Visit
  Hospital -> Add Visit
  Expenses -> Add Expense
```

## Global Navigation

```txt
┌─────────────────────────┐
│                         │
│        Screen Body       │
│                         │
│                         │
│                         │
├─────────────────────────┤
│ 홈   기록   병원   비용   프로필 │
└─────────────────────────┘
```

Notes:
- Keep bottom navigation persistent after onboarding.
- Use short Korean labels.
- Use icons in the actual UI, but wireframes use text only.

## 1. Onboarding

Purpose: explain the app quickly and start pet setup.

```txt
┌─────────────────────────┐
│                         │
│         뿌루틴           │
│                         │
│  반려동물의 약, 식사,     │
│  병원 기록을 놓치지 않게  │
│                         │
│  [small friendly visual] │
│                         │
│ ┌─────────────────────┐ │
│ │ 반려동물 등록하기     │ │
│ └─────────────────────┘ │
│                         │
│  이미 기록이 있나요?     │
└─────────────────────────┘
```

Priority:
- App name
- Clear value proposition
- One primary CTA

## 2. Pet Setup

Purpose: create the first pet profile with only essential fields.

```txt
┌─────────────────────────┐
│ ← 반려동물 등록           │
├─────────────────────────┤
│ 이름                     │
│ ┌─────────────────────┐ │
│ │ 뿌나                 │ │
│ └─────────────────────┘ │
│                         │
│ 종류                     │
│ [강아지] [고양이] [기타] │
│                         │
│ 생년월일 또는 나이        │
│ ┌─────────────────────┐ │
│ │ 2012.03.14          │ │
│ └─────────────────────┘ │
│                         │
│ 몸무게                   │
│ ┌──────────┐ kg         │
│ │ 5.2      │            │
│ └──────────┘            │
│                         │
│ 주요 질환/주의사항        │
│ ┌─────────────────────┐ │
│ │ 심장, 신장 관리 중    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 시작하기             │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

Notes:
- Avoid a long setup.
- Optional medical details can be edited later in Profile.

## 3. Home Dashboard

Purpose: answer "What should I check today?" in one glance.

```txt
┌─────────────────────────┐
│ 뿌나        6월 26일 금  │
├─────────────────────────┤
│ 오늘의 루틴              │
│ ┌─────────────────────┐ │
│ │ 약  저녁약 21:00   ○ │ │
│ │ 밥  저녁 미기록     ○ │ │
│ │ 숨  오늘 측정 전    ○ │ │
│ │ 병원 다음 예약 7/2  ✓ │ │
│ └─────────────────────┘ │
│                         │
│ 빠른 기록                │
│ ┌─────┐ ┌─────┐         │
│ │숨 재기│ │약 체크│        │
│ └─────┘ └─────┘         │
│ ┌─────┐ ┌─────┐         │
│ │식사  │ │병원  │         │
│ └─────┘ └─────┘         │
│                         │
│ 요약                    │
│ ┌─────────┐ ┌─────────┐ │
│ │최근 호흡 │ │이번 달 비용│ │
│ │24회/분  │ │182,000원 │ │
│ └─────────┘ └─────────┘ │
│ ┌─────────────────────┐ │
│ │다음 예약 7월 2일     │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 홈   기록   병원   비용   프로필 │
└─────────────────────────┘
```

Priority:
- Today's unfinished care items
- Fast logging
- Recent health/expense summary

Interaction:
- Tap routine item -> relevant log/check screen
- Tap summary card -> detail screen
- Tap pet name -> profile switch/edit later

## 4. Breathing Timer

Purpose: measure resting breaths with minimal friction, especially at night.

```txt
┌─────────────────────────┐
│ ← 호흡 수 측정            │
├─────────────────────────┤
│ 측정 시간                 │
│ [15초] [30초] [60초]     │
│                         │
│       남은 시간           │
│          00:23          │
│                         │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │        탭해서        │ │
│ │       호흡 세기       │ │
│ │                     │ │
│ │          8          │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ [되돌리기]        [중지]  │
└─────────────────────────┘
```

Completed state:

```txt
┌─────────────────────────┐
│ ← 호흡 수 측정            │
├─────────────────────────┤
│ 측정 완료                 │
│                         │
│         24회/분           │
│                         │
│  30초 동안 12회 측정       │
│                         │
│ 메모                     │
│ ┌─────────────────────┐ │
│ │ 잠든 뒤 안정 상태     │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 기록 저장            │ │
│ └─────────────────────┘ │
│ 다시 측정하기             │
└─────────────────────────┘
```

Notes:
- The tap area should be the largest element.
- Undo must be visible because mis-taps are likely.
- Keep strong contrast for night use.

## 5. Records Timeline

Purpose: show all daily logs in chronological order.

```txt
┌─────────────────────────┐
│ 기록                     │
├─────────────────────────┤
│ [오늘] [7일] [30일]       │
│                         │
│ 6월 26일                 │
│ ┌─────────────────────┐ │
│ │ 숨 24회/분  22:14    │ │
│ │ 잠든 뒤 안정 상태     │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 약 저녁약 완료 21:02 │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 식사 저녁 일부 섭취   │ │
│ └─────────────────────┘ │
│                         │
│ 6월 25일                 │
│ ┌─────────────────────┐ │
│ │ 병원 정기 검진        │ │
│ │ 다음 예약 7월 2일     │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 홈   기록   병원   비용   프로필 │
└─────────────────────────┘
```

Filters:
- All
- Breathing
- Medication
- Meal
- Hospital
- Expense

## 6. Hospital List

Purpose: manage visits, appointments, prescriptions, and test notes.

```txt
┌─────────────────────────┐
│ 병원              + 방문 │
├─────────────────────────┤
│ 다음 예약                 │
│ ┌─────────────────────┐ │
│ │ 7월 2일 오후 3:00    │ │
│ │ 마음동물병원          │ │
│ │ 신장 수치 재검        │ │
│ └─────────────────────┘ │
│                         │
│ 최근 방문                 │
│ ┌─────────────────────┐ │
│ │ 6월 25일 마음동물병원 │ │
│ │ 정기 검진 / 처방 변경 │ │
│ │ 182,000원            │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 6월 10일 마음동물병원 │ │
│ │ 기침 상담             │ │
│ │ 68,000원             │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 홈   기록   병원   비용   프로필 │
└─────────────────────────┘
```

## 7. Add Hospital Visit

Purpose: record a visit without forcing perfect medical detail.

```txt
┌─────────────────────────┐
│ ← 병원 기록 추가          │
├─────────────────────────┤
│ 방문일                   │
│ ┌─────────────────────┐ │
│ │ 2026.06.25          │ │
│ └─────────────────────┘ │
│ 병원명                   │
│ ┌─────────────────────┐ │
│ │ 마음동물병원          │ │
│ └─────────────────────┘ │
│ 방문 이유                 │
│ ┌─────────────────────┐ │
│ │ 정기 검진             │ │
│ └─────────────────────┘ │
│ 소견/진단                 │
│ ┌─────────────────────┐ │
│ │ 신장 수치 추적 필요   │ │
│ └─────────────────────┘ │
│ 처방/약 변경              │
│ ┌─────────────────────┐ │
│ │ 이뇨제 용량 조정      │ │
│ └─────────────────────┘ │
│ 다음 예약일               │
│ ┌─────────────────────┐ │
│ │ 2026.07.02 15:00    │ │
│ └─────────────────────┘ │
│ 총 비용                   │
│ ┌─────────────────────┐ │
│ │ 182000              │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 저장하기             │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

Later additions:
- Receipt photo
- Lab result rows
- Prescription medicine auto-create

## 8. Expenses

Purpose: make cost visible without making the app feel harsh.

```txt
┌─────────────────────────┐
│ 비용              + 지출 │
├─────────────────────────┤
│ 2026년 6월               │
│                         │
│ ┌─────────────────────┐ │
│ │ 이번 달 총액          │ │
│ │       250,000원      │ │
│ └─────────────────────┘ │
│                         │
│ 카테고리                 │
│ ┌─────────────────────┐ │
│ │ 진료      68,000원   │ │
│ │ 검사     120,000원   │ │
│ │ 약        42,000원   │ │
│ │ 처방식    20,000원   │ │
│ └─────────────────────┘ │
│                         │
│ 최근 지출                 │
│ ┌─────────────────────┐ │
│ │ 6/25 정기 검진       │ │
│ │ 182,000원            │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ 홈   기록   병원   비용   프로필 │
└─────────────────────────┘
```

Notes:
- Cost view should be clear, not guilt-inducing.
- Use "관리" and "확인" language, not warnings.

## 9. Profile

Purpose: keep medical context and app settings.

```txt
┌─────────────────────────┐
│ 프로필                   │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 뿌나                 │ │
│ │ 강아지 · 14살 · 5.2kg│ │
│ │ 심장, 신장 관리 중    │ │
│ └─────────────────────┘ │
│                         │
│ 건강 정보                │
│ - 주요 질환              │
│ - 주의사항               │
│ - 담당 병원              │
│                         │
│ 설정                     │
│ - 알림                   │
│ - 데이터 내보내기         │
│ - 보호자 공유            │
├─────────────────────────┤
│ 홈   기록   병원   비용   프로필 │
└─────────────────────────┘
```

## Main User Flows

### First Use

```txt
Onboarding -> Pet Setup -> Home
```

### Measure Breathing

```txt
Home -> 숨 재기 -> Timer -> Result -> Save -> Home
```

### Record Hospital Visit

```txt
Home or Hospital -> + 방문 -> Add Visit -> Save -> Hospital Detail
```

### Check Upcoming Appointment

```txt
Home -> Next Appointment Card -> Hospital Visit Detail
```

### Review Monthly Cost

```txt
Home -> This Month Expense Card -> Expenses
```

## Prototype Priority

Build screens in this order:

1. Onboarding
2. Pet Setup
3. Home Dashboard
4. Breathing Timer
5. Hospital List
6. Add Hospital Visit
7. Expenses
8. Records Timeline
9. Profile

## Open Design Questions

- Should the first prototype include meal and medication forms, or only show them as dashboard items?
- Should the breathing screen have a dark mode from the first version?
- Should hospital cost be part of the visit form only, or should expenses have a separate quick-add flow?
- Should "병원" and "비용" be separate tabs, or should cost live inside hospital for MVP?
