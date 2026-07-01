from typing import Literal

from pydantic import BaseModel, Field, field_validator


Role = Literal["member", "manager", "admin"]
ScheduleType = Literal["vacation", "work", "business_trip", "training", "other"]
ScheduleStatus = Literal["confirmed", "tentative", "cancelled"]


class TeamMemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    department: str | None = Field(default=None, max_length=120)
    role: Role = "member"

    @field_validator("name", "department", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class TeamMemberUpdate(TeamMemberCreate):
    pass


class TeamMember(BaseModel):
    id: int
    name: str
    department: str | None
    role: Role
    active: bool
    created_at: str


class ScheduleCreate(BaseModel):
    user_id: int
    title: str = Field(min_length=1, max_length=160)
    schedule_type: ScheduleType
    start_at: str
    end_at: str
    is_all_day: bool = False
    location: str | None = Field(default=None, max_length=160)
    status: ScheduleStatus = "confirmed"
    memo: str | None = Field(default=None, max_length=1000)

    @field_validator("title", "location", "memo", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class ScheduleUpdate(ScheduleCreate):
    pass


class Schedule(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_department: str | None
    title: str
    schedule_type: ScheduleType
    start_at: str
    end_at: str
    is_all_day: bool
    location: str | None
    status: ScheduleStatus
    memo: str | None
    created_at: str
    updated_at: str


class ScheduleSaveResponse(BaseModel):
    item: Schedule
    conflicts: list[Schedule]
