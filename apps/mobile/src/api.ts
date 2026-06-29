export type CareSummary = {
  medication_status: string;
  meal_status: string;
  latest_breaths_per_minute: number | null;
  next_visit_at: string | null;
  monthly_expense: number;
};

export type AuthSession = {
  token: string;
  username: string;
  display_name: string;
  pet: PetProfile | null;
};

export type PetProfile = {
  id: string;
  name: string;
  species: string;
  birth_date: string | null;
  weight_kg: number | null;
  conditions: string[];
  caution_notes: string | null;
};

export type BreathingRecord = {
  id: string;
  measured_at: string;
  duration_seconds: number;
  breath_count: number;
  breaths_per_minute: number;
  cough_observed: boolean;
  memo: string | null;
};

export type BreathingStats = {
  days: number;
  average_breaths_per_minute: number | null;
  previous_average_breaths_per_minute: number | null;
  difference_from_previous: number | null;
  record_count: number;
  previous_record_count: number;
  comparison_label: string;
};

export type MedicationLog = {
  id: string;
  logged_at: string;
  medication_name: string;
  dosage: string | null;
  status: string;
  memo: string | null;
};

export type MealRecord = {
  id: string;
  logged_at: string;
  meal_type: string;
  food_name: string | null;
  food_grams: number | null;
  water_ml: number | null;
  amount_status: string;
  memo: string | null;
};

export type HospitalVisit = {
  id: string;
  hospital_name: string;
  visited_at: string;
  reason: string;
  diagnosis: string | null;
  prescription_note: string | null;
  medication_items: MedicationItem[];
  attachments: AttachmentItem[];
  next_visit_at: string | null;
  next_visit_interval_weeks: number | null;
  total_cost: number;
  memo: string | null;
};

export type MedicationItem = {
  name: string;
  dosage: string | null;
};

export type AttachmentItem = {
  name: string;
  uri: string;
  mime_type: string | null;
  size: number | null;
};

export type ExpenseSummary = {
  month: string;
  total_amount: number;
  categories: Record<string, number>;
};

export type Suggestions = {
  medication_names: string[];
  medication_dosages: string[];
  food_names: string[];
  hospital_names: string[];
};

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://bburoutine.onrender.com";
let apiToken: string | null = null;

export function setApiToken(token: string | null) {
  apiToken = token;
}

function authHeaders(): Record<string, string> {
  return apiToken ? { Authorization: `Bearer ${apiToken}` } : {};
}

async function getJson<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}${path}`, {
        headers: authHeaders(),
      });
      if (response.ok) return (await response.json()) as T;
      if (response.status < 500) return null;
    } catch {
      // A sleeping free Render instance can briefly fail its first request.
    }

    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  return null;
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T | null> {
  if (!API_URL) return null;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function login(payload: { username: string; password: string }) {
  return postJson<AuthSession>("/api/auth/login", payload);
}

export async function getCurrentPet() {
  return getJson<PetProfile>("/api/pets/current");
}

export async function createPet(payload: {
  name: string;
  species?: string;
  birth_date?: string;
  weight_kg?: number;
  conditions?: string[];
  caution_notes?: string;
}) {
  return postJson<PetProfile>("/api/pets", payload);
}

export async function getCareSummary() {
  return getJson<CareSummary>("/api/care/summary");
}

export async function getSuggestions() {
  return getJson<Suggestions>("/api/suggestions");
}

export async function getBreathingRecords() {
  return getJson<BreathingRecord[]>("/api/breathing-records");
}

export async function getBreathingStats(days: 7 | 30) {
  return getJson<BreathingStats>(`/api/breathing-records/stats?days=${days}`);
}

export async function createBreathingRecord(payload: {
  duration_seconds: number;
  breath_count: number;
  cough_observed?: boolean;
  memo?: string;
}) {
  return postJson<BreathingRecord>("/api/breathing-records", payload);
}

export async function getMedicationLogs() {
  return getJson<MedicationLog[]>("/api/medication-logs");
}

export async function createMedicationLog(payload: {
  medication_name?: string;
  dosage?: string;
  status?: string;
  memo?: string;
}) {
  return postJson<MedicationLog>("/api/medication-logs", payload);
}

export async function getMealRecords() {
  return getJson<MealRecord[]>("/api/meal-records");
}

export async function createMealRecord(payload: {
  meal_type?: string;
  food_name?: string;
  food_grams?: number;
  water_ml?: number;
  amount_status?: string;
  memo?: string;
}) {
  return postJson<MealRecord>("/api/meal-records", payload);
}

export async function getHospitalVisits() {
  return getJson<HospitalVisit[]>("/api/hospital-visits");
}

export async function createHospitalVisit(payload: {
  hospital_name: string;
  reason: string;
  diagnosis?: string;
  prescription_note?: string;
  medication_items?: Array<{ name: string; dosage?: string }>;
  attachments?: Array<{ name: string; uri: string; mime_type?: string | null; size?: number | null }>;
  next_visit_at?: string;
  next_visit_interval_weeks?: number;
  total_cost?: number;
  memo?: string;
}) {
  return postJson<HospitalVisit>("/api/hospital-visits", payload);
}

export async function getExpenseSummary() {
  return getJson<ExpenseSummary>("/api/expenses/summary");
}

export function getExportExcelUrl() {
  return API_URL && apiToken ? `${API_URL}/api/export/excel?token=${encodeURIComponent(apiToken)}` : null;
}
