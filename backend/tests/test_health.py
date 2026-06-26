from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def auth_headers(username: str = "dev1", password: str = "dev1") -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_current_pet() -> None:
    response = client.get("/api/pets/current", headers=auth_headers())
    assert response.status_code == 200
    assert response.json()["name"] == "뿌나"


def test_bbunu_can_create_pet() -> None:
    headers = auth_headers("bbunu", "bbunu")
    response = client.post(
        "/api/pets",
        json={
            "name": "뿌나테스트",
            "species": "dog",
            "birth_date": "2012-03-14",
            "weight_kg": 5.2,
            "conditions": ["심장 관리", "신장 관리"],
            "caution_notes": "밤에 안정 시 호흡 수를 확인해요.",
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "뿌나테스트"
    assert data["conditions"] == ["심장 관리", "신장 관리"]


def test_create_medication_log_with_dosage() -> None:
    response = client.post(
        "/api/medication-logs",
        json={"medication_name": "심장약", "dosage": "1/2정", "memo": "저녁 식후"},
        headers=auth_headers(),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["medication_name"] == "심장약"
    assert data["dosage"] == "1/2정"


def test_create_meal_record_with_food_detail() -> None:
    response = client.post(
        "/api/meal-records",
        json={
            "meal_type": "저녁",
            "food_name": "신장 처방식",
            "food_grams": 42,
            "water_ml": 120,
            "amount_status": "일부 섭취",
            "memo": "닭가슴살 조금 섞음",
        },
        headers=auth_headers(),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["food_name"] == "신장 처방식"
    assert data["food_grams"] == 42
    assert data["water_ml"] == 120


def test_create_hospital_visit_with_details() -> None:
    response = client.post(
        "/api/hospital-visits",
        json={
            "hospital_name": "마음동물병원",
            "reason": "정기 검진",
            "diagnosis": "신장 수치 확인",
            "prescription_note": "기존 약 유지",
            "medication_items": [{"name": "심장약", "dosage": "1/2정"}],
            "attachments": [
                {
                    "name": "receipt.jpg",
                    "uri": "file:///tmp/receipt.jpg",
                    "mime_type": "image/jpeg",
                    "size": 1234,
                }
            ],
            "next_visit_at": "2026-07-02T15:00:00",
            "next_visit_interval_weeks": 2,
            "total_cost": 182000,
        },
        headers=auth_headers(),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["hospital_name"] == "마음동물병원"
    assert data["total_cost"] == 182000
    assert data["medication_items"][0]["name"] == "심장약"
    assert data["attachments"][0]["name"] == "receipt.jpg"
    assert data["next_visit_interval_weeks"] == 2


def test_suggestions() -> None:
    response = client.get("/api/suggestions", headers=auth_headers())
    assert response.status_code == 200
    data = response.json()
    assert "마음동물병원" in data["hospital_names"]


def test_breathing_stats() -> None:
    create_response = client.post(
        "/api/breathing-records",
        json={"duration_seconds": 30, "breath_count": 12, "cough_observed": True},
        headers=auth_headers(),
    )
    assert create_response.status_code == 200
    assert create_response.json()["cough_observed"] is True

    response = client.get("/api/breathing-records/stats?days=7", headers=auth_headers())
    assert response.status_code == 200
    data = response.json()
    assert data["days"] == 7
    assert data["record_count"] >= 1
    assert data["average_breaths_per_minute"] is not None


def test_export_excel() -> None:
    response = client.get("/api/export/excel", headers=auth_headers())
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert response.content.startswith(b"PK")
