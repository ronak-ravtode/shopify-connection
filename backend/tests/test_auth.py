import pytest
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.business import Business
from app.models.user import User
from app.services.auth_service import create_token, hash_password, verify_password

EMAIL = "testuser@example.com"
PASSWORD = "StrongPassword123!"


@pytest.fixture()
def client_and_user():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def _override():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override
    db = TestingSession()
    try:
        b = Business(name="Test Biz", email=EMAIL)
        db.add(b)
        db.commit()
        db.refresh(b)

        u = User(
            name="Test User",
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
            role="ADMIN",
            business_id=b.id,
        )
        db.add(u)
        db.commit()
        db.refresh(u)

        tc = TestClient(app)
        yield tc, u
    finally:
        db.close()
        app.dependency_overrides.pop(get_db, None)


def test_hash_verify():
    h = hash_password(PASSWORD)
    assert verify_password(PASSWORD, h)
    assert not verify_password("wrong_password", h)


def test_create_token_claims():
    token = create_token("user-123", "biz-456", "ADMIN")
    claims = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    assert claims["sub"] == "user-123"
    assert claims["bid"] == "biz-456"
    assert claims["role"] == "ADMIN"


def test_login_success_and_jwt_format(client_and_user):
    client, user = client_and_user
    res = client.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "token" in body["data"]
    token = body["data"]["token"]

    # Decode and check token claims
    claims = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    assert claims["sub"] == user.id
    assert claims["bid"] == user.business_id
    assert claims["role"] == user.role
    assert body["data"]["user"]["email"] == EMAIL


def test_login_invalid_password(client_and_user):
    client, _ = client_and_user
    res = client.post("/api/v1/auth/login", json={"email": EMAIL, "password": "wrong_password"})
    assert res.status_code == 401


def test_login_nonexistent_user(client_and_user):
    client, _ = client_and_user
    res = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": PASSWORD})
    assert res.status_code == 401


def test_me_with_valid_jwt(client_and_user):
    client, user = client_and_user
    token = create_token(user.id, user.business_id, user.role)
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["id"] == user.id
    assert body["data"]["email"] == EMAIL
    assert body["data"]["role"] == "ADMIN"
    assert "password_hash" not in body["data"]


def test_me_unauthenticated_rejects(client_and_user):
    client, _ = client_and_user
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_me_tampered_token_rejects(client_and_user):
    client, _ = client_and_user
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.valid.jwt"})
    assert res.status_code == 401


def test_me_wrong_secret_token_rejects(client_and_user):
    client, user = client_and_user
    # Token signed with a completely different secret
    forged_token = jwt.encode(
        {"sub": user.id, "bid": user.business_id, "role": user.role},
        "wrong-secret-key-123456",
        algorithm="HS256",
    )
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
    assert res.status_code == 401
