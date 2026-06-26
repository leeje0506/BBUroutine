import json
from io import BytesIO
from datetime import date, datetime, timedelta
from zipfile import ZIP_DEFLATED, ZipFile
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.db import get_connection, init_db
from app.schemas.records import (
    BreathingRecord,
    BreathingRecordCreate,
    BreathingStats,
    CareSummary,
    ExpenseSummary,
    HospitalVisit,
    HospitalVisitCreate,
    MealRecord,
    MealRecordCreate,
    MedicationLog,
    MedicationLogCreate,
    PetProfile,
    Suggestions,
)

router = APIRouter()


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _current_pet_row():
    init_db()
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM pets LIMIT 1").fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return row


def _current_pet_id() -> str:
    return str(_current_pet_row()["id"])


def _parse_datetime(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def _parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _pet_from_row(row) -> PetProfile:
    return PetProfile(
        id=UUID(row["id"]),
        name=row["name"],
        species=row["species"],
        birth_date=_parse_date(row["birth_date"]),
        weight_kg=row["weight_kg"],
        conditions=[item for item in row["conditions"].split(",") if item],
        caution_notes=row["caution_notes"],
    )


def _breathing_from_row(row) -> BreathingRecord:
    return BreathingRecord(
        id=UUID(row["id"]),
        pet_id=UUID(row["pet_id"]),
        measured_at=datetime.fromisoformat(row["measured_at"]),
        duration_seconds=row["duration_seconds"],
        breath_count=row["breath_count"],
        breaths_per_minute=row["breaths_per_minute"],
        cough_observed=bool(row["cough_observed"]),
        memo=row["memo"],
    )


def _medication_from_row(row) -> MedicationLog:
    return MedicationLog(
        id=UUID(row["id"]),
        pet_id=UUID(row["pet_id"]),
        logged_at=datetime.fromisoformat(row["logged_at"]),
        medication_name=row["medication_name"],
        dosage=row["dosage"],
        status=row["status"],
        memo=row["memo"],
    )


def _meal_from_row(row) -> MealRecord:
    return MealRecord(
        id=UUID(row["id"]),
        pet_id=UUID(row["pet_id"]),
        logged_at=datetime.fromisoformat(row["logged_at"]),
        meal_type=row["meal_type"],
        food_name=row["food_name"],
        food_grams=row["food_grams"],
        water_ml=row["water_ml"],
        amount_status=row["amount_status"],
        memo=row["memo"],
    )


def _visit_from_row(row) -> HospitalVisit:
    return HospitalVisit(
        id=UUID(row["id"]),
        pet_id=UUID(row["pet_id"]),
        hospital_name=row["hospital_name"],
        visited_at=datetime.fromisoformat(row["visited_at"]),
        reason=row["reason"],
        diagnosis=row["diagnosis"],
        prescription_note=row["prescription_note"],
        medication_items=json.loads(row["medication_items"] or "[]"),
        attachments=json.loads(row["attachments"] or "[]"),
        next_visit_at=_parse_datetime(row["next_visit_at"]),
        next_visit_interval_weeks=row["next_visit_interval_weeks"],
        total_cost=row["total_cost"],
        memo=row["memo"],
    )


def _medication_status(row) -> str:
    if row is None:
        return "복약 기록 없음"
    dosage = f" {row['dosage']}" if row["dosage"] else ""
    return f"{row['medication_name']}{dosage} 완료"


def _meal_status(row) -> str:
    if row is None:
        return "식사 기록 없음"
    food = f" · {row['food_name']}" if row["food_name"] else ""
    grams = f" {row['food_grams']:g}g" if row["food_grams"] is not None else ""
    water = f" · 물 {row['water_ml']:g}ml" if row["water_ml"] is not None else ""
    return f"{row['meal_type']} {row['amount_status']}{food}{grams}{water}"


def _average_breathing(connection, pet_id: str, start_at: datetime, end_at: datetime):
    return connection.execute(
        """
        SELECT
            AVG(breaths_per_minute) AS average,
            COUNT(*) AS count
        FROM breathing_records
        WHERE pet_id = ? AND measured_at >= ? AND measured_at < ?
        """,
        (pet_id, start_at.isoformat(timespec="seconds"), end_at.isoformat(timespec="seconds")),
    ).fetchone()


def _distinct_values(connection, query: str, params: tuple[str, ...]) -> list[str]:
    rows = connection.execute(query, params).fetchall()
    values = [row[0] for row in rows if row[0]]
    return list(dict.fromkeys(values))


def _hospital_medication_suggestions(rows, key: str) -> list[str]:
    values: list[str] = []
    for row in rows:
        for item in json.loads(row["medication_items"] or "[]"):
            value = item.get(key)
            if value:
                values.append(value)
    return list(dict.fromkeys(values))


def _xml_escape(value) -> str:
    text = "" if value is None else str(value)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _xlsx_cell(reference: str, value) -> str:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{reference}"><v>{value}</v></c>'
    return f'<c r="{reference}" t="inlineStr"><is><t>{_xml_escape(value)}</t></is></c>'


def _column_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def _build_xlsx(rows: list[list[object]]) -> bytes:
    sheet_rows = []
    for row_index, row in enumerate(rows, start=1):
        cells = [
            _xlsx_cell(f"{_column_name(column_index)}{row_index}", value)
            for column_index, value in enumerate(row, start=1)
        ]
        sheet_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')

    worksheet = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="2" width="14" customWidth="1"/>
    <col min="3" max="3" width="16" customWidth="1"/>
    <col min="4" max="4" width="24" customWidth="1"/>
    <col min="5" max="8" width="28" customWidth="1"/>
    <col min="9" max="11" width="18" customWidth="1"/>
  </cols>
  <sheetData>{"".join(sheet_rows)}</sheetData>
</worksheet>"""
    workbook = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="돌봄 기록" sheetId="1" r:id="rId1"/></sheets>
</workbook>"""
    workbook_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>"""
    root_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>"""

    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", root_rels)
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        archive.writestr("xl/worksheets/sheet1.xml", worksheet)
    return output.getvalue()


def _date_key(value: str) -> str:
    return datetime.fromisoformat(value).strftime("%Y-%m-%d")


@router.get("/pets/current", response_model=PetProfile)
def get_current_pet() -> PetProfile:
    return _pet_from_row(_current_pet_row())


@router.get("/care/summary", response_model=CareSummary)
def get_care_summary() -> CareSummary:
    pet_id = _current_pet_id()
    with get_connection() as connection:
        latest_breathing = connection.execute(
            """
            SELECT * FROM breathing_records
            WHERE pet_id = ?
            ORDER BY measured_at DESC
            LIMIT 1
            """,
            (pet_id,),
        ).fetchone()
        latest_medication = connection.execute(
            """
            SELECT * FROM medication_logs
            WHERE pet_id = ?
            ORDER BY logged_at DESC
            LIMIT 1
            """,
            (pet_id,),
        ).fetchone()
        latest_meal = connection.execute(
            """
            SELECT * FROM meal_records
            WHERE pet_id = ?
            ORDER BY logged_at DESC
            LIMIT 1
            """,
            (pet_id,),
        ).fetchone()
        next_visit = connection.execute(
            """
            SELECT * FROM hospital_visits
            WHERE pet_id = ? AND next_visit_at IS NOT NULL
            ORDER BY next_visit_at DESC
            LIMIT 1
            """,
            (pet_id,),
        ).fetchone()
        expense = connection.execute(
            "SELECT COALESCE(SUM(total_cost), 0) AS total FROM hospital_visits WHERE pet_id = ?",
            (pet_id,),
        ).fetchone()

    return CareSummary(
        pet_id=UUID(pet_id),
        medication_status=_medication_status(latest_medication),
        meal_status=_meal_status(latest_meal),
        latest_breaths_per_minute=latest_breathing["breaths_per_minute"] if latest_breathing else None,
        next_visit_at=_parse_datetime(next_visit["next_visit_at"]) if next_visit else None,
        monthly_expense=expense["total"],
    )


@router.get("/breathing-records", response_model=list[BreathingRecord])
def list_breathing_records() -> list[BreathingRecord]:
    pet_id = _current_pet_id()
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM breathing_records WHERE pet_id = ? ORDER BY measured_at DESC",
            (pet_id,),
        ).fetchall()
    return [_breathing_from_row(row) for row in rows]


@router.get("/breathing-records/stats", response_model=BreathingStats)
def get_breathing_stats(days: int = 7) -> BreathingStats:
    if days not in (7, 30):
        raise HTTPException(status_code=400, detail="days must be 7 or 30")

    pet_id = _current_pet_id()
    now = datetime.now()
    current_start = now - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)

    with get_connection() as connection:
        current = _average_breathing(connection, pet_id, current_start, now)
        previous = _average_breathing(connection, pet_id, previous_start, current_start)

    current_average = round(current["average"], 1) if current["average"] is not None else None
    previous_average = round(previous["average"], 1) if previous["average"] is not None else None
    difference = (
        round(current_average - previous_average, 1)
        if current_average is not None and previous_average is not None
        else None
    )

    if difference is None:
        comparison_label = "비교할 이전 기간 기록이 부족해요"
    elif difference > 0:
        comparison_label = f"앞의 {days}일보다 {difference:g}회/분 늘어났어요"
    elif difference < 0:
        comparison_label = f"앞의 {days}일보다 {abs(difference):g}회/분 줄었어요"
    else:
        comparison_label = f"앞의 {days}일과 같아요"

    return BreathingStats(
        days=days,
        average_breaths_per_minute=current_average,
        previous_average_breaths_per_minute=previous_average,
        difference_from_previous=difference,
        record_count=current["count"],
        previous_record_count=previous["count"],
        comparison_label=comparison_label,
    )


@router.post("/breathing-records", response_model=BreathingRecord)
def create_breathing_record(record: BreathingRecordCreate) -> BreathingRecord:
    pet_id = _current_pet_id()
    record_id = str(uuid4())
    measured_at = _now()
    breaths_per_minute = round(record.breath_count * 60 / record.duration_seconds)
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO breathing_records (
                id, pet_id, measured_at, duration_seconds, breath_count,
                breaths_per_minute, cough_observed, memo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record_id,
                pet_id,
                measured_at,
                record.duration_seconds,
                record.breath_count,
                breaths_per_minute,
                1 if record.cough_observed else 0,
                record.memo,
            ),
        )
        row = connection.execute("SELECT * FROM breathing_records WHERE id = ?", (record_id,)).fetchone()
    return _breathing_from_row(row)


@router.get("/medication-logs", response_model=list[MedicationLog])
def list_medication_logs() -> list[MedicationLog]:
    pet_id = _current_pet_id()
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM medication_logs WHERE pet_id = ? ORDER BY logged_at DESC",
            (pet_id,),
        ).fetchall()
    return [_medication_from_row(row) for row in rows]


@router.post("/medication-logs", response_model=MedicationLog)
def create_medication_log(record: MedicationLogCreate) -> MedicationLog:
    pet_id = _current_pet_id()
    record_id = str(uuid4())
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO medication_logs (
                id, pet_id, logged_at, medication_name, dosage, status, memo
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (record_id, pet_id, _now(), record.medication_name, record.dosage, record.status, record.memo),
        )
        row = connection.execute("SELECT * FROM medication_logs WHERE id = ?", (record_id,)).fetchone()
    return _medication_from_row(row)


@router.get("/meal-records", response_model=list[MealRecord])
def list_meal_records() -> list[MealRecord]:
    pet_id = _current_pet_id()
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM meal_records WHERE pet_id = ? ORDER BY logged_at DESC",
            (pet_id,),
        ).fetchall()
    return [_meal_from_row(row) for row in rows]


@router.post("/meal-records", response_model=MealRecord)
def create_meal_record(record: MealRecordCreate) -> MealRecord:
    pet_id = _current_pet_id()
    record_id = str(uuid4())
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO meal_records (
                id, pet_id, logged_at, meal_type, food_name, food_grams, water_ml, amount_status, memo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record_id,
                pet_id,
                _now(),
                record.meal_type,
                record.food_name,
                record.food_grams,
                record.water_ml,
                record.amount_status,
                record.memo,
            ),
        )
        row = connection.execute("SELECT * FROM meal_records WHERE id = ?", (record_id,)).fetchone()
    return _meal_from_row(row)


@router.get("/hospital-visits", response_model=list[HospitalVisit])
def list_hospital_visits() -> list[HospitalVisit]:
    pet_id = _current_pet_id()
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM hospital_visits WHERE pet_id = ? ORDER BY visited_at DESC",
            (pet_id,),
        ).fetchall()
    return [_visit_from_row(row) for row in rows]


@router.post("/hospital-visits", response_model=HospitalVisit)
def create_hospital_visit(record: HospitalVisitCreate) -> HospitalVisit:
    pet_id = _current_pet_id()
    record_id = str(uuid4())
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO hospital_visits (
                id, pet_id, hospital_name, visited_at, reason, diagnosis,
                prescription_note, medication_items, attachments, next_visit_at,
                next_visit_interval_weeks, total_cost, memo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record_id,
                pet_id,
                record.hospital_name,
                _now(),
                record.reason,
                record.diagnosis,
                record.prescription_note,
                json.dumps([item.model_dump() for item in record.medication_items], ensure_ascii=False),
                json.dumps([item.model_dump() for item in record.attachments], ensure_ascii=False),
                record.next_visit_at.isoformat(timespec="seconds") if record.next_visit_at else None,
                record.next_visit_interval_weeks,
                record.total_cost,
                record.memo,
            ),
        )
        row = connection.execute("SELECT * FROM hospital_visits WHERE id = ?", (record_id,)).fetchone()
    return _visit_from_row(row)


@router.get("/suggestions", response_model=Suggestions)
def get_suggestions() -> Suggestions:
    pet_id = _current_pet_id()
    with get_connection() as connection:
        medication_names = _distinct_values(
            connection,
            """
            SELECT DISTINCT medication_name FROM medication_logs
            WHERE pet_id = ? AND medication_name IS NOT NULL AND medication_name != ''
            ORDER BY logged_at DESC
            LIMIT 20
            """,
            (pet_id,),
        )
        medication_dosages = _distinct_values(
            connection,
            """
            SELECT DISTINCT dosage FROM medication_logs
            WHERE pet_id = ? AND dosage IS NOT NULL AND dosage != ''
            ORDER BY logged_at DESC
            LIMIT 20
            """,
            (pet_id,),
        )
        food_names = _distinct_values(
            connection,
            """
            SELECT DISTINCT food_name FROM meal_records
            WHERE pet_id = ? AND food_name IS NOT NULL AND food_name != ''
            ORDER BY logged_at DESC
            LIMIT 20
            """,
            (pet_id,),
        )
        hospital_names = _distinct_values(
            connection,
            """
            SELECT DISTINCT hospital_name FROM hospital_visits
            WHERE pet_id = ? AND hospital_name IS NOT NULL AND hospital_name != ''
            ORDER BY visited_at DESC
            LIMIT 20
            """,
            (pet_id,),
        )
        hospital_medication_rows = connection.execute(
            """
            SELECT medication_items FROM hospital_visits
            WHERE pet_id = ? AND medication_items IS NOT NULL
            ORDER BY visited_at DESC
            LIMIT 50
            """,
            (pet_id,),
        ).fetchall()

    return Suggestions(
        medication_names=list(dict.fromkeys(medication_names + _hospital_medication_suggestions(hospital_medication_rows, "name"))),
        medication_dosages=list(dict.fromkeys(medication_dosages + _hospital_medication_suggestions(hospital_medication_rows, "dosage"))),
        food_names=food_names,
        hospital_names=hospital_names,
    )


@router.get("/expenses/summary", response_model=ExpenseSummary)
def get_expense_summary() -> ExpenseSummary:
    pet_id = _current_pet_id()
    with get_connection() as connection:
        total = connection.execute(
            "SELECT COALESCE(SUM(total_cost), 0) AS total FROM hospital_visits WHERE pet_id = ?",
            (pet_id,),
        ).fetchone()
    return ExpenseSummary(
        pet_id=UUID(pet_id),
        month=datetime.now().strftime("%Y-%m"),
        total_amount=total["total"],
        categories={
            "병원": total["total"],
        },
    )


@router.get("/export/excel")
def export_excel():
    pet_id = _current_pet_id()
    with get_connection() as connection:
        breathing_rows = connection.execute(
            "SELECT * FROM breathing_records WHERE pet_id = ? ORDER BY measured_at ASC",
            (pet_id,),
        ).fetchall()
        medication_rows = connection.execute(
            "SELECT * FROM medication_logs WHERE pet_id = ? ORDER BY logged_at ASC",
            (pet_id,),
        ).fetchall()
        meal_rows = connection.execute(
            "SELECT * FROM meal_records WHERE pet_id = ? ORDER BY logged_at ASC",
            (pet_id,),
        ).fetchall()
        hospital_rows = connection.execute(
            "SELECT * FROM hospital_visits WHERE pet_id = ? ORDER BY visited_at ASC",
            (pet_id,),
        ).fetchall()

    by_date: dict[str, dict[str, list[str] | int]] = {}

    def day_bucket(day: str):
        return by_date.setdefault(
            day,
            {
                "breathing": [],
                "medication": [],
                "meal": [],
                "water": [],
                "hospital": [],
                "next_visit": [],
                "attachments": [],
                "memo": [],
                "expense": 0,
            },
        )

    for row in breathing_rows:
        bucket = day_bucket(_date_key(row["measured_at"]))
        cough = "기침 O" if row["cough_observed"] else "기침 X"
        bucket["breathing"].append(
            f"{row['breaths_per_minute']}회/분 ({row['duration_seconds']}초 {row['breath_count']}회, {cough})"
        )
        if row["memo"]:
            bucket["memo"].append(f"호흡: {row['memo']}")

    for row in medication_rows:
        bucket = day_bucket(_date_key(row["logged_at"]))
        dosage = f" {row['dosage']}" if row["dosage"] else ""
        bucket["medication"].append(f"{row['medication_name']}{dosage} {row['status']}")
        if row["memo"]:
            bucket["memo"].append(f"약: {row['memo']}")

    for row in meal_rows:
        bucket = day_bucket(_date_key(row["logged_at"]))
        food = f" · {row['food_name']}" if row["food_name"] else ""
        grams = f" {row['food_grams']:g}g" if row["food_grams"] is not None else ""
        water = f" · 물 {row['water_ml']:g}ml" if row["water_ml"] is not None else ""
        bucket["meal"].append(f"{row['meal_type']} {row['amount_status']}{food}{grams}{water}")
        if row["water_ml"] is not None:
            bucket["water"].append(f"{row['water_ml']:g}ml")
        if row["memo"]:
            bucket["memo"].append(f"식사: {row['memo']}")

    for row in hospital_rows:
        bucket = day_bucket(_date_key(row["visited_at"]))
        medication_items = json.loads(row["medication_items"] or "[]")
        attachments = json.loads(row["attachments"] or "[]")
        meds = ", ".join(
            f"{item.get('name', '')} {item.get('dosage') or ''}".strip()
            for item in medication_items
            if item.get("name")
        )
        hospital_text = " · ".join(
            item
            for item in [row["hospital_name"], row["reason"], row["diagnosis"], f"처방: {meds}" if meds else ""]
            if item
        )
        bucket["hospital"].append(hospital_text)
        if row["next_visit_at"]:
            repeat = f" / {row['next_visit_interval_weeks']}주마다" if row["next_visit_interval_weeks"] else ""
            bucket["next_visit"].append(f"{row['next_visit_at'][:10]}{repeat}")
        if attachments:
            bucket["attachments"].append(", ".join(item.get("name", "") for item in attachments if item.get("name")))
        if row["memo"]:
            bucket["memo"].append(f"병원: {row['memo']}")
        bucket["expense"] = int(bucket["expense"]) + int(row["total_cost"])

    headers = [
        "날짜",
        "호흡 수",
        "기침 여부",
        "복약",
        "식사",
        "음수량",
        "병원/소견",
        "다음 예약",
        "첨부파일",
        "메모",
        "비용",
    ]
    rows: list[list[object]] = [headers]
    for day in sorted(by_date):
        bucket = by_date[day]
        rows.append(
            [
                day,
                "\n".join(bucket["breathing"]),
                "O" if any("기침 O" in item for item in bucket["breathing"]) else "X" if bucket["breathing"] else "",
                "\n".join(bucket["medication"]),
                "\n".join(bucket["meal"]),
                "\n".join(bucket["water"]),
                "\n".join(bucket["hospital"]),
                "\n".join(bucket["next_visit"]),
                "\n".join(bucket["attachments"]),
                "\n".join(bucket["memo"]),
                bucket["expense"],
            ]
        )

    file_bytes = _build_xlsx(rows)
    filename = f"ppuroutine-export-{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
