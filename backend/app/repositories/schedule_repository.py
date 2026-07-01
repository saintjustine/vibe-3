from sqlite3 import Row

from app.core.database import get_connection
from app.schemas.schedule import ScheduleCreate, TeamMemberCreate


def _team_member_from_row(row: Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "department": row["department"],
        "role": row["role"],
        "active": bool(row["active"]),
        "created_at": row["created_at"],
    }


def _schedule_from_row(row: Row) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "user_name": row["user_name"],
        "user_department": row["user_department"],
        "title": row["title"],
        "schedule_type": row["schedule_type"],
        "start_at": row["start_at"],
        "end_at": row["end_at"],
        "is_all_day": bool(row["is_all_day"]),
        "location": row["location"],
        "status": row["status"],
        "memo": row["memo"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


class ScheduleRepository:
    def list_team_members(self, active: bool | None = None) -> list[dict]:
        params: list[object] = []
        where_clause = ""
        if active is not None:
            where_clause = "WHERE active = ?"
            params.append(1 if active else 0)

        with get_connection() as connection:
            rows = connection.execute(
                f"""
                SELECT id, name, department, role, active, created_at
                FROM users
                {where_clause}
                ORDER BY name COLLATE NOCASE, id
                """,
                params,
            ).fetchall()
        return [_team_member_from_row(row) for row in rows]

    def get_team_member(self, member_id: int) -> dict | None:
        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT id, name, department, role, active, created_at
                FROM users
                WHERE id = ?
                """,
                (member_id,),
            ).fetchone()
        return _team_member_from_row(row) if row else None

    def create_team_member(self, payload: TeamMemberCreate) -> dict:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (name, department, role, active)
                VALUES (?, ?, ?, 1)
                """,
                (payload.name, payload.department, payload.role),
            )
            connection.commit()
            member_id = cursor.lastrowid
        member = self.get_team_member(int(member_id))
        if member is None:
            raise RuntimeError("Created team member could not be loaded.")
        return member

    def update_team_member(self, member_id: int, payload: TeamMemberCreate) -> dict | None:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                UPDATE users
                SET name = ?, department = ?, role = ?
                WHERE id = ?
                """,
                (payload.name, payload.department, payload.role, member_id),
            )
            connection.commit()
            if cursor.rowcount == 0:
                return None
        return self.get_team_member(member_id)

    def count_schedules_for_member(self, member_id: int) -> int:
        with get_connection() as connection:
            row = connection.execute(
                "SELECT COUNT(*) AS count FROM schedules WHERE user_id = ?",
                (member_id,),
            ).fetchone()
        return int(row["count"])

    def delete_team_member(self, member_id: int) -> bool:
        with get_connection() as connection:
            cursor = connection.execute("DELETE FROM users WHERE id = ?", (member_id,))
            connection.commit()
        return cursor.rowcount > 0

    def set_team_member_active(self, member_id: int, active: bool) -> dict | None:
        with get_connection() as connection:
            cursor = connection.execute(
                "UPDATE users SET active = ? WHERE id = ?",
                (1 if active else 0, member_id),
            )
            connection.commit()
            if cursor.rowcount == 0:
                return None
        return self.get_team_member(member_id)

    def list_schedules(
        self,
        *,
        start_date: str | None = None,
        end_date: str | None = None,
        user_id: int | None = None,
        schedule_type: str | None = None,
    ) -> list[dict]:
        conditions: list[str] = []
        params: list[object] = []

        if start_date:
            conditions.append("s.end_at >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("s.start_at <= ?")
            params.append(end_date)
        if user_id:
            conditions.append("s.user_id = ?")
            params.append(user_id)
        if schedule_type:
            conditions.append("s.schedule_type = ?")
            params.append(schedule_type)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        with get_connection() as connection:
            rows = connection.execute(
                f"""
                SELECT
                    s.id,
                    s.user_id,
                    u.name AS user_name,
                    u.department AS user_department,
                    s.title,
                    s.schedule_type,
                    s.start_at,
                    s.end_at,
                    s.is_all_day,
                    s.location,
                    s.status,
                    s.memo,
                    s.created_at,
                    s.updated_at
                FROM schedules s
                JOIN users u ON u.id = s.user_id
                {where_clause}
                ORDER BY s.start_at, s.end_at, s.id
                """,
                params,
            ).fetchall()
        return [_schedule_from_row(row) for row in rows]

    def get_schedule(self, schedule_id: int) -> dict | None:
        schedules = self.list_schedules()
        return next((schedule for schedule in schedules if schedule["id"] == schedule_id), None)

    def create_schedule(self, payload: ScheduleCreate) -> dict:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO schedules (
                    user_id,
                    title,
                    schedule_type,
                    start_at,
                    end_at,
                    is_all_day,
                    location,
                    status,
                    memo
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.user_id,
                    payload.title,
                    payload.schedule_type,
                    payload.start_at,
                    payload.end_at,
                    1 if payload.is_all_day else 0,
                    payload.location,
                    payload.status,
                    payload.memo,
                ),
            )
            connection.commit()
            schedule_id = cursor.lastrowid
        schedule = self.get_schedule(int(schedule_id))
        if schedule is None:
            raise RuntimeError("Created schedule could not be loaded.")
        return schedule

    def update_schedule(self, schedule_id: int, payload: ScheduleCreate) -> dict | None:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                UPDATE schedules
                SET
                    user_id = ?,
                    title = ?,
                    schedule_type = ?,
                    start_at = ?,
                    end_at = ?,
                    is_all_day = ?,
                    location = ?,
                    status = ?,
                    memo = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    payload.user_id,
                    payload.title,
                    payload.schedule_type,
                    payload.start_at,
                    payload.end_at,
                    1 if payload.is_all_day else 0,
                    payload.location,
                    payload.status,
                    payload.memo,
                    schedule_id,
                ),
            )
            connection.commit()
            if cursor.rowcount == 0:
                return None
        return self.get_schedule(schedule_id)

    def delete_schedule(self, schedule_id: int) -> bool:
        with get_connection() as connection:
            cursor = connection.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
            connection.commit()
        return cursor.rowcount > 0

    def list_conflicts(
        self,
        *,
        user_id: int,
        start_at: str,
        end_at: str,
        exclude_schedule_id: int | None = None,
    ) -> list[dict]:
        params: list[object] = [user_id, end_at, start_at]
        exclude_clause = ""
        if exclude_schedule_id is not None:
            exclude_clause = "AND s.id != ?"
            params.append(exclude_schedule_id)

        with get_connection() as connection:
            rows = connection.execute(
                f"""
                SELECT
                    s.id,
                    s.user_id,
                    u.name AS user_name,
                    u.department AS user_department,
                    s.title,
                    s.schedule_type,
                    s.start_at,
                    s.end_at,
                    s.is_all_day,
                    s.location,
                    s.status,
                    s.memo,
                    s.created_at,
                    s.updated_at
                FROM schedules s
                JOIN users u ON u.id = s.user_id
                WHERE s.user_id = ?
                  AND s.start_at < ?
                  AND s.end_at > ?
                  {exclude_clause}
                ORDER BY s.start_at, s.end_at, s.id
                """,
                params,
            ).fetchall()
        return [_schedule_from_row(row) for row in rows]
