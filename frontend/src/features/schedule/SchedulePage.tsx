import { FormEvent, useEffect, useState } from "react";
import {
  createSchedule,
  createTeamMember,
  deleteSchedule,
  deleteTeamMember,
  listSchedules,
  listTeamMembers,
  updateSchedule,
  updateTeamMember,
} from "./scheduleApi";
import type {
  Schedule,
  SchedulePayload,
  ScheduleType,
  TeamMember,
  TeamMemberPayload,
  TeamMemberRole,
} from "./scheduleTypes";

type ViewMode = "week" | "month";
type Notice = { tone: "success" | "warning" | "error"; text: string };

const scheduleTypeOptions: { value: ScheduleType; label: string }[] = [
  { value: "vacation", label: "휴가" },
  { value: "work", label: "근무" },
  { value: "business_trip", label: "출장" },
  { value: "training", label: "교육" },
  { value: "other", label: "기타" },
];

const roleOptions: { value: TeamMemberRole; label: string }[] = [
  { value: "member", label: "팀원" },
  { value: "manager", label: "팀장" },
  { value: "admin", label: "관리자" },
];

const emptyMemberForm: TeamMemberPayload = {
  name: "",
  department: "",
  role: "member",
};

const today = new Date();
const initialScheduleForm = (): SchedulePayload => ({
  user_id: 0,
  title: "",
  schedule_type: "work",
  start_at: toDateTimeInputValue(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9)),
  end_at: toDateTimeInputValue(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18)),
  memo: "",
});

export function SchedulePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(toDateInputValue(today));
  const [memberFilter, setMemberFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [memberForm, setMemberForm] = useState<TeamMemberPayload>(emptyMemberForm);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState<SchedulePayload>(initialScheduleForm);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  const range = viewMode === "week" ? getWeekRange(anchorDate) : getMonthRange(anchorDate);

  useEffect(() => {
    void loadMembers();
  }, []);

  useEffect(() => {
    void loadSchedules();
  }, [anchorDate, memberFilter, typeFilter, viewMode]);

  async function loadMembers() {
    try {
      const data = await listTeamMembers();
      setMembers(data);
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function loadSchedules() {
    setLoading(true);
    try {
      const data = await listSchedules({
        startDate: range.start,
        endDate: range.end,
        userId: memberFilter ? Number(memberFilter) : undefined,
        scheduleType: typeFilter ? (typeFilter as ScheduleType) : undefined,
      });
      setSchedules(data);
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const payload = normalizeMemberPayload(memberForm);
      if (editingMemberId) {
        await updateTeamMember(editingMemberId, payload);
        setNotice({ tone: "success", text: "팀원 정보를 수정했습니다." });
      } else {
        await createTeamMember(payload);
        setNotice({ tone: "success", text: "팀원을 등록했습니다." });
      }
      setMemberForm(emptyMemberForm);
      setEditingMemberId(null);
      await loadMembers();
      await loadSchedules();
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function handleMemberDelete(memberId: number) {
    try {
      await deleteTeamMember(memberId);
      setNotice({ tone: "success", text: "팀원을 삭제했습니다." });
      if (memberFilter === String(memberId)) {
        setMemberFilter("");
      }
      await loadMembers();
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (members.length === 0) {
      setNotice({ tone: "warning", text: "일정을 등록하려면 팀원을 먼저 등록하세요." });
      return;
    }

    try {
      const payload = normalizeSchedulePayload(scheduleForm, members);
      const result = editingScheduleId
        ? await updateSchedule(editingScheduleId, payload)
        : await createSchedule(payload);
      setScheduleForm({ ...initialScheduleForm(), user_id: payload.user_id });
      setEditingScheduleId(null);
      setNotice({
        tone: result.conflicts.length > 0 ? "warning" : "success",
        text:
          result.conflicts.length > 0
            ? `저장했습니다. 단, 같은 팀원의 겹치는 일정 ${result.conflicts.length}건이 있습니다.`
            : "일정을 저장했습니다.",
      });
      await loadSchedules();
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function handleScheduleDelete(scheduleId: number) {
    try {
      await deleteSchedule(scheduleId);
      setNotice({ tone: "success", text: "일정을 삭제했습니다." });
      if (editingScheduleId === scheduleId) {
        setEditingScheduleId(null);
        setScheduleForm(initialScheduleForm());
      }
      await loadSchedules();
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  function beginMemberEdit(member: TeamMember) {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name,
      department: member.department ?? "",
      role: member.role,
    });
  }

  function beginScheduleEdit(schedule: Schedule) {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      user_id: schedule.user_id,
      title: schedule.title,
      schedule_type: schedule.schedule_type,
      start_at: schedule.start_at,
      end_at: schedule.end_at,
      memo: schedule.memo ?? "",
    });
  }

  return (
    <article className="panel schedule-page">
      <div className="schedule-heading">
        <div>
          <span className="panel-label">Schedule MVP</span>
          <h2>팀원 일정 관리</h2>
          <p>팀원을 등록하고 휴가, 근무, 출장 등 일정을 주간 표와 월간 캘린더로 확인합니다.</p>
        </div>
        <div className="view-toggle" aria-label="일정 보기 방식">
          <button className={viewMode === "week" ? "active" : ""} type="button" onClick={() => setViewMode("week")}>
            주간 보기
          </button>
          <button className={viewMode === "month" ? "active" : ""} type="button" onClick={() => setViewMode("month")}>
            월간 보기
          </button>
        </div>
      </div>

      {notice ? <p className={`notice ${notice.tone}`}>{notice.text}</p> : null}

      <section className="schedule-layout">
        <aside className="team-panel">
          <h3>팀원 관리</h3>
          <form className="stacked-form" onSubmit={handleMemberSubmit}>
            <label>
              이름
              <input
                required
                value={memberForm.name}
                onChange={(event) => setMemberForm({ ...memberForm, name: event.target.value })}
                placeholder="홍길동"
              />
            </label>
            <label>
              부서
              <input
                value={memberForm.department ?? ""}
                onChange={(event) => setMemberForm({ ...memberForm, department: event.target.value })}
                placeholder="행정지원팀"
              />
            </label>
            <label>
              역할
              <select
                value={memberForm.role}
                onChange={(event) =>
                  setMemberForm({ ...memberForm, role: event.target.value as TeamMemberRole })
                }
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="button-row">
              <button className="primary-button" type="submit">
                {editingMemberId ? "팀원 수정" : "팀원 등록"}
              </button>
              {editingMemberId ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingMemberId(null);
                    setMemberForm(emptyMemberForm);
                  }}
                >
                  취소
                </button>
              ) : null}
            </div>
          </form>

          <div className="member-list">
            {members.length === 0 ? <p className="empty-text">등록된 팀원이 없습니다.</p> : null}
            {members.map((member) => (
              <div className="member-card" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <span>
                    {member.department ?? "부서 미지정"} · {roleLabel(member.role)}
                  </span>
                </div>
                <div>
                  <button type="button" onClick={() => beginMemberEdit(member)}>
                    수정
                  </button>
                  <button type="button" onClick={() => void handleMemberDelete(member.id)}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="calendar-panel">
          <div className="filter-bar">
            <label>
              기준일
              <input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
            </label>
            <label>
              팀원
              <select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}>
                <option value="">전체</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              유형
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">전체</option>
                {scheduleTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <form className="schedule-form" onSubmit={handleScheduleSubmit}>
            <label>
              팀원
              <select
                required
                value={scheduleForm.user_id || ""}
                onChange={(event) => setScheduleForm({ ...scheduleForm, user_id: Number(event.target.value) })}
              >
                <option value="">선택</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              일정명
              <input
                required
                value={scheduleForm.title}
                onChange={(event) => setScheduleForm({ ...scheduleForm, title: event.target.value })}
                placeholder="오전 출장"
              />
            </label>
            <label>
              유형
              <select
                value={scheduleForm.schedule_type}
                onChange={(event) =>
                  setScheduleForm({ ...scheduleForm, schedule_type: event.target.value as ScheduleType })
                }
              >
                {scheduleTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              시작
              <input
                required
                type="datetime-local"
                value={scheduleForm.start_at}
                onChange={(event) => setScheduleForm({ ...scheduleForm, start_at: event.target.value })}
              />
            </label>
            <label>
              종료
              <input
                required
                type="datetime-local"
                value={scheduleForm.end_at}
                onChange={(event) => setScheduleForm({ ...scheduleForm, end_at: event.target.value })}
              />
            </label>
            <label className="memo-field">
              메모
              <input
                value={scheduleForm.memo ?? ""}
                onChange={(event) => setScheduleForm({ ...scheduleForm, memo: event.target.value })}
                placeholder="필요한 전달사항"
              />
            </label>
            <div className="button-row">
              <button className="primary-button" type="submit">
                {editingScheduleId ? "일정 수정" : "일정 등록"}
              </button>
              {editingScheduleId ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingScheduleId(null);
                    setScheduleForm(initialScheduleForm());
                  }}
                >
                  취소
                </button>
              ) : null}
            </div>
          </form>

          <div className="range-title">
            <strong>{viewMode === "week" ? "주간 일정표" : "월간 캘린더"}</strong>
            <span>
              {formatDate(range.start)} - {formatDate(range.end)}
            </span>
          </div>

          {loading ? (
            <p className="empty-text">일정을 불러오는 중입니다.</p>
          ) : viewMode === "week" ? (
            <WeeklyScheduleTable
              schedules={schedules}
              onEdit={beginScheduleEdit}
              onDelete={(scheduleId) => void handleScheduleDelete(scheduleId)}
            />
          ) : (
            <MonthlyCalendar
              anchorDate={anchorDate}
              schedules={schedules}
              onEdit={beginScheduleEdit}
              onDelete={(scheduleId) => void handleScheduleDelete(scheduleId)}
            />
          )}
        </section>
      </section>
    </article>
  );
}

function WeeklyScheduleTable({
  schedules,
  onEdit,
  onDelete,
}: {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (scheduleId: number) => void;
}) {
  if (schedules.length === 0) {
    return <p className="empty-text">선택한 기간에 등록된 일정이 없습니다.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="schedule-table">
        <thead>
          <tr>
            <th>일시</th>
            <th>팀원</th>
            <th>유형</th>
            <th>일정</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule) => (
            <tr key={schedule.id}>
              <td>
                {formatDateTime(schedule.start_at)}
                <br />
                {formatDateTime(schedule.end_at)}
              </td>
              <td>{schedule.user_name}</td>
              <td>
                <span className={`type-pill ${schedule.schedule_type}`}>
                  {scheduleTypeLabel(schedule.schedule_type)}
                </span>
              </td>
              <td>
                <strong>{schedule.title}</strong>
                {schedule.memo ? <span>{schedule.memo}</span> : null}
              </td>
              <td>
                <button type="button" onClick={() => onEdit(schedule)}>
                  수정
                </button>
                <button type="button" onClick={() => onDelete(schedule.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyCalendar({
  anchorDate,
  schedules,
  onEdit,
  onDelete,
}: {
  anchorDate: string;
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (scheduleId: number) => void;
}) {
  const cells = getMonthCells(anchorDate);

  return (
    <div className="month-grid">
      {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
        <strong className="weekday" key={day}>
          {day}
        </strong>
      ))}
      {cells.map((cell) => {
        const daySchedules = schedules.filter((schedule) => scheduleTouchesDay(schedule, cell.date));
        return (
          <div className={cell.inMonth ? "day-cell" : "day-cell muted"} key={cell.key}>
            <span>{cell.date.getDate()}</span>
            {daySchedules.map((schedule) => (
              <div className={`calendar-event ${schedule.schedule_type}`} key={schedule.id}>
                <button type="button" onClick={() => onEdit(schedule)}>
                  {schedule.user_name} · {schedule.title}
                </button>
                <button aria-label={`${schedule.title} 삭제`} type="button" onClick={() => onDelete(schedule.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function normalizeMemberPayload(payload: TeamMemberPayload): TeamMemberPayload {
  return {
    name: payload.name.trim(),
    department: payload.department?.trim() || null,
    role: payload.role,
  };
}

function normalizeSchedulePayload(payload: SchedulePayload, members: TeamMember[]): SchedulePayload {
  return {
    ...payload,
    user_id: payload.user_id || members[0]?.id || 0,
    title: payload.title.trim(),
    memo: payload.memo?.trim() || null,
  };
}

function getWeekRange(value: string) {
  const date = dateFromInput(value);
  const day = date.getDay() || 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: toDateTimeInputValue(start), end: toDateTimeInputValue(end) };
}

function getMonthRange(value: string) {
  const date = dateFromInput(value);
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: toDateTimeInputValue(start), end: toDateTimeInputValue(end) };
}

function getMonthCells(value: string) {
  const date = dateFromInput(value);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDay = first.getDay() || 7;
  const start = new Date(first);
  start.setDate(first.getDate() - firstDay + 1);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + index);
    return {
      key: toDateInputValue(cellDate),
      date: cellDate,
      inMonth: cellDate.getMonth() === date.getMonth(),
    };
  });
}

function scheduleTouchesDay(schedule: Schedule, date: Date) {
  const start = new Date(schedule.start_at);
  const end = new Date(schedule.end_at);
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDateTimeInputValue(date: Date) {
  return `${toDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role: TeamMemberRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function scheduleTypeLabel(type: ScheduleType) {
  return scheduleTypeOptions.find((option) => option.value === type)?.label ?? type;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}
