from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class LoginRequest(BaseModel):
    email: str | None = Field(default=None, max_length=320)
    username: str | None = Field(default=None, max_length=320)
    password: str = Field(min_length=1, max_length=512)

    @model_validator(mode="after")
    def require_identifier(self) -> "LoginRequest":
        if not (self.email or "").strip() and not (self.username or "").strip():
            raise ValueError("Email or username is required")
        return self

    @property
    def identifier(self) -> str:
        return (self.username or self.email or "").strip().lower()


class ReportCreate(BaseModel):
    anonymous: bool = True
    reporter_email: str = ""
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=5000)
    category: str = Field(min_length=1, max_length=120)
    category_code: str = Field(default="", max_length=40)
    subcategory: str = Field(default="", max_length=160)
    address: str = Field(min_length=1, max_length=300)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    zone_code: str = ""
    turnstile_token: str = ""

    @field_validator(
        "title",
        "description",
        "category",
        "category_code",
        "subcategory",
        "address",
        "reporter_email",
        "zone_code",
    )
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class TrackBatchRequest(BaseModel):
    codes: list[str] = Field(min_length=1, max_length=25)

    @field_validator("codes")
    @classmethod
    def normalize_codes(cls, values: list[str]) -> list[str]:
        result: list[str] = []
        for value in values:
            code = value.upper().strip()
            if code and code not in result:
                result.append(code)
        if not result:
            raise ValueError("At least one tracking code is required")
        return result


class ReviewRequest(BaseModel):
    decision: Literal["under_review", "accepted", "rejected"]
    priority: Literal["low", "normal", "high", "urgent"] = "normal"
    department_id: str = ""
    duplicate_of: str = ""
    note: str = Field(default="", max_length=2000)


class AssignRequest(BaseModel):
    department_id: str = ""
    assigned_to: str = ""
    note: str = Field(default="", max_length=2000)


class StatusRequest(BaseModel):
    status: Literal["in_progress", "blocked", "resolved"]
    note: str = Field(default="", max_length=5000)


class CommentRequest(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class LocationRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_meters: float | None = Field(default=None, ge=0)
    recorded_at: datetime | None = None


class CompleteRequest(BaseModel):
    note: str = Field(min_length=1, max_length=5000)
    tags: list[str] = Field(default_factory=list, max_length=30)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class UnableRequest(BaseModel):
    reason: Literal[
        "notfound", "materials", "team", "location", "bigger", "safety", "other"
    ]
    note: str = Field(default="", max_length=2000)
    photo_file_id: str = ""


class HazardRequest(BaseModel):
    category: Literal["people", "electric", "traffic", "infra", "other"]
    note: str = Field(default="", max_length=2000)
    photo_file_id: str = ""
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class HazardUpdateRequest(BaseModel):
    status: Literal["acknowledged", "resolved"]


class UserCreate(BaseModel):
    email: str
    username: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9._-]{2,63}$")
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=8, max_length=512)
    role: Literal[
        "admin",
        "municipal_authority",
        "clerk",
        "department_authority",
        "operative_staff",
    ]
    department_id: str = ""


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9._-]{2,63}$")
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    password: str | None = Field(default=None, min_length=8, max_length=512)
    role: (
        Literal[
            "admin",
            "municipal_authority",
            "clerk",
            "department_authority",
            "operative_staff",
        ]
        | None
    ) = None
    department_id: str | None = None
    active: bool | None = None


class TargetPut(BaseModel):
    target_value: float
    department_id: str = ""


class IndicatorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    numerator: Literal[
        "resolved_sla",
        "resolved",
        "received",
        "reappeared",
        "reopened",
        "verified",
        "sla_breaches",
    ]
    denominator: Literal["resolved", "received"] | None = None
    department_id: str = ""
    period: Literal["week", "month", "quarter"] = "month"
    comparison: Literal["previous", "year_over_year"] = "previous"
    display: Literal["number", "percent"] = "number"
    pinned: bool = False


class IndicatorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    numerator: str | None = None
    denominator: str | None = None
    department_id: str | None = None
    period: str | None = None
    comparison: str | None = None
    display: str | None = None
    pinned: bool | None = None


class AssistantRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class ScheduleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    frequency: Literal["daily", "weekly", "monthly"]
    run_time: str
    day_of_week: int | None = Field(default=None, ge=1, le=7)
    day_of_month: int | None = Field(default=None, ge=1, le=28)
    recipients: list[str] = Field(default_factory=list)
    formats: list[str] = Field(default_factory=lambda: ["csv"])
    filters: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    timezone: str = "Europe/Tirane"


class SyncOperation(BaseModel):
    client_operation_id: str = Field(min_length=1, max_length=120)
    operation_type: Literal[
        "start",
        "comment",
        "location",
        "complete",
        "unable",
        "hazard",
        "notification_read",
    ]
    report_id: str = ""
    payload: dict[str, Any] = Field(default_factory=dict)


class SyncRequest(BaseModel):
    operations: list[SyncOperation] = Field(max_length=100)
