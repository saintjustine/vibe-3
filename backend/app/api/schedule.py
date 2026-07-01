from fastapi import APIRouter, Query

from app.schemas.schedule import (
    Schedule,
    ScheduleCreate,
    ScheduleSaveResponse,
    ScheduleType,
    ScheduleUpdate,
    TeamMember,
    TeamMemberCreate,
    TeamMemberUpdate,
)
from app.services.schedule_service import ScheduleService


router = APIRouter()
service = ScheduleService()


@router.get("/team-members", response_model=dict[str, list[TeamMember]])
def list_team_members(active: bool | None = Query(default=None)) -> dict:
    return {"items": service.list_team_members(active=active)}


@router.post("/team-members", response_model=TeamMember, status_code=201)
def create_team_member(payload: TeamMemberCreate) -> dict:
    return service.create_team_member(payload)


@router.put("/team-members/{member_id}", response_model=TeamMember)
def update_team_member(member_id: int, payload: TeamMemberUpdate) -> dict:
    return service.update_team_member(member_id, payload)


@router.delete("/team-members/{member_id}")
def delete_team_member(member_id: int) -> dict:
    return service.delete_team_member(member_id)


@router.patch("/team-members/{member_id}/deactivate", response_model=TeamMember)
def deactivate_team_member(member_id: int) -> dict:
    return service.set_team_member_active(member_id, False)


@router.patch("/team-members/{member_id}/activate", response_model=TeamMember)
def activate_team_member(member_id: int) -> dict:
    return service.set_team_member_active(member_id, True)


@router.get("/schedules", response_model=dict[str, list[Schedule]])
def list_schedules(
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    user_id: int | None = Query(default=None),
    schedule_type: ScheduleType | None = Query(default=None),
) -> dict:
    return {
        "items": service.list_schedules(
            start_date=start_date,
            end_date=end_date,
            user_id=user_id,
            schedule_type=schedule_type,
        )
    }


@router.post("/schedules", response_model=ScheduleSaveResponse, status_code=201)
def create_schedule(payload: ScheduleCreate) -> dict:
    return service.create_schedule(payload)


@router.put("/schedules/{schedule_id}", response_model=ScheduleSaveResponse)
def update_schedule(schedule_id: int, payload: ScheduleUpdate) -> dict:
    return service.update_schedule(schedule_id, payload)


@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int) -> dict:
    return service.delete_schedule(schedule_id)
