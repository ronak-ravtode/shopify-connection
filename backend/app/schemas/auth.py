from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    name: str = "Admin"
    email: str
    password: str
    business_name: str | None = None

