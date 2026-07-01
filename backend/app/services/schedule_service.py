from datetime import datetime

from fastapi import HTTPException, status

from app.repositories.schedule_repository import ScheduleRepository
from app.schemas.schedule import ScheduleCreate, TeamMemberCreate


def _parse_datetime(value: str, field_name: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be an ISO date-time string.",
        ) from exc


class ScheduleService:
    def __init__(self, repository: ScheduleRepository | None = None) -> None:
        self.repository = repository or ScheduleRepository()

    def list_team_members(self, active: bool | None = None) -> list[dict]:
        return self.repository.list_team_members(active=active)

    def create_team_member(self, payload: TeamMemberCreate) -> dict:
        return self.repository.create_team_member(payload)

    def update_team_member(self, member_id: int, payload: TeamMemberCreate) -> dict:
        member = self.repository.update_team_member(member_id, payload)
        if member is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")
        return member

    def delete_team_member(self, member_id: int) -> dict:
        if self.repository.get_team_member(member_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")
        schedule_count = self.repository.count_schedules_for_member(member_id)
        if schedule_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Team member has schedules and cannot be deleted.",
            )
        self.repository.delete_team_member(member_id)
        return {"deleted": True}

    def set_team_member_active(self, member_id: int, active: bool) -> dict:
        member = self.repository.set_team_member_active(member_id, active)
        if member is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")
        return member

    def list_schedules(
        self,
        *,
        start_date: str | None = None,
        end_date: str | None = None,
        user_id: int | None = None,
        schedule_type: str | None = None,
    ) -> list[dict]:
        return self.repository.list_schedules(
            start_date=start_date,
            end_date=end_date,
            user_id=user_id,
            schedule_type=schedule_type,
        )

    def create_schedule(self, payload: ScheduleCreate) -> dict:
        self._validate_schedule_payload(payload)
        item = self.repository.create_schedule(payload)
        conflicts = self.repository.list_conflicts(
            user_id=payload.user_id,
            start_at=payload.start_at,
            end_at=payload.end_at,
            exclude_schedule_id=item["id"],
        )
        return {"item": item, "conflicts": conflicts}

    def update_schedule(self, schedule_id: int, payload: ScheduleCreate) -> dict:
        self._validate_schedule_payload(payload)
        item = self.repository.update_schedule(schedule_id, payload)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
        conflicts = self.repository.list_conflicts(
            user_id=payload.user_id,
            start_at=payload.start_at,
            end_at=payload.end_at,
            exclude_schedule_id=schedule_id,
        )
        return {"item": item, "conflicts": conflicts}

    def delete_schedule(self, schedule_id: int) -> dict:
        deleted = self.repository.delete_schedule(schedule_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
        return {"deleted": True}

    def _validate_schedule_payload(self, payload: ScheduleCreate) -> None:
        member = self.repository.get_team_member(payload.user_id)
        if member is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")
        if not member["active"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive team member cannot receive new schedules.",
            )

        start_at = _parse_datetime(payload.start_at, "start_at")
        end_at = _parse_datetime(payload.end_at, "end_at")
        if end_at <= start_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_at must be later than start_at.",
            )
