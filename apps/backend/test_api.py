import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api import app, get_db
from models import Base
from settings import get_settings

# Test database
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Create test database
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup
    Base.metadata.drop_all(bind=engine)
    os.remove("./test.db")

@pytest.fixture
def client():
    return TestClient(app)

class TestAuth:
    def test_register(self, client):
        response = client.post("/api/auth/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpass123"
        })
        assert response.status_code == 201

    def test_login(self, client):
        # First register
        client.post("/api/auth/register", json={
            "username": "testuser2",
            "email": "test2@example.com",
            "password": "testpass123"
        })
        # Then login
        response = client.post("/api/auth/login", json={
            "username": "testuser2",
            "password": "testpass123"
        })
        assert response.status_code == 200
        assert "access_token" in response.json()

class TestGames:
    def test_get_games(self, client):
        response = client.get("/api/games")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_start_game_session(self, client):
        response = client.post("/api/games/session", json={
            "game_type": "memory_matrix",
            "difficulty": "medium"
        })
        assert response.status_code == 200

class TestAnalytics:
    def test_get_analytics_summary(self, client):
        response = client.get("/api/analytics/summary")
        assert response.status_code == 200

class TestLeaderboard:
    def test_get_leaderboard(self, client):
        response = client.get("/api/leaderboard/memory")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

class TestAI:
    def test_get_recommendations(self, client):
        response = client.get("/api/recommendations")
        assert response.status_code == 200

class TestHealth:
    def test_health_check(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_api_health(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

