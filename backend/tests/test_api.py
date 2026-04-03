import os
import sys

import fakeredis
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import Base, app, engine  # noqa: E402
import api as api_module  # noqa: E402

api_module.redis_client = fakeredis.FakeRedis(decode_responses=True)

client = TestClient(app)


@pytest.fixture(scope="function")
def setup_database():
    Base.metadata.create_all(bind=engine)
    api_module.redis_client.flushall()
    yield
    Base.metadata.drop_all(bind=engine)
    api_module.redis_client.flushall()


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_register(setup_database):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login(setup_database):
    client.post(
        "/api/auth/register",
        json={
            "email": "test2@example.com",
            "username": "testuser2",
            "password": "testpassword123",
        },
    )

    response = client.post(
        "/api/auth/login",
        json={
            "email": "test2@example.com",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


def test_login_invalid(setup_database):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


@pytest.fixture
def auth_token(setup_database):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "auth@example.com",
            "username": "authuser",
            "password": "testpassword123",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


def test_record_session(auth_token):
    response = client.post(
        "/api/games/session",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "game_type": "memory",
            "score": 1000,
            "accuracy": 85.5,
            "duration_seconds": 60,
            "difficulty_level": 2,
            "cognitive_area": "memory",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_get_analytics(auth_token):
    client.post(
        "/api/games/session",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "game_type": "memory",
            "score": 1000,
            "accuracy": 85.5,
            "cognitive_area": "memory",
        },
    )

    response = client.get(
        "/api/analytics/summary",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_games" in data
    assert "cognitive_profile" in data


def test_get_recommendations(auth_token):
    response = client.get(
        "/api/recommendations",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_achievements(auth_token):
    response = client.get(
        "/api/achievements",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    assert "achievements" in response.json()


def test_global_stats(setup_database):
    response = client.get("/api/stats/global")
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "total_games_played" in data


def test_readiness(setup_database):
    r = client.get("/api/health/ready")
    assert r.status_code == 200
    assert r.json().get("status") == "ready"


def test_refresh_token(setup_database):
    r = client.post(
        "/api/auth/register",
        json={
            "email": "refresh@example.com",
            "username": "refreshuser",
            "password": "testpassword123",
        },
    )
    data = r.json()
    refresh = data["refresh_token"]
    out = client.post(
        "/api/auth/refresh",
        headers={"Authorization": f"Bearer {refresh}"},
    )
    assert out.status_code == 200
    assert "access_token" in out.json()


def test_global_stats_reflects_accuracy(auth_token):
    client.post(
        "/api/games/session",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "game_type": "memory",
            "score": 100,
            "accuracy": 90.0,
            "cognitive_area": "memory",
        },
    )
    g = client.get("/api/stats/global")
    assert g.status_code == 200
    body = g.json()
    assert body["average_accuracy"] == 90.0


def test_x_request_id_header(setup_database):
    r = client.get("/api/health", headers={"X-Request-ID": "trace-abc-1"})
    assert r.status_code == 200
    assert r.headers.get("X-Request-ID") == "trace-abc-1"
