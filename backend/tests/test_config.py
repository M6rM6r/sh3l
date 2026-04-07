from config import Settings


def test_settings_parse_multiple_cors_origins() -> None:
    settings = Settings(
        SECRET_KEY="test-secret-key-with-32-characters!!",
        CORS_ORIGINS="http://localhost:3000,http://localhost:5173",
    )

    assert settings.cors_origins == [
        "http://localhost:3000",
        "http://localhost:5173",
    ]
    assert settings.cors_allow_credentials is True


def test_settings_disable_credentials_for_wildcard_cors() -> None:
    settings = Settings(
        SECRET_KEY="test-secret-key-with-32-characters!!",
        CORS_ORIGINS="*",
    )

    assert settings.cors_origins == ["*"]
    assert settings.cors_allow_credentials is False
