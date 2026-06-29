import { StatusBar } from "expo-status-bar";
import * as DocumentPicker from "expo-document-picker";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ppunaImages } from "./src/assets";
import {
  AuthSession,
  BreathingRecord,
  BreathingStats,
  CareSummary,
  ExpenseSummary,
  HospitalVisit,
  Suggestions,
  MealRecord,
  MedicationLog,
  PetProfile,
  createBreathingRecord,
  createHospitalVisit,
  createMealRecord,
  createMedicationLog,
  createPet,
  getBreathingRecords,
  getBreathingStats,
  getCareSummary,
  getCurrentPet,
  getExportExcelUrl,
  getExpenseSummary,
  getHospitalVisits,
  getMealRecords,
  getMedicationLogs,
  getSuggestions,
  login,
  setApiToken,
} from "./src/api";
import { colors } from "./src/theme";

type Tab = "home" | "records" | "hospital" | "expenses" | "profile";
type Mode = "tabs" | "breathing" | "medication" | "meal" | "hospital";
type SaveState = "idle" | "saving" | "saved" | "error";
type LoadState = "loading" | "ready" | "error";
type RecordPeriod = "today" | "7d" | "30d";
type RecordKind = "all" | "breathing" | "medication" | "meal" | "hospital";
type MedicationDraft = { name: string; dosageAmount: string; dosageUnit: string };
type AttachmentDraft = { name: string; uri: string; mime_type: string | null; size: number | null };

const dosageUnits = ["정", "ml", "mg", "g", "포", "방울"];
const recurrenceOptions = [
  { label: "반복 없음", value: null },
  { label: "1주마다", value: 1 },
  { label: "2주마다", value: 2 },
  { label: "4주마다", value: 4 },
];

const tabs: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "home", label: "홈", icon: "⌂" },
  { key: "records", label: "기록", icon: "▦" },
  { key: "hospital", label: "병원", icon: "✚" },
  { key: "expenses", label: "비용", icon: "₩" },
  { key: "profile", label: "프로필", icon: "◌" },
];

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [needsPetSetup, setNeedsPetSetup] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [mode, setMode] = useState<Mode>("tabs");
  const [refreshKey, setRefreshKey] = useState(0);

  function handleLogin(session: AuthSession) {
    setApiToken(session.token);
    setAuthSession(session);
    setNeedsPetSetup(!session.pet);
    setRefreshKey((value) => value + 1);
  }

  function handlePetCreated() {
    setNeedsPetSetup(false);
    setRefreshKey((value) => value + 1);
  }

  function handleLogout() {
    setApiToken(null);
    setAuthSession(null);
    setNeedsPetSetup(false);
    setMode("tabs");
    setTab("home");
  }

  function closeMode(shouldRefresh = false) {
    setMode("tabs");
    if (shouldRefresh) setRefreshKey((value) => value + 1);
  }

  const screen = useMemo(() => {
    if (mode === "breathing") return <BreathingMeasureScreen onClose={closeMode} />;
    if (mode === "medication") return <MedicationCheckScreen onClose={closeMode} />;
    if (mode === "meal") return <MealCheckScreen onClose={closeMode} />;
    if (mode === "hospital") return <HospitalQuickScreen onClose={closeMode} />;
    if (tab === "records") return <RecordsScreen refreshKey={refreshKey} />;
    if (tab === "hospital") return <HospitalScreen refreshKey={refreshKey} />;
    if (tab === "expenses") return <ExpensesScreen refreshKey={refreshKey} />;
    if (tab === "profile") return <ProfileScreen refreshKey={refreshKey} session={authSession} onLogout={handleLogout} />;
    return (
      <HomeScreen
        refreshKey={refreshKey}
        onMeasureBreathing={() => setMode("breathing")}
        onCheckMedication={() => setMode("medication")}
        onCheckMeal={() => setMode("meal")}
        onAddHospital={() => setMode("hospital")}
      />
    );
  }, [mode, tab, refreshKey, authSession]);

  if (!authSession) {
    return (
      <SafeAreaView style={styles.app}>
        <StatusBar style="dark" />
        <View style={styles.phone}>
          <LoginScreen onLogin={handleLogin} />
        </View>
      </SafeAreaView>
    );
  }

  if (needsPetSetup) {
    return (
      <SafeAreaView style={styles.app}>
        <StatusBar style="dark" />
        <View style={styles.phone}>
          <PetSetupScreen displayName={authSession.display_name} onCreated={handlePetCreated} onLogout={handleLogout} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.phone}>
        <View style={styles.screen}>{screen}</View>
        {mode === "tabs" ? <TabBar active={tab} onChange={setTab} /> : null}
      </View>
    </SafeAreaView>
  );
}

function LoginScreen({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [username, setUsername] = useState("dev1");
  const [password, setPassword] = useState("dev1");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) return;
    setIsSubmitting(true);
    setMessage("");
    const session = await login({ username: username.trim(), password });
    setIsSubmitting(false);
    if (!session) {
      setMessage("아이디나 비밀번호를 확인해 주세요");
      return;
    }
    onLogin(session);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.loginScreen}>
      <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
        <Image source={ppunaImages.face} style={styles.loginImage} />
        <Text style={styles.loginTitle}>뿌루틴</Text>
        <Text style={styles.loginSubtitle}>보호자별로 기록을 따로 보관해요</Text>
        <View style={styles.loginCard}>
          <Text style={styles.resultLabel}>아이디</Text>
          <FormInput value={username} onChangeText={setUsername} placeholder="dev1 또는 bbunu" />
          <Text style={styles.resultLabel}>비밀번호</Text>
          <FormInput value={password} onChangeText={setPassword} placeholder="비밀번호" secureTextEntry />
          <Pressable style={styles.saveButton} onPress={handleSubmit} disabled={isSubmitting}>
            <Text style={styles.saveButtonText}>{isSubmitting ? "로그인 중" : "로그인"}</Text>
          </Pressable>
          <Text style={styles.loginPresetLabel}>계정 빠른 입력</Text>
          <View style={styles.loginPresetRow}>
            <Pressable
              style={[styles.loginPresetButton, username === "dev1" && styles.loginPresetButtonActive]}
              onPress={() => {
                setUsername("dev1");
                setPassword("dev1");
                setMessage("");
              }}
            >
              <Text style={[styles.loginPresetText, username === "dev1" && styles.loginPresetTextActive]}>개발자</Text>
            </Pressable>
            <Pressable
              style={[styles.loginPresetButton, username === "bbunu" && styles.loginPresetButtonActive]}
              onPress={() => {
                setUsername("bbunu");
                setPassword("bbunu");
                setMessage("");
              }}
            >
              <Text style={[styles.loginPresetText, username === "bbunu" && styles.loginPresetTextActive]}>뿌나누나</Text>
            </Pressable>
          </View>
          {message ? <Text style={styles.errorText}>{message}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PetSetupScreen({
  displayName,
  onCreated,
  onLogout,
}: {
  displayName: string;
  onCreated: () => void;
  onLogout: () => void;
}) {
  const [name, setName] = useState("뿌나");
  const [birthDate, setBirthDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [conditions, setConditions] = useState("심장 관리, 신장 관리");
  const [cautionNotes, setCautionNotes] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function handleCreate() {
    if (!name.trim()) return;
    setSaveState("saving");
    const saved = await createPet({
      name: name.trim(),
      species: "dog",
      birth_date: birthDate.trim() || undefined,
      weight_kg: parseOptionalNumber(weightKg),
      conditions: conditions
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      caution_notes: cautionNotes.trim() || undefined,
    });
    setSaveState(saved ? "saved" : "error");
    if (saved) setTimeout(onCreated, 400);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.loginScreen}>
      <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
        <View style={styles.setupHeader}>
          <View style={styles.flex}>
            <Text style={styles.loginTitle}>강아지 등록</Text>
            <Text style={styles.loginSubtitle}>{displayName} 계정에 돌봄 대상을 연결해요</Text>
          </View>
          <Image source={ppunaImages.face} style={styles.headerImage} />
        </View>
        <View style={styles.loginCard}>
          <Text style={styles.resultLabel}>이름</Text>
          <FormInput value={name} onChangeText={setName} placeholder="예: 뿌나" />
          <Text style={styles.resultLabel}>생일</Text>
          <FormInput value={birthDate} onChangeText={setBirthDate} placeholder="예: 2012-03-14" />
          <Text style={styles.resultLabel}>몸무게</Text>
          <FormInput value={weightKg} onChangeText={setWeightKg} placeholder="예: 5.2" keyboardType="decimal-pad" />
          <Text style={styles.resultLabel}>건강 정보</Text>
          <FormInput value={conditions} onChangeText={setConditions} placeholder="예: 심장 관리, 신장 관리" />
          <Text style={styles.resultLabel}>주의사항</Text>
          <FormInput value={cautionNotes} onChangeText={setCautionNotes} placeholder="복약, 호흡 측정 기준 등을 적어요" multiline />
          <Pressable style={styles.saveButton} onPress={handleCreate} disabled={saveState === "saving"}>
            <Text style={styles.saveButtonText}>{saveState === "saving" ? "저장 중" : "등록하고 시작"}</Text>
          </Pressable>
          {saveState === "error" ? <Text style={styles.errorText}>저장에 실패했어요. API 연결을 확인해 주세요.</Text> : null}
        </View>
        <Pressable style={styles.logoutTextButton} onPress={onLogout}>
          <Text style={styles.removeText}>다른 계정으로 로그인</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HomeScreen({
  refreshKey,
  onMeasureBreathing,
  onCheckMedication,
  onCheckMeal,
  onAddHospital,
}: {
  refreshKey: number;
  onMeasureBreathing: () => void;
  onCheckMedication: () => void;
  onCheckMeal: () => void;
  onAddHospital: () => void;
}) {
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [summary, setSummary] = useState<CareSummary | null>(null);
  const [apiState, setApiState] = useState<"checking" | "connected" | "error">("checking");

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      setApiState("checking");
      const [nextPet, nextSummary] = await Promise.all([getCurrentPet(), getCareSummary()]);
      if (!isMounted) return;

      setPet(nextPet);
      setSummary(nextSummary);
      setApiState(nextPet && nextSummary ? "connected" : "error");
    }

    loadHomeData();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const isHomeLoading = apiState === "checking";
  const headerTitle = isHomeLoading ? "돌봄 기록을 불러오는 중" : pet ? `${pet.name}의 오늘` : "연결 필요";
  const fallbackStatus = apiState === "error" ? "불러오지 못했어요" : "기록 없음";
  const medicationStatus = isHomeLoading ? "불러오는 중..." : summary?.medication_status ?? fallbackStatus;
  const mealStatus = isHomeLoading ? "불러오는 중..." : summary?.meal_status ?? fallbackStatus;
  const latestBreathing = summary?.latest_breaths_per_minute;
  const monthlyExpense = summary?.monthly_expense ?? 0;
  const nextVisit = isHomeLoading
    ? "불러오는 중..."
    : summary?.next_visit_at
      ? formatDateTime(summary.next_visit_at)
      : apiState === "error"
        ? "불러오지 못했어요"
        : "예약 기록 없음";

  const homeRoutines = [
    { title: "저녁약", detail: medicationStatus, image: ppunaImages.medicine },
    { title: "저녁 식사", detail: mealStatus, image: ppunaImages.meal },
    {
      title: "호흡 측정",
      detail: isHomeLoading
        ? "불러오는 중..."
        : latestBreathing === null || latestBreathing === undefined
          ? apiState === "error" ? "불러오지 못했어요" : "호흡 기록 없음"
          : `${latestBreathing}회/분 최근 기록`,
      image: ppunaImages.sleep,
    },
    { title: "다음 예약", detail: nextVisit, image: ppunaImages.hospital },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header
        title={headerTitle}
        subtitle="약, 식사, 병원 기록을 가볍게 챙겨요"
        image={ppunaImages.face}
      />
      <View style={styles.connectionPill}>
        <Text style={styles.connectionText}>
          {apiState === "connected"
            ? "API 연결됨"
            : apiState === "checking"
              ? "서버에서 기록 불러오는 중"
              : "기록을 불러오지 못했어요"}
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View>
          <Text style={styles.eyebrow}>오늘의 루틴</Text>
          <Text style={styles.heroTitle}>놓치기 쉬운 돌봄을 작게 기록해요</Text>
        </View>
        <Image source={ppunaImages.face} style={styles.heroImage} />
      </View>

      <View style={styles.routineGrid}>
        {homeRoutines.map((item) => (
          <View style={styles.routineCard} key={item.title}>
            <Image source={item.image} style={styles.routineImage} />
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardCaption}>{item.detail}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>빠른 기록</Text>
      <View style={styles.quickActions}>
        <ActionButton label="숨 재기" tone="primary" onPress={onMeasureBreathing} />
        <ActionButton label="약 체크" tone="coral" onPress={onCheckMedication} />
        <ActionButton label="식사" tone="soft" onPress={onCheckMeal} />
        <ActionButton label="병원" tone="oat" onPress={onAddHospital} />
      </View>

      <Text style={styles.sectionTitle}>요약</Text>
      <View style={styles.summaryRow}>
        <SummaryCard
          title="최근 호흡"
          value={isHomeLoading
            ? "불러오는 중"
            : latestBreathing === null || latestBreathing === undefined
              ? apiState === "error" ? "확인 필요" : "기록 없음"
              : `${latestBreathing}회/분`}
          caption="DB 최신 기록"
          image={ppunaImages.sleep}
        />
        <SummaryCard
          title="이번 달 비용"
          value={isHomeLoading ? "불러오는 중" : apiState === "error" ? "확인 필요" : `${monthlyExpense.toLocaleString("ko-KR")}원`}
          caption="DB 누적"
          image={ppunaImages.expense}
        />
      </View>
    </ScrollView>
  );
}

function BreathingMeasureScreen({ onClose }: { onClose: (shouldRefresh?: boolean) => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const [duration, setDuration] = useState(30);
  const [remaining, setRemaining] = useState(30);
  const [count, setCount] = useState(0);
  const [coughObserved, setCoughObserved] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "local">("idle");

  useEffect(() => {
    if (!isRunning || remaining <= 0) return;

    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setIsRunning(false);
          setIsDone(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, remaining]);

  useEffect(() => {
    if (!isDone) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(timer);
  }, [isDone]);

  function reset(nextDuration = duration) {
    setDuration(nextDuration);
    setRemaining(nextDuration);
    setCount(0);
    setCoughObserved(false);
    setIsRunning(false);
    setIsDone(false);
    setSaveState("idle");
  }

  function handleTap() {
    if (isDone) return;
    if (!isRunning) setIsRunning(true);
    setCount((value) => value + 1);
  }

  async function handleSave() {
    setSaveState("saving");
    const saved = await createBreathingRecord({
      duration_seconds: duration,
      breath_count: count,
      cough_observed: coughObserved,
      memo: "앱에서 측정한 안정 시 호흡 수",
    });
    setSaveState(saved ? "saved" : "local");
    if (saved) setTimeout(() => onClose(true), 500);
  }

  const bpm = duration > 0 ? Math.round((count * 60) / duration) : 0;

  return (
    <View style={styles.breathingScreen}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        style={styles.breathingScroll}
        contentContainerStyle={styles.breathingMeasureContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.breathingHeader}>
          <Pressable onPress={() => onClose(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>←</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.breathingTitle}>호흡 수 측정</Text>
            <Text style={styles.breathingSubtitle}>잠든 뒤 안정 상태에서 숨쉴 때마다 탭해요</Text>
          </View>
          <Image source={ppunaImages.sleep} style={styles.breathingHeaderImage} />
        </View>

        <View style={styles.durationRow}>
          {[15, 30, 60].map((value) => (
            <Pressable
              key={value}
              onPress={() => reset(value)}
              style={[styles.durationChip, duration === value && styles.durationChipActive]}
            >
              <Text style={[styles.durationText, duration === value && styles.durationTextActive]}>{value}초</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.remainingLabel}>{isDone ? "측정 완료" : isRunning ? "측정 중" : "탭하면 시작해요"}</Text>
        <Text style={styles.remainingTime}>00:{String(remaining).padStart(2, "0")}</Text>

        <View style={styles.liveCoughCard}>
          <Text style={styles.liveCoughLabel}>측정 중 기침 여부</Text>
          <View style={styles.coughToggleRow}>
            <Pressable
              style={[styles.coughToggle, !coughObserved && styles.coughToggleActive]}
              onPress={() => setCoughObserved(false)}
            >
              <Text style={[styles.coughToggleText, !coughObserved && styles.coughToggleTextActive]}>기침 X</Text>
            </Pressable>
            <Pressable
              style={[styles.coughToggle, coughObserved && styles.coughToggleActive]}
              onPress={() => setCoughObserved(true)}
            >
              <Text style={[styles.coughToggleText, coughObserved && styles.coughToggleTextActive]}>기침 O</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.tapPanel} onPress={handleTap}>
          <Image source={ppunaImages.sleep} style={styles.tapImage} />
          <Text style={styles.tapCount}>{count}</Text>
          <Text style={styles.tapHint}>숨쉴 때마다 탭</Text>
        </Pressable>

        <View style={styles.breathingActions}>
          <Pressable style={styles.secondaryDarkButton} onPress={() => setCount((value) => Math.max(0, value - 1))}>
            <Text style={styles.darkButtonLabel}>되돌리기</Text>
          </Pressable>
          <Pressable style={styles.secondaryDarkButton} onPress={() => reset()}>
            <Text style={styles.darkButtonLabel}>다시 재기</Text>
          </Pressable>
        </View>

        {isDone ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>분당 호흡 수</Text>
            <Text style={styles.resultValue}>{bpm}회/분</Text>
            <Text style={styles.resultCaption}>
              {duration}초 동안 {count}회 측정
            </Text>
            <Text style={styles.resultCaption}>기침 {coughObserved ? "O" : "X"}로 저장됩니다</Text>
            <Pressable style={styles.saveButton} onPress={handleSave} disabled={saveState === "saving"}>
              <Text style={styles.saveButtonText}>{saveState === "saving" ? "저장 중" : "기록 저장"}</Text>
            </Pressable>
            <Text style={styles.saveStateText}>
              {saveState === "saved"
                ? "API에 저장됐어요"
                : saveState === "local"
                  ? "API 연결이 없어 화면에서만 확인했어요"
                  : " "}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MedicationCheckScreen({ onClose }: { onClose: (shouldRefresh?: boolean) => void }) {
  const [medicationName, setMedicationName] = useState("저녁약");
  const [dosageAmount, setDosageAmount] = useState("");
  const [dosageUnit, setDosageUnit] = useState("정");
  const [memo, setMemo] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let isMounted = true;
    getSuggestions().then((nextSuggestions) => {
      if (isMounted) setSuggestions(nextSuggestions);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    if (!medicationName.trim()) return;
    setSaveState("saving");
    const saved = await createMedicationLog({
      medication_name: medicationName.trim(),
      dosage: formatDosage(dosageAmount, dosageUnit),
      status: "completed",
      memo: memo.trim() || undefined,
    });
    setSaveState(saved ? "saved" : "error");
    if (saved) setTimeout(() => onClose(true), 500);
  }

  return (
    <QuickSaveLayout
      title="약 체크"
      subtitle="오늘 먹인 약을 바로 저장해요"
      image={ppunaImages.medicine}
      onClose={() => onClose(false)}
      saveState={saveState}
    >
      <View style={styles.quickSaveCard}>
        <Text style={styles.resultLabel}>약 종류</Text>
        <FormInput value={medicationName} onChangeText={setMedicationName} placeholder="예: 이뇨제, 심장약" />
        <SuggestionChips values={suggestions?.medication_names ?? []} onSelect={setMedicationName} />
        <Text style={styles.resultLabel}>용량</Text>
        <View style={styles.dosageRow}>
          <View style={styles.dosageInputWrap}>
            <FormInput value={dosageAmount} onChangeText={setDosageAmount} placeholder="예: 0.5" keyboardType="decimal-pad" />
          </View>
          <UnitSelector value={dosageUnit} onChange={setDosageUnit} />
        </View>
        <Text style={styles.resultLabel}>메모</Text>
        <FormInput value={memo} onChangeText={setMemo} placeholder="특이사항을 적어주세요" multiline />
        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saveState === "saving"}>
          <Text style={styles.saveButtonText}>{saveState === "saving" ? "저장 중" : "완료로 저장"}</Text>
        </Pressable>
      </View>
    </QuickSaveLayout>
  );
}

function MealCheckScreen({ onClose }: { onClose: (shouldRefresh?: boolean) => void }) {
  const [selected, setSelected] = useState("일부 섭취");
  const [mealType, setMealType] = useState("저녁");
  const [foodName, setFoodName] = useState("");
  const [foodGrams, setFoodGrams] = useState("");
  const [showWaterInput, setShowWaterInput] = useState(false);
  const [waterMl, setWaterMl] = useState("");
  const [memo, setMemo] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let isMounted = true;
    getSuggestions().then((nextSuggestions) => {
      if (isMounted) setSuggestions(nextSuggestions);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    setSaveState("saving");
    const saved = await createMealRecord({
      meal_type: mealType.trim() || "식사",
      food_name: foodName.trim() || undefined,
      food_grams: parseOptionalNumber(foodGrams),
      water_ml: showWaterInput ? parseOptionalNumber(waterMl) : undefined,
      amount_status: selected,
      memo: memo.trim() || undefined,
    });
    setSaveState(saved ? "saved" : "error");
    if (saved) setTimeout(() => onClose(true), 500);
  }

  return (
    <QuickSaveLayout
      title="식사 기록"
      subtitle="먹은 양만 빠르게 남겨요"
      image={ppunaImages.meal}
      onClose={() => onClose(false)}
      saveState={saveState}
    >
      <View style={styles.quickSaveCard}>
        <Text style={styles.resultLabel}>식사 구분</Text>
        <FormInput value={mealType} onChangeText={setMealType} placeholder="예: 아침, 저녁, 간식" />
        <Text style={styles.resultLabel}>사료 종류</Text>
        <FormInput value={foodName} onChangeText={setFoodName} placeholder="예: 신장 처방식 + 닭가슴살" />
        <SuggestionChips values={suggestions?.food_names ?? []} onSelect={setFoodName} />
        <Text style={styles.resultLabel}>사료 그램수</Text>
        <FormInput value={foodGrams} onChangeText={setFoodGrams} placeholder="예: 45" keyboardType="decimal-pad" />
        <Text style={styles.resultLabel}>먹은 양</Text>
        <View style={styles.choiceRow}>
          {["전부 먹음", "일부 섭취", "거부"].map((label) => (
            <Pressable
              key={label}
              onPress={() => setSelected(label)}
              style={[styles.choiceChip, selected === label && styles.choiceChipActive]}
            >
              <Text style={[styles.choiceText, selected === label && styles.choiceTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {showWaterInput ? (
          <>
            <View style={styles.inlineFormHeader}>
              <Text style={styles.resultLabel}>음수량</Text>
              <Pressable onPress={() => {
                setShowWaterInput(false);
                setWaterMl("");
              }}>
                <Text style={styles.removeText}>닫기</Text>
              </Pressable>
            </View>
            <FormInput value={waterMl} onChangeText={setWaterMl} placeholder="예: 120" keyboardType="decimal-pad" />
            <Text style={styles.formHint}>ml 단위로 저장돼요. 측정하지 못했으면 비워둬도 괜찮아요.</Text>
          </>
        ) : (
          <Pressable style={styles.optionalAddButton} onPress={() => setShowWaterInput(true)}>
            <Text style={styles.optionalAddText}>+ 음수량 추가하기</Text>
          </Pressable>
        )}
        <Text style={styles.resultLabel}>메모</Text>
        <FormInput value={memo} onChangeText={setMemo} placeholder="섞어준 것, 남긴 양, 반응 등을 적어요" multiline />
        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saveState === "saving"}>
          <Text style={styles.saveButtonText}>{saveState === "saving" ? "저장 중" : "식사 저장"}</Text>
        </Pressable>
      </View>
    </QuickSaveLayout>
  );
}

function HospitalQuickScreen({ onClose }: { onClose: (shouldRefresh?: boolean) => void }) {
  const [hospitalName, setHospitalName] = useState("");
  const [reason, setReason] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescriptionNote, setPrescriptionNote] = useState("");
  const [medicationItems, setMedicationItems] = useState<MedicationDraft[]>([
    { name: "", dosageAmount: "", dosageUnit: "정" },
  ]);
  const [selectedVisitDate, setSelectedVisitDate] = useState<string | null>(null);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [totalCost, setTotalCost] = useState("");
  const [memo, setMemo] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let isMounted = true;
    getSuggestions().then((nextSuggestions) => {
      if (isMounted) setSuggestions(nextSuggestions);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  function updateMedicationItem(index: number, patch: Partial<MedicationDraft>) {
    setMedicationItems((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function addMedicationItem() {
    setMedicationItems((items) => [...items, { name: "", dosageAmount: "", dosageUnit: "정" }]);
  }

  function removeMedicationItem(index: number) {
    setMedicationItems((items) => (items.length === 1 ? items : items.filter((_, itemIndex) => itemIndex !== index)));
  }

  async function pickAttachments() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;

    setAttachments((items) => [
      ...items,
      ...result.assets.map((asset) => ({
        name: asset.name,
        uri: asset.uri,
        mime_type: asset.mimeType ?? null,
        size: asset.size ?? null,
      })),
    ]);
  }

  async function handleSave() {
    if (!hospitalName.trim() || !reason.trim()) return;
    setSaveState("saving");
    const saved = await createHospitalVisit({
      hospital_name: hospitalName.trim(),
      reason: reason.trim(),
      diagnosis: diagnosis.trim() || undefined,
      prescription_note: prescriptionNote.trim() || undefined,
      medication_items: medicationItems
        .map((item) => ({ name: item.name.trim(), dosage: formatDosage(item.dosageAmount, item.dosageUnit) }))
        .filter((item) => item.name),
      attachments: attachments.map((item) => ({
        name: item.name,
        uri: item.uri,
        mime_type: item.mime_type,
        size: item.size,
      })),
      next_visit_at: selectedVisitDate ? `${selectedVisitDate}T09:00:00` : undefined,
      next_visit_interval_weeks: recurrenceWeeks ?? undefined,
      total_cost: parseOptionalNumber(totalCost) ?? 0,
      memo: memo.trim() || undefined,
    });
    setSaveState(saved ? "saved" : "error");
    if (saved) setTimeout(() => onClose(true), 500);
  }

  return (
    <QuickSaveLayout
      title="병원 기록"
      subtitle="방문 기록을 먼저 남겨두고 나중에 영수증과 수치를 붙여요"
      image={ppunaImages.hospital}
      onClose={() => onClose(false)}
      saveState={saveState}
    >
      <View style={styles.quickSaveCard}>
        <Text style={styles.resultLabel}>병원명</Text>
        <FormInput value={hospitalName} onChangeText={setHospitalName} placeholder="예: 마음동물병원" />
        <SuggestionChips values={suggestions?.hospital_names ?? []} onSelect={setHospitalName} />
        <Text style={styles.resultLabel}>진료 사유</Text>
        <FormInput value={reason} onChangeText={setReason} placeholder="예: 정기 검진, 기침 상담" />
        <Text style={styles.resultLabel}>소견 / 수치</Text>
        <FormInput value={diagnosis} onChangeText={setDiagnosis} placeholder="검사 수치나 선생님 소견" multiline />
        <Text style={styles.resultLabel}>처방 메모</Text>
        <FormInput value={prescriptionNote} onChangeText={setPrescriptionNote} placeholder="약 종류, 용량, 처방식" multiline />
        <View style={styles.formSectionHeader}>
          <Text style={styles.resultLabel}>처방 약</Text>
          <Pressable style={styles.addTinyButton} onPress={addMedicationItem}>
            <Text style={styles.addTinyButtonText}>+</Text>
          </Pressable>
        </View>
        {medicationItems.map((item, index) => (
          <View key={`hospital-med-${index}`} style={styles.medicationSetCard}>
            <View style={styles.medicationSetHeader}>
              <Text style={styles.cardTitle}>약 {index + 1}</Text>
              {medicationItems.length > 1 ? (
                <Pressable onPress={() => removeMedicationItem(index)}>
                  <Text style={styles.removeText}>삭제</Text>
                </Pressable>
              ) : null}
            </View>
            <FormInput
              value={item.name}
              onChangeText={(value) => updateMedicationItem(index, { name: value })}
              placeholder="약 종류"
            />
            <SuggestionChips values={suggestions?.medication_names ?? []} onSelect={(value) => updateMedicationItem(index, { name: value })} />
            <FormInput
              value={item.dosageAmount}
              onChangeText={(value) => updateMedicationItem(index, { dosageAmount: value })}
              placeholder="용량 숫자"
              keyboardType="decimal-pad"
            />
            <UnitSelector value={item.dosageUnit} onChange={(value) => updateMedicationItem(index, { dosageUnit: value })} />
          </View>
        ))}
        <Text style={styles.resultLabel}>사용한 돈</Text>
        <FormInput
          value={totalCost}
          onChangeText={(value) => setTotalCost(formatCurrencyInput(value))}
          placeholder="예: 182,000"
          keyboardType="number-pad"
        />
        <Text style={styles.resultLabel}>다음 예약</Text>
        <CalendarPicker selectedDate={selectedVisitDate} onSelectDate={setSelectedVisitDate} />
        <Text style={styles.resultLabel}>반복 주기</Text>
        <RecurrenceSelector value={recurrenceWeeks} onChange={setRecurrenceWeeks} />
        <Text style={styles.resultLabel}>첨부파일</Text>
        <Pressable style={styles.attachmentButton} onPress={pickAttachments}>
          <Text style={styles.attachmentButtonText}>영수증 / 검사지를 추가</Text>
        </Pressable>
        {attachments.map((item, index) => (
          <View key={`${item.uri}-${index}`} style={styles.attachmentRow}>
            <Text style={styles.attachmentName}>{item.name}</Text>
            <Pressable onPress={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
              <Text style={styles.removeText}>삭제</Text>
            </Pressable>
          </View>
        ))}
        <Text style={styles.resultLabel}>메모</Text>
        <FormInput value={memo} onChangeText={setMemo} placeholder="영수증, 주의사항, 질문거리" multiline />
        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saveState === "saving"}>
          <Text style={styles.saveButtonText}>{saveState === "saving" ? "저장 중" : "병원 기록 저장"}</Text>
        </Pressable>
      </View>
    </QuickSaveLayout>
  );
}

function QuickSaveLayout({
  title,
  subtitle,
  image,
  onClose,
  saveState,
  children,
}: {
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  onClose: () => void;
  saveState: SaveState;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.breathingScreen}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.quickSaveContent} keyboardShouldPersistTaps="handled">
        <View style={styles.breathingHeader}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>←</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.breathingTitle}>{title}</Text>
            <Text style={styles.breathingSubtitle}>{subtitle}</Text>
          </View>
          <Image source={image} style={styles.breathingHeaderImage} />
        </View>
        {children}
        <Text style={styles.quickSaveState}>
          {saveState === "saved" ? "DB에 저장됐어요" : saveState === "error" ? "API 연결을 확인해 주세요" : " "}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormInput({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  secureTextEntry = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  multiline?: boolean;
  secureTextEntry?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType={keyboardType}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
      style={[styles.formInput, multiline && styles.formInputMultiline]}
    />
  );
}

function SuggestionChips({ values, onSelect }: { values: string[]; onSelect: (value: string) => void }) {
  const visibleValues = values.filter(Boolean).slice(0, 8);
  if (visibleValues.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
      {visibleValues.map((value) => (
        <Pressable key={value} style={styles.suggestionChip} onPress={() => onSelect(value)}>
          <Text style={styles.suggestionText}>{value}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function UnitSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.unitSelector}>
      {dosageUnits.map((unit) => (
        <Pressable
          key={unit}
          style={[styles.unitOption, value === unit && styles.unitOptionActive]}
          onPress={() => onChange(unit)}
        >
          <Text style={[styles.unitText, value === unit && styles.unitTextActive]}>{unit}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function RecurrenceSelector({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <View style={styles.recurrenceRow}>
      {recurrenceOptions.map((option) => (
        <Pressable
          key={option.label}
          style={[styles.recurrenceChip, value === option.value && styles.recurrenceChipActive]}
          onPress={() => onChange(option.value)}
        >
          <Text style={[styles.recurrenceText, value === option.value && styles.recurrenceTextActive]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function CalendarPicker({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string | null;
  onSelectDate: (value: string | null) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const days = buildCalendarDays(visibleMonth);
  const monthLabel = visibleMonth.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

  function moveMonth(amount: number) {
    setVisibleMonth((date) => new Date(date.getFullYear(), date.getMonth() + amount, 1));
  }

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Pressable style={styles.calendarNavButton} onPress={() => moveMonth(-1)}>
          <Text style={styles.calendarNavText}>‹</Text>
        </Pressable>
        <Text style={styles.calendarTitle}>{monthLabel}</Text>
        <Pressable style={styles.calendarNavButton} onPress={() => moveMonth(1)}>
          <Text style={styles.calendarNavText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <Text key={day} style={styles.weekText}>{day}</Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {days.map((day, index) =>
          day ? (
            <Pressable
              key={day.iso}
              style={[styles.calendarDay, selectedDate === day.iso && styles.calendarDayActive]}
              onPress={() => onSelectDate(selectedDate === day.iso ? null : day.iso)}
            >
              <Text style={[styles.calendarDayText, selectedDate === day.iso && styles.calendarDayTextActive]}>
                {day.label}
              </Text>
            </Pressable>
          ) : (
            <View key={`empty-${index}`} style={styles.calendarDay} />
          ),
        )}
      </View>
      <Text style={styles.calendarSelectedText}>
        {selectedDate ? `${selectedDate} 오전 9:00 예약으로 저장` : "예약일을 선택하지 않아도 돼요"}
      </Text>
    </View>
  );
}

function RecordsScreen({ refreshKey }: { refreshKey: number }) {
  const [period, setPeriod] = useState<RecordPeriod>("today");
  const [kind, setKind] = useState<RecordKind>("all");
  const [breathingStats, setBreathingStats] = useState<BreathingStats | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [items, setItems] = useState<
    Array<{
      id: string;
      image: ImageSourcePropType;
      kind: RecordKind;
      type: string;
      title: string;
      detail: string;
      time: string;
      sortAt: string;
    }>
  >([]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecords() {
      setLoadState("loading");
      const statsDays = period === "30d" ? 30 : 7;
      const [breathing, medications, meals, visits, nextStats] = await Promise.all([
        getBreathingRecords(),
        getMedicationLogs(),
        getMealRecords(),
        getHospitalVisits(),
        kind === "breathing" && period !== "today" ? getBreathingStats(statsDays) : Promise.resolve(null),
      ]);
      if (!isMounted) return;

      if (!breathing || !medications || !meals || !visits) {
        setLoadState("error");
        return;
      }

      const nextItems = [
        ...(breathing ?? []).map((item) => ({
          id: item.id,
          image: ppunaImages.sleep,
          kind: "breathing" as RecordKind,
          type: "숨",
          title: `${item.breaths_per_minute}회/분`,
          detail: `${item.duration_seconds}초 동안 ${item.breath_count}회 · 기침 ${item.cough_observed ? "O" : "X"}`,
          time: formatTime(item.measured_at),
          sortAt: item.measured_at,
        })),
        ...(medications ?? []).map((item) => ({
          id: item.id,
          image: ppunaImages.medicine,
          kind: "medication" as RecordKind,
          type: "약",
          title: `${item.medication_name} ${item.status === "completed" ? "완료" : item.status}`,
          detail: [item.dosage, item.memo].filter(Boolean).join(" · ") || "메모 없음",
          time: formatTime(item.logged_at),
          sortAt: item.logged_at,
        })),
        ...(meals ?? []).map((item) => ({
          id: item.id,
          image: ppunaImages.meal,
          kind: "meal" as RecordKind,
          type: "식사",
          title: `${item.meal_type} ${item.amount_status}`,
          detail:
            [
              item.food_name,
              item.food_grams === null || item.food_grams === undefined ? null : `${item.food_grams}g`,
              item.water_ml === null || item.water_ml === undefined ? null : `물 ${item.water_ml}ml`,
              item.memo,
            ]
              .filter(Boolean)
              .join(" · ") || "메모 없음",
          time: formatTime(item.logged_at),
          sortAt: item.logged_at,
        })),
        ...(visits ?? []).map((item) => ({
          id: item.id,
          image: ppunaImages.hospital,
          kind: "hospital" as RecordKind,
          type: "병원",
          title: item.reason,
          detail: [
            item.hospital_name,
            item.diagnosis,
            item.medication_items.length ? `약 ${item.medication_items.length}개` : null,
            item.attachments.length ? `첨부 ${item.attachments.length}개` : null,
            `${item.total_cost.toLocaleString("ko-KR")}원`,
          ]
            .filter(Boolean)
            .join(" · "),
          time: formatDate(item.visited_at),
          sortAt: item.visited_at,
        })),
      ].sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());

      setItems(nextItems);
      setBreathingStats(nextStats);
      setLoadState("ready");
    }

    loadRecords();
    return () => {
      isMounted = false;
    };
  }, [refreshKey, kind, period]);

  const filteredItems = items.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    return isWithinRecordPeriod(item.sortAt, period);
  });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="기록" subtitle="날짜별로 상태 변화를 모아요" image={ppunaImages.sleep} />
      <Segmented
        labels={["오늘", "7일", "30일"]}
        activeIndex={["today", "7d", "30d"].indexOf(period)}
        onChange={(index) => setPeriod((["today", "7d", "30d"] as const)[index])}
      />
      <Segmented
        labels={["전체", "호흡", "약", "식사", "병원"]}
        activeIndex={["all", "breathing", "medication", "meal", "hospital"].indexOf(kind)}
        onChange={(index) => setKind((["all", "breathing", "medication", "meal", "hospital"] as const)[index])}
      />
      {kind === "breathing" && period !== "today" && loadState === "ready" ? <BreathingStatsCard stats={breathingStats} /> : null}
      {loadState === "loading" ? (
        <DataState title="기록을 불러오는 중이에요" detail="서버가 깨어나는 동안 잠시만 기다려 주세요." />
      ) : loadState === "error" ? (
        <DataState title="기록을 불러오지 못했어요" detail="잠시 후 화면을 다시 열어 주세요." />
      ) : filteredItems.length === 0 ? (
        <EmptyState image={ppunaImages.face} title="아직 기록이 없어요" detail="빠른 기록으로 첫 데이터를 남겨보세요." />
      ) : (
        filteredItems.map((item) => (
          <TimelineItem
            key={`${item.type}-${item.id}`}
            image={item.image}
            type={item.type}
            title={item.title}
            detail={item.detail}
            time={item.time}
          />
        ))
      )}
    </ScrollView>
  );
}

function HospitalScreen({ refreshKey }: { refreshKey: number }) {
  const [visits, setVisits] = useState<HospitalVisit[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadVisits() {
      setLoadState("loading");
      const nextVisits = await getHospitalVisits();
      if (!isMounted) return;
      if (!nextVisits) {
        setLoadState("error");
        return;
      }
      setVisits(nextVisits);
      setLoadState("ready");
    }

    loadVisits();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const nextVisit = visits.find((visit) => visit.next_visit_at);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="병원" subtitle="예약과 방문 기록을 정리해요" image={ppunaImages.hospital} />
      <View style={styles.appointmentCard}>
        <Image source={ppunaImages.hospital} style={styles.appointmentImage} />
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>다음 예약</Text>
          <Text style={styles.cardValue}>
            {loadState === "loading" ? "불러오는 중" : loadState === "error" ? "확인 필요" : nextVisit?.next_visit_at ? formatDateTime(nextVisit.next_visit_at) : "예약 기록 없음"}
          </Text>
          <Text style={styles.cardCaption}>
            {loadState === "loading" ? "서버에서 예약을 확인하고 있어요" : loadState === "error" ? "예약을 불러오지 못했어요" : nextVisit ? `${nextVisit.hospital_name} · ${nextVisit.reason}` : "병원 기록에서 다음 예약을 추가할 예정이에요"}
          </Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>최근 방문</Text>
      {loadState === "loading" ? (
        <DataState title="병원 기록을 불러오는 중이에요" detail="잠시만 기다려 주세요." />
      ) : loadState === "error" ? (
        <DataState title="병원 기록을 불러오지 못했어요" detail="잠시 후 다시 확인해 주세요." />
      ) : visits.length === 0 ? (
        <EmptyState image={ppunaImages.hospital} title="병원 기록 없음" detail="빠른 기록에서 첫 방문 기록을 저장해 보세요." />
      ) : (
        visits.map((visit) => (
          <VisitCard
            key={visit.id}
            date={formatDate(visit.visited_at)}
            title={visit.hospital_name}
            reason={visit.reason}
            cost={`${visit.total_cost.toLocaleString("ko-KR")}원`}
          />
        ))
      )}
    </ScrollView>
  );
}

function ExpensesScreen({ refreshKey }: { refreshKey: number }) {
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadExpense() {
      setLoadState("loading");
      const nextSummary = await getExpenseSummary();
      if (!isMounted) return;
      setSummary(nextSummary);
      setLoadState(nextSummary ? "ready" : "error");
    }

    loadExpense();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const total = summary?.total_amount ?? 0;
  const categories = Object.entries(summary?.categories ?? {}).filter(([, value]) => value > 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="비용" subtitle="병원비 흐름을 차분하게 확인해요" image={ppunaImages.expense} />
      <View style={styles.totalCard}>
        <Image source={ppunaImages.expense} style={styles.totalImage} />
        <View>
          <Text style={styles.eyebrow}>{loadState === "loading" ? "DB 확인 중" : summary?.month ?? "DB 연결 필요"}</Text>
          <Text style={styles.totalValue}>{loadState === "loading" ? "불러오는 중" : loadState === "error" ? "확인 필요" : `${total.toLocaleString("ko-KR")}원`}</Text>
          <Text style={styles.cardCaption}>이번 달 총액</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>카테고리</Text>
      {loadState === "loading" ? (
        <DataState title="비용 기록을 불러오는 중이에요" detail="잠시만 기다려 주세요." />
      ) : loadState === "error" ? (
        <DataState title="비용 기록을 불러오지 못했어요" detail="잠시 후 다시 확인해 주세요." />
      ) : categories.length === 0 ? (
        <EmptyState image={ppunaImages.expense} title="비용 기록 없음" detail="병원 기록에 비용을 입력하면 여기에 모여요." />
      ) : (
        categories.map(([label, value], index) => (
          <ExpenseBar
            key={label}
            label={label}
            value={`${value.toLocaleString("ko-KR")}원`}
            width={`${Math.max(8, Math.round((value / Math.max(total, 1)) * 100))}%` as `${number}%`}
            color={[colors.sage, colors.yellow, colors.coral, colors.oat][index % 4]}
          />
        ))
      )}
    </ScrollView>
  );
}

function ProfileScreen({
  refreshKey,
  session,
  onLogout,
}: {
  refreshKey: number;
  session: AuthSession | null;
  onLogout: () => void;
}) {
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadPet() {
      setLoadState("loading");
      const nextPet = await getCurrentPet();
      if (!isMounted) return;
      setPet(nextPet);
      setLoadState(nextPet ? "ready" : "error");
    }

    loadPet();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  async function handleExport() {
    const url = getExportExcelUrl();
    if (!url) return;
    await Linking.openURL(url);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="프로필" subtitle="기본 정보를 DB에서 불러와요" image={ppunaImages.face} />
      <View style={styles.connectionPill}>
        <Text style={styles.connectionText}>{session ? `${session.display_name} 로그인 중` : "로그인 정보 없음"}</Text>
      </View>
      <View style={styles.profileCard}>
        <Image source={ppunaImages.face} style={styles.profileImage} />
        <View style={styles.flex}>
          <Text style={styles.profileName}>{loadState === "loading" ? "불러오는 중" : pet?.name ?? "연결 필요"}</Text>
          <Text style={styles.cardCaption}>
            {loadState === "loading" ? "프로필을 확인하고 있어요" : pet ? `${pet.species === "dog" ? "강아지" : pet.species} · ${pet.weight_kg ?? "-"}kg` : "API 연결을 확인해 주세요"}
          </Text>
          <Text style={styles.condition}>
            {loadState === "loading"
              ? "건강 정보를 불러오는 중"
              : loadState === "error"
                ? "건강 정보를 불러오지 못했어요"
                : pet?.conditions.length
                  ? pet.conditions.join(", ")
                  : "건강 정보 없음"}
          </Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>건강 정보</Text>
      <InfoRow label="주요 질환" value={loadState === "loading" ? "불러오는 중..." : loadState === "error" ? "불러오지 못했어요" : pet?.conditions.join(", ") || "정보 없음"} />
      <InfoRow label="주의사항" value={loadState === "loading" ? "불러오는 중..." : loadState === "error" ? "불러오지 못했어요" : pet?.caution_notes ?? "정보 없음"} />
      <InfoRow label="생일" value={loadState === "loading" ? "불러오는 중..." : loadState === "error" ? "불러오지 못했어요" : pet?.birth_date ?? "정보 없음"} />
      <Text style={styles.sectionTitle}>설정</Text>
      <SettingRow label="알림" />
      <SettingRow label="데이터 내보내기" onPress={handleExport} />
      <SettingRow label="보호자 공유" />
      <SettingRow label="로그아웃" onPress={onLogout} />
    </ScrollView>
  );
}

function Header({
  title,
  subtitle,
  image,
}: {
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.flex}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Image source={image} style={styles.headerImage} />
    </View>
  );
}

function ActionButton({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: "primary" | "coral" | "soft" | "oat";
  onPress?: () => void;
}) {
  const style = {
    primary: styles.primaryButton,
    coral: styles.coralButton,
    soft: styles.softButton,
    oat: styles.oatButton,
  }[tone];
  const textStyle = tone === "primary" || tone === "coral" ? styles.lightButtonText : styles.darkButtonText;

  return (
    <Pressable style={[styles.actionButton, style]} onPress={onPress}>
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

function SummaryCard({
  title,
  value,
  caption,
  image,
}: {
  title: string;
  value: string;
  caption: string;
  image: ImageSourcePropType;
}) {
  return (
    <View style={styles.summaryCard}>
      <Image source={image} style={styles.summaryImage} />
      <Text style={styles.cardCaption}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardCaption}>{caption}</Text>
    </View>
  );
}

function Segmented({
  labels,
  activeIndex = 0,
  onChange,
}: {
  labels: string[];
  activeIndex?: number;
  onChange?: (index: number) => void;
}) {
  return (
    <View style={styles.segmented}>
      {labels.map((label, index) => (
        <Pressable
          key={label}
          onPress={() => onChange?.(index)}
          style={[styles.segment, index === activeIndex && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, index === activeIndex && styles.segmentTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function BreathingStatsCard({ stats }: { stats: BreathingStats | null }) {
  const average = stats?.average_breaths_per_minute;
  const previous = stats?.previous_average_breaths_per_minute;

  return (
    <View style={styles.analysisCard}>
      <View style={styles.analysisTop}>
        <Image source={ppunaImages.sleep} style={styles.analysisImage} />
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>{stats?.days ?? "-"}일 호흡 평균</Text>
          <Text style={styles.analysisValue}>
            {average === null || average === undefined ? "기록 없음" : `평균 ${formatNumber(average)}회/분`}
          </Text>
          <Text style={styles.cardCaption}>{stats?.comparison_label ?? "호흡 기록을 저장하면 비교가 보여요"}</Text>
        </View>
      </View>
      <View style={styles.analysisMetaRow}>
        <Text style={styles.analysisMeta}>현재 {stats?.record_count ?? 0}건</Text>
        <Text style={styles.analysisMeta}>
          이전 {previous === null || previous === undefined ? "기록 없음" : `${formatNumber(previous)}회/분`}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ image, title, detail }: { image: ImageSourcePropType; title: string; detail: string }) {
  return (
    <View style={styles.emptyState}>
      <Image source={image} style={styles.emptyImage} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardCaption}>{detail}</Text>
    </View>
  );
}

function DataState({ title, detail }: { title: string; detail: string }) {
  return <EmptyState image={ppunaImages.face} title={title} detail={detail} />;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.cardCaption}>{value}</Text>
      </View>
    </View>
  );
}

function TimelineItem({
  image,
  type,
  title,
  detail,
  time,
}: {
  image: ImageSourcePropType;
  type: string;
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <View style={styles.timelineCard}>
      <Image source={image} style={styles.timelineImage} />
      <View style={styles.flex}>
        <Text style={styles.timelineType}>{type}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCaption}>{detail}</Text>
      </View>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

function VisitCard({ date, title, reason, cost }: { date: string; title: string; reason: string; cost: string }) {
  return (
    <View style={styles.visitCard}>
      <Image source={ppunaImages.hospital} style={styles.visitImage} />
      <View style={styles.flex}>
        <Text style={styles.timelineType}>{date}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCaption}>{reason}</Text>
      </View>
      <Text style={styles.cost}>{cost}</Text>
    </View>
  );
}

function ExpenseBar({ label, value, width, color }: { label: string; value: string; width: `${number}%`; color: string }) {
  return (
    <View style={styles.expenseRow}>
      <View style={styles.expenseTop}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.cardCaption}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function SettingRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.settingRow} onPress={onPress}>
      <Text style={styles.cardTitle}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable key={tab.key} style={styles.tabItem} onPress={() => onChange(tab.key)}>
            <Text style={[styles.tabIcon, isActive && styles.tabActive]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, isActive && styles.tabActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function parseOptionalNumber(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) && value.trim() ? parsed : undefined;
}

function formatDosage(amount: string, unit: string) {
  const cleanAmount = amount.trim();
  return cleanAmount ? `${cleanAmount}${unit}` : undefined;
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Array<{ iso: string; label: number } | null> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    days.push({
      iso: formatDateInput(date),
      label: day,
    });
  }

  return days;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWithinRecordPeriod(value: string, period: RecordPeriod) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  if (period === "today") {
    return date.toDateString() === now.toDateString();
  }

  const days = period === "7d" ? 7 : 30;
  const start = new Date(now);
  start.setDate(now.getDate() - days);
  return date >= start && date <= now;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.paper,
    overflow: "hidden",
  },
  phone: {
    flex: 1,
    backgroundColor: colors.paper,
    minHeight: 0,
    overflow: "hidden",
  },
  screen: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  loginScreen: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  loginContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  loginImage: {
    alignSelf: "center",
    height: 116,
    marginBottom: 18,
    width: 116,
  },
  loginTitle: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  loginSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 8,
    textAlign: "center",
  },
  loginCard: {
    backgroundColor: colors.ivory,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  loginPresetLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 16,
    textAlign: "center",
  },
  loginPresetRow: {
    flexDirection: "row",
    gap: 10,
  },
  loginPresetButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: "center",
  },
  loginPresetButtonActive: {
    backgroundColor: colors.mint,
    borderColor: colors.sageDark,
  },
  loginPresetText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  loginPresetTextActive: {
    color: colors.sageDark,
  },
  setupHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  logoutTextButton: {
    alignItems: "center",
    marginTop: 16,
    padding: 12,
  },
  errorText: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  content: {
    padding: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 20,
  },
  flex: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  headerImage: {
    height: 58,
    width: 58,
  },
  connectionPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.mint,
    borderRadius: 999,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  connectionText: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: "800",
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: colors.ivory,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 18,
  },
  eyebrow: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 27,
    maxWidth: 190,
  },
  heroImage: {
    height: 98,
    width: 98,
  },
  routineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  routineCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 118,
    padding: 12,
    width: "48%",
  },
  routineImage: {
    height: 46,
    marginBottom: 6,
    width: 46,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  cardCaption: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 24,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
    width: "48%",
  },
  primaryButton: {
    backgroundColor: colors.sageDark,
  },
  coralButton: {
    backgroundColor: colors.coral,
  },
  softButton: {
    backgroundColor: colors.mint,
  },
  oatButton: {
    backgroundColor: colors.oat,
  },
  lightButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  darkButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 128,
    padding: 14,
  },
  summaryImage: {
    height: 42,
    position: "absolute",
    right: 12,
    top: 12,
    width: 42,
  },
  cardValue: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 6,
  },
  segmented: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  segment: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: colors.mint,
    borderColor: colors.mint,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: colors.sageDark,
  },
  analysisCard: {
    backgroundColor: colors.ivory,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  analysisTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  analysisImage: {
    height: 58,
    width: 58,
  },
  analysisValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  analysisMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  analysisMeta: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timelineCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  timelineImage: {
    height: 48,
    width: 48,
  },
  timelineType: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
  },
  emptyImage: {
    height: 78,
    marginBottom: 10,
    width: 78,
  },
  time: {
    color: colors.muted,
    fontSize: 12,
  },
  appointmentCard: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: 12,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  appointmentImage: {
    height: 66,
    width: 66,
  },
  visitCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  visitImage: {
    height: 48,
    width: 48,
  },
  cost: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  totalCard: {
    alignItems: "center",
    backgroundColor: colors.ivory,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    padding: 18,
  },
  totalImage: {
    height: 74,
    width: 74,
  },
  totalValue: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
  },
  expenseRow: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  expenseTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  barTrack: {
    backgroundColor: colors.paper,
    borderRadius: 999,
    height: 9,
    overflow: "hidden",
  },
  barFill: {
    borderRadius: 999,
    height: 9,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: 14,
    flexDirection: "row",
    gap: 16,
    padding: 16,
  },
  profileImage: {
    height: 82,
    width: 82,
  },
  profileName: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
  },
  condition: {
    color: colors.sageDark,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  settingRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 16,
  },
  chevron: {
    color: colors.muted,
    fontSize: 22,
  },
  tabBar: {
    backgroundColor: colors.ivory,
    borderColor: colors.line,
    borderTopWidth: 1,
    flexShrink: 0,
    flexDirection: "row",
    height: 82,
  },
  tabItem: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  tabIcon: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: "800",
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  tabActive: {
    color: colors.sageDark,
  },
  breathingScreen: {
    backgroundColor: colors.dark,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  breathingScroll: {
    flex: 1,
  },
  breathingMeasureContent: {
    padding: 24,
    paddingBottom: 40,
    paddingTop: 58,
  },
  breathingHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginBottom: 26,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#253833",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeButtonText: {
    color: colors.surface,
    fontSize: 19,
    fontWeight: "900",
  },
  breathingTitle: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900",
  },
  breathingSubtitle: {
    color: "#C9D9D0",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  breathingHeaderImage: {
    height: 58,
    width: 58,
  },
  durationRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 30,
  },
  durationChip: {
    alignItems: "center",
    backgroundColor: "#253833",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  durationChipActive: {
    backgroundColor: colors.sageDark,
  },
  durationText: {
    color: "#C9D9D0",
    fontSize: 13,
    fontWeight: "900",
  },
  durationTextActive: {
    color: colors.surface,
  },
  remainingLabel: {
    color: "#C9D9D0",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  remainingTime: {
    color: colors.surface,
    fontSize: 58,
    fontWeight: "900",
    marginBottom: 24,
    marginTop: 8,
    textAlign: "center",
  },
  tapPanel: {
    alignItems: "center",
    backgroundColor: colors.ivory,
    borderRadius: 24,
    minHeight: 250,
    justifyContent: "center",
    padding: 24,
  },
  tapImage: {
    height: 104,
    width: 156,
  },
  tapCount: {
    color: colors.sageDark,
    fontSize: 58,
    fontWeight: "900",
    marginTop: 4,
  },
  tapHint: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  breathingActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  secondaryDarkButton: {
    alignItems: "center",
    backgroundColor: "#253833",
    borderRadius: 10,
    flex: 1,
    height: 46,
    justifyContent: "center",
  },
  darkButtonLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  resultCard: {
    backgroundColor: colors.ivory,
    borderRadius: 16,
    marginTop: 18,
    padding: 18,
  },
  quickSaveCard: {
    backgroundColor: colors.ivory,
    borderRadius: 16,
    padding: 18,
  },
  quickSaveContent: {
    padding: 24,
    paddingBottom: 40,
    paddingTop: 58,
  },
  formInput: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
    marginTop: 8,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  formInputMultiline: {
    minHeight: 82,
    textAlignVertical: "top",
  },
  suggestionRow: {
    gap: 8,
    paddingBottom: 10,
  },
  suggestionChip: {
    backgroundColor: colors.mint,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  suggestionText: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: "900",
  },
  dosageRow: {
    gap: 8,
  },
  dosageInputWrap: {
    width: "100%",
  },
  unitSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 12,
  },
  unitOption: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unitOptionActive: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  unitText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  unitTextActive: {
    color: colors.surface,
  },
  recurrenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
    marginTop: 8,
  },
  recurrenceChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  recurrenceChipActive: {
    backgroundColor: colors.mint,
    borderColor: colors.sageDark,
  },
  recurrenceText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  recurrenceTextActive: {
    color: colors.sageDark,
  },
  formSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  inlineFormHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  optionalAddButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 10,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    marginBottom: 14,
    marginTop: 4,
  },
  optionalAddText: {
    color: colors.sageDark,
    fontSize: 14,
    fontWeight: "900",
  },
  formHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
    marginTop: -6,
  },
  addTinyButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  addTinyButtonText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  medicationSetCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  medicationSetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  removeText: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: "900",
  },
  attachmentButton: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    marginBottom: 10,
    marginTop: 8,
  },
  attachmentButtonText: {
    color: colors.sageDark,
    fontSize: 14,
    fontWeight: "900",
  },
  attachmentRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attachmentName: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    marginRight: 8,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    marginTop: 8,
    padding: 12,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calendarNavButton: {
    alignItems: "center",
    backgroundColor: colors.ivory,
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  calendarNavText: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  calendarTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekText: {
    color: colors.muted,
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  calendarDay: {
    alignItems: "center",
    borderRadius: 9,
    height: 34,
    justifyContent: "center",
    width: `${100 / 7}%`,
  },
  calendarDayActive: {
    backgroundColor: colors.sageDark,
  },
  calendarDayText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  calendarDayTextActive: {
    color: colors.surface,
  },
  calendarSelectedText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
  choiceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    marginTop: 8,
  },
  choiceChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  choiceText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  choiceTextActive: {
    color: colors.surface,
  },
  resultLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
  },
  resultValue: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  resultCaption: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  liveCoughCard: {
    backgroundColor: "#253833",
    borderRadius: 14,
    marginBottom: 14,
    padding: 12,
  },
  liveCoughLabel: {
    color: "#C9D9D0",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  coughToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  coughToggle: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: "center",
  },
  coughToggleActive: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  coughToggleText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  coughToggleTextActive: {
    color: colors.surface,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900",
  },
  saveStateText: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
    minHeight: 17,
    textAlign: "center",
  },
  quickSaveState: {
    color: "#C9D9D0",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 16,
    minHeight: 18,
    textAlign: "center",
  },
});
