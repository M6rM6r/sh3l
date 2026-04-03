"""Force test environment before any test module imports `api`."""

import os

# Override inherited shells (CI, developer machines) so tests never hit real DBs.
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only"
