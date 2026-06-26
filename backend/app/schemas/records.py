from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PetProfile(BaseModel):
    id: UUID
    user_id: UUID | None = None
    name: str
    species: str
    birth_date: date | None = None
    weight_kg: float | None = None
    conditions: list[str] = Field(default_factory=list)
    caution_notes: str | None = None


class PetProfileCreate(BaseModel):
    name: str
    species: str = "dog"
    birth_date: date | None = None
    weight_kg: float | None = None
    conditions: list[str] = Field(default_factory=list)
    caution_notes: str | None = None


class UserLogin(BaseModel):
    username: str
    password: str


class AuthSession(BaseModel):
    token: str
    username: str
    display_name: str
    pet: PetProfile | None = None


class BreathingRecord(BaseModel):
    id: UUID
    pet_id: UUID
    measured_at: datetime
    duration_seconds: int
    breath_count: int
    breaths_per_minute: int
    cough_observed: bool = False
    memo: str | None = None


class BreathingRecordCreate(BaseModel):
    duration_seconds: int
    breath_count: int
    cough_observed: bool = False
    memo: str | None = None


class BreathingStats(BaseModel):
    days: int
    average_breaths_per_minute: float | None = None
    previous_average_breaths_per_minute: float | None = None
    difference_from_previous: float | None = None
    record_count: int
    previous_record_count: int
    comparison_label: str


class MedicationItem(BaseModel):
    name: str
    dosage: str | None = None


class AttachmentItem(BaseModel):
    name: str
    uri: str
    mime_type: str | None = None
    size: int | None = None


class HospitalVisit(BaseModel):
    id: UUID
    pet_id: UUID
    hospital_name: str
    visited_at: datetime
    reason: str
    diagnosis: str | None = None
    prescription_note: str | None = None
    medication_items: list[MedicationItem] = Field(default_factory=list)
    attachments: list[AttachmentItem] = Field(default_factory=list)
    next_visit_at: datetime | None = None
    next_visit_interval_weeks: int | None = None
    total_cost: int = 0
    memo: str | None = None


class HospitalVisitCreate(BaseModel):
    hospital_name: str
    reason: str
    diagnosis: str | None = None
    prescription_note: str | None = None
    medication_items: list[MedicationItem] = Field(default_factory=list)
    attachments: list[AttachmentItem] = Field(default_factory=list)
    next_visit_at: datetime | None = None
    next_visit_interval_weeks: int | None = None
    total_cost: int = 0
    memo: str | None = None


class MedicationLog(BaseModel):
    id: UUID
    pet_id: UUID
    logged_at: datetime
    medication_name: str
    dosage: str | None = None
    status: str
    memo: str | None = None


class MedicationLogCreate(BaseModel):
    medication_name: str = "저녁약"
    dosage: str | None = None
    status: str = "completed"
    memo: str | None = None


class MealRecord(BaseModel):
    id: UUID
    pet_id: UUID
    logged_at: datetime
    meal_type: str
    food_name: str | None = None
    food_grams: float | None = None
    water_ml: float | None = None
    amount_status: str
    memo: str | None = None


class MealRecordCreate(BaseModel):
    meal_type: str = "저녁"
    food_name: str | None = None
    food_grams: float | None = None
    water_ml: float | None = None
    amount_status: str = "일부 섭취"
    memo: str | None = None


class CareSummary(BaseModel):
    pet_id: UUID
    medication_status: str
    meal_status: str
    latest_breaths_per_minute: int | None = None
    next_visit_at: datetime | None = None
    monthly_expense: int


class ExpenseSummary(BaseModel):
    pet_id: UUID
    month: str
    total_amount: int
    categories: dict[str, int]


class Suggestions(BaseModel):
    medication_names: list[str] = Field(default_factory=list)
    medication_dosages: list[str] = Field(default_factory=list)
    food_names: list[str] = Field(default_factory=list)
    hospital_names: list[str] = Field(default_factory=list)
