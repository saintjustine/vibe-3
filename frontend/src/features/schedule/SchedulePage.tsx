import { FormEvent, useEffect, useState } from "react";
import {
  activateTeamMember,
  createSchedule,
  createTeamMember,
  deactivateTeamMember,
  deleteSchedule,
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
type ScheduleModalState = { mode: "create" | "edit"; schedule?: Schedule; date?: Date; memberId?: number } | null;

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

export function SchedulePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(toDateInputValue(today));
  const [memberFilter, setMemberFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showInactiveMembers, setShowInactiveMembers] = useState(false);
  const [memberForm, setMemberForm] = useState<TeamMemberPayload>(emptyMemberForm);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [modal, setModal] = useState<ScheduleModalState>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  const activeMembers = members.filter((member) => member.active);
  const visibleMembers = showInactiveMembers ? members : activeMembers;
  const range = viewMode === "week" ? getWeekRange(anchorDate) : getMonthRange(anchorDate);
  const summary = getScheduleSummary(schedules, activeMembers, anchorDate);

  useEffect(() => {
    void loadMembers();
  }, []);

  useEffect(() => {
    void loadSchedules();
  }, [anchorDate, memberFilter, typeFilter, viewMode]);

  async function loadMembers() {
    try {
      setMembers(await listTeamMembers());
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function loadSchedules() {
    setLoading(true);
    try {
      setSchedules(
        await listSchedules({
          startDate: range.start,
          endDate: range.end,
          userId: memberFilter ? Number(memberFilter) : undefined,
          scheduleType: typeFilter ? (typeFilter as ScheduleType) : undefined,
        }),
      );
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
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function handleMemberActiveToggle(member: TeamMember) {
    try {
      if (member.active) {
        await deactivateTeamMember(member.id);
        setNotice({ tone: "success", text: `${member.name} 팀원을 비활성화했습니다.` });
      } else {
        await activateTeamMember(member.id);
        setNotice({ tone: "success", text: `${member.name} 팀원을 다시 활성화했습니다.` });
      }
      await loadMembers();
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function handleScheduleSubmit(payload: SchedulePayload) {
    try {
      const result = modal?.mode === "edit" && modal.schedule
        ? await updateSchedule(modal.schedule.id, payload)
        : await createSchedule(payload);
      setModal(null);
      setNotice({
        tone: result.conflicts.length > 0 ? "warning" : "success",
        text:
          result.conflicts.length > 0
            ? `저장했습니다. 같은 팀원의 겹치는 일정 ${result.conflicts.length}건이 있습니다.`
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
      setModal(null);
      setNotice({ tone: "success", text: "일정을 삭제했습니다." });
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

  function moveRange(delta: number) {
    const date = dateFromInput(anchorDate);
    if (viewMode === "week") {
      date.setDate(date.getDate() + delta * 7);
    } else {
      date.setMonth(date.getMonth() + delta);
    }
    setAnchorDate(toDateInputValue(date));
  }

  return (
    <article className="panel schedule-page schedule-dashboard">
      <div className="schedule-topbar">
        <div>
          <span className="panel-label">Schedule Board</span>
          <h2>팀 일정 상황판</h2>
          <p>주간 인력 공백과 월간 일정을 한 화면에서 확인하고, 날짜를 클릭해 바로 등록합니다.</p>
        </div>
        <div className="schedule-actions">
          <button type="button" onClick={() => setAnchorDate(toDateInputValue(today))}>
            오늘
          </button>
          <button type="button" onClick={() => moveRange(-1)}>
            이전
          </button>
          <strong>{viewMode === "week" ? formatRangeLabel(range) : formatMonthLabel(anchorDate)}</strong>
          <button type="button" onClick={() => moveRange(1)}>
            다음
          </button>
          <div className="view-toggle" aria-label="일정 보기 방식">
            <button className={viewMode === "week" ? "active" : ""} type="button" onClick={() => setViewMode("week")}>
              주간
            </button>
            <button className={viewMode === "month" ? "active" : ""} type="button" onClick={() => setViewMode("month")}>
              월간
            </button>
          </div>
          <button className="primary-button" type="button" onClick={() => setModal({ mode: "create", date: dateFromInput(anchorDate) })}>
            일정 등록
          </button>
        </div>
      </div>

      {notice ? <p className={`notice ${notice.tone}`}>{notice.text}</p> : null}

      <section className="schedule-board-grid">
        <aside className="team-panel schedule-sidebar">
          <div className="summary-grid">
            <SummaryCard label="활성 팀원" value={`${activeMembers.length}명`} />
            <SummaryCard label="이번 기간 일정" value={`${schedules.length}건`} />
            <SummaryCard label="오늘 부재" value={`${summary.todayAwayCount}명`} emphasis />
            <SummaryCard label="출장/교육" value={`${summary.fieldWorkCount}건`} />
          </div>

          <section className="absence-box">
            <h3>오늘 부재자</h3>
            {summary.todayAway.length === 0 ? (
              <p className="empty-text">오늘 등록된 휴가/출장/교육 일정이 없습니다.</p>
            ) : (
              summary.todayAway.map((schedule) => (
                <button className={`absence-item ${schedule.schedule_type}`} key={schedule.id} type="button" onClick={() => setModal({ mode: "edit", schedule })}>
                  <strong>{schedule.user_name}</strong>
                  <span>{scheduleTypeLabel(schedule.schedule_type)} · {schedule.title}</span>
                </button>
              ))
            )}
          </section>

          <section className="member-admin">
            <div className="section-title-row">
              <h3>팀원 관리</h3>
              <label className="inline-check">
                <input
                  checked={showInactiveMembers}
                  type="checkbox"
                  onChange={(event) => setShowInactiveMembers(event.target.checked)}
                />
                비활성 포함
              </label>
            </div>
            <form className="stacked-form compact" onSubmit={handleMemberSubmit}>
              <label>
                이름
                <input required value={memberForm.name} onChange={(event) => setMemberForm({ ...memberForm, name: event.target.value })} />
              </label>
              <label>
                부서
                <input value={memberForm.department ?? ""} onChange={(event) => setMemberForm({ ...memberForm, department: event.target.value })} />
              </label>
              <label>
                역할
                <select value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value as TeamMemberRole })}>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="button-row">
                <button className="primary-button" type="submit">{editingMemberId ? "수정" : "등록"}</button>
                {editingMemberId ? (
                  <button className="ghost-button" type="button" onClick={() => {
                    setEditingMemberId(null);
                    setMemberForm(emptyMemberForm);
                  }}>
                    취소
                  </button>
                ) : null}
              </div>
            </form>

            <div className="member-list">
              {visibleMembers.map((member) => (
                <div className={member.active ? "member-card" : "member-card inactive"} key={member.id}>
                  <div>
                    <strong>{member.name}</strong>
                    <span>{member.department ?? "부서 미지정"} · {roleLabel(member.role)}</span>
                  </div>
                  <div>
                    <button type="button" onClick={() => beginMemberEdit(member)}>수정</button>
                    <button type="button" onClick={() => void handleMemberActiveToggle(member)}>
                      {member.active ? "비활성" : "활성"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="calendar-panel board-main">
          <div className="board-toolbar">
            <label>
              기준일
              <input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
            </label>
            <label>
              팀원
              <select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}>
                <option value="">전체</option>
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </label>
            <label>
              유형
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">전체</option>
                {scheduleTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="empty-text">일정을 불러오는 중입니다.</p>
          ) : viewMode === "week" ? (
            <WeeklyMatrix
              members={memberFilter ? activeMembers.filter((member) => member.id === Number(memberFilter)) : activeMembers}
              schedules={schedules}
              weekStart={dateFromInput(range.start.slice(0, 10))}
              onCreate={(date, memberId) => setModal({ mode: "create", date: withDefaultWorkTime(date), memberId })}
              onEdit={(schedule) => setModal({ mode: "edit", schedule })}
            />
          ) : (
            <MonthlyCalendar
              anchorDate={anchorDate}
              schedules={schedules}
              onCreate={(date) => setModal({ mode: "create", date: withDefaultWorkTime(date) })}
              onEdit={(schedule) => setModal({ mode: "edit", schedule })}
            />
          )}
        </section>
      </section>

      {modal ? (
        <ScheduleModal
          activeMembers={activeMembers}
          modal={modal}
          defaultMemberId={memberFilter ? Number(memberFilter) : undefined}
          onClose={() => setModal(null)}
          onDelete={(scheduleId) => void handleScheduleDelete(scheduleId)}
          onSubmit={(payload) => void handleScheduleSubmit(payload)}
        />
      ) : null}
    </article>
  );
}

function SummaryCard({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "summary-card emphasis" : "summary-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WeeklyMatrix({
  members,
  schedules,
  weekStart,
  onCreate,
  onEdit,
}: {
  members: TeamMember[];
  schedules: Schedule[];
  weekStart: Date;
  onCreate: (date: Date, memberId?: number) => void;
  onEdit: (schedule: Schedule) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  if (members.length === 0) {
    return <p className="empty-text">활성 팀원이 없습니다. 좌측에서 팀원을 등록하세요.</p>;
  }

  return (
    <div className="weekly-matrix">
      <div className="matrix-head sticky-col">팀원</div>
      {days.map((day) => (
        <button className={isSameDay(day, today) ? "matrix-head today" : "matrix-head"} key={toDateInputValue(day)} type="button" onClick={() => onCreate(day)}>
          <strong>{weekdayLabel(day)}</strong>
          <span>{formatShortDate(day)}</span>
        </button>
      ))}
      {members.map((member) => (
        <MatrixRow key={member.id} days={days} member={member} schedules={schedules} onCreate={onCreate} onEdit={onEdit} />
      ))}
    </div>
  );
}

function MatrixRow({
  member,
  days,
  schedules,
  onCreate,
  onEdit,
}: {
  member: TeamMember;
  days: Date[];
  schedules: Schedule[];
  onCreate: (date: Date, memberId?: number) => void;
  onEdit: (schedule: Schedule) => void;
}) {
  return (
    <>
      <div className="matrix-member sticky-col">
        <strong>{member.name}</strong>
        <span>{member.department ?? "부서 미지정"}</span>
      </div>
      {days.map((day) => {
        const items = schedules.filter((schedule) => schedule.user_id === member.id && scheduleTouchesDay(schedule, day));
        return (
          <button className={items.length > 0 ? "matrix-cell filled" : "matrix-cell"} key={`${member.id}-${toDateInputValue(day)}`} type="button" onClick={() => onCreate(day, member.id)}>
            {items.length === 0 ? <span className="empty-slot">등록</span> : null}
            {items.slice(0, 2).map((schedule) => (
              <span className={`matrix-event ${schedule.schedule_type}`} key={schedule.id} onClick={(event) => {
                event.stopPropagation();
                onEdit(schedule);
              }}>
                {scheduleTypeLabel(schedule.schedule_type)} · {schedule.title}
              </span>
            ))}
            {items.length > 2 ? <span className="more-count">+{items.length - 2}</span> : null}
          </button>
        );
      })}
    </>
  );
}

function MonthlyCalendar({
  anchorDate,
  schedules,
  onCreate,
  onEdit,
}: {
  anchorDate: string;
  schedules: Schedule[];
  onCreate: (date: Date) => void;
  onEdit: (schedule: Schedule) => void;
}) {
  const cells = getMonthCells(anchorDate);

  return (
    <div className="month-board">
      {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
        <strong className="weekday" key={day}>{day}</strong>
      ))}
      {cells.map((cell) => {
        const daySchedules = schedules.filter((schedule) => scheduleTouchesDay(schedule, cell.date));
        const visible = daySchedules.slice(0, 3);
        return (
          <button className={`${cell.inMonth ? "day-card" : "day-card muted"} ${isSameDay(cell.date, today) ? "today" : ""}`} key={cell.key} type="button" onClick={() => onCreate(cell.date)}>
            <span className="day-number">{cell.date.getDate()}</span>
            {visible.map((schedule) => (
              <span className={`calendar-chip ${schedule.schedule_type}`} key={schedule.id} onClick={(event) => {
                event.stopPropagation();
                onEdit(schedule);
              }}>
                <b>{schedule.user_name}</b> {schedule.title}
              </span>
            ))}
            {daySchedules.length > visible.length ? <span className="more-count">+{daySchedules.length - visible.length} more</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function ScheduleModal({
  activeMembers,
  modal,
  defaultMemberId,
  onClose,
  onDelete,
  onSubmit,
}: {
  activeMembers: TeamMember[];
  modal: NonNullable<ScheduleModalState>;
  defaultMemberId?: number;
  onClose: () => void;
  onDelete: (scheduleId: number) => void;
  onSubmit: (payload: SchedulePayload) => void;
}) {
  const initial = getInitialScheduleForm(modal, activeMembers, defaultMemberId);
  const [form, setForm] = useState<SchedulePayload>(initial);

  function handleAllDayChange(checked: boolean) {
    const startDate = form.start_at.slice(0, 10);
    setForm({
      ...form,
      is_all_day: checked,
      start_at: checked ? `${startDate}T09:00` : form.start_at,
      end_at: checked ? `${startDate}T18:00` : form.end_at,
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      ...form,
      title: form.title.trim(),
      memo: form.memo?.trim() || null,
      location: form.location?.trim() || null,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="schedule-modal" role="dialog" aria-modal="true" aria-label="일정 입력" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <span className="panel-label">{modal.mode === "edit" ? "Edit Schedule" : "New Schedule"}</span>
            <h3>{modal.mode === "edit" ? "일정 수정" : "일정 등록"}</h3>
          </div>
          <button type="button" onClick={onClose}>닫기</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          <label>
            팀원
            <select required value={form.user_id || ""} onChange={(event) => setForm({ ...form, user_id: Number(event.target.value) })}>
              <option value="">선택</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </label>
          <label>
            일정명
            <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="연차, 세종청사 출장" />
          </label>
          <label>
            유형
            <select value={form.schedule_type} onChange={(event) => setForm({ ...form, schedule_type: event.target.value as ScheduleType })}>
              {scheduleTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            상태
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SchedulePayload["status"] })}>
              <option value="confirmed">확정</option>
              <option value="tentative">검토중</option>
              <option value="cancelled">취소</option>
            </select>
          </label>
          <label className="inline-check modal-check">
            <input checked={form.is_all_day} type="checkbox" onChange={(event) => handleAllDayChange(event.target.checked)} />
            종일 일정
          </label>
          <label>
            시작
            <input required type="datetime-local" value={form.start_at} onChange={(event) => setForm({ ...form, start_at: event.target.value })} />
          </label>
          <label>
            종료
            <input required type="datetime-local" value={form.end_at} onChange={(event) => setForm({ ...form, end_at: event.target.value })} />
          </label>
          <label>
            장소
            <input value={form.location ?? ""} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="출장/교육 장소" />
          </label>
          <label className="wide-field">
            메모
            <textarea value={form.memo ?? ""} onChange={(event) => setForm({ ...form, memo: event.target.value })} placeholder="공유할 내용" />
          </label>
          <div className="modal-actions">
            {modal.mode === "edit" && modal.schedule ? (
              <button className="danger-button" type="button" onClick={() => onDelete(modal.schedule!.id)}>삭제</button>
            ) : null}
            <button className="ghost-button" type="button" onClick={onClose}>취소</button>
            <button className="primary-button" type="submit">저장</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function getInitialScheduleForm(
  modal: NonNullable<ScheduleModalState>,
  members: TeamMember[],
  defaultMemberId?: number,
): SchedulePayload {
  if (modal.mode === "edit" && modal.schedule) {
    return {
      user_id: modal.schedule.user_id,
      title: modal.schedule.title,
      schedule_type: modal.schedule.schedule_type,
      start_at: modal.schedule.start_at,
      end_at: modal.schedule.end_at,
      is_all_day: modal.schedule.is_all_day,
      location: modal.schedule.location,
      status: modal.schedule.status,
      memo: modal.schedule.memo,
    };
  }

  const baseDate = withDefaultWorkTime(modal.date ?? today);
  return {
    user_id: modal.memberId ?? defaultMemberId ?? members[0]?.id ?? 0,
    title: "",
    schedule_type: "work",
    start_at: toDateTimeInputValue(baseDate),
    end_at: toDateTimeInputValue(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 18)),
    is_all_day: false,
    location: "",
    status: "confirmed",
    memo: "",
  };
}

function getScheduleSummary(schedules: Schedule[], members: TeamMember[], anchorDate: string) {
  const todayDate = isSameDay(dateFromInput(anchorDate), today) ? today : dateFromInput(anchorDate);
  const awayTypes: ScheduleType[] = ["vacation", "business_trip", "training"];
  const todayAway = schedules.filter((schedule) => awayTypes.includes(schedule.schedule_type) && scheduleTouchesDay(schedule, todayDate));
  const fieldWorkCount = schedules.filter((schedule) => ["business_trip", "training"].includes(schedule.schedule_type)).length;
  return {
    todayAway,
    todayAwayCount: new Set(todayAway.map((schedule) => schedule.user_id)).size,
    fieldWorkCount,
    activeMemberCount: members.length,
  };
}

function normalizeMemberPayload(payload: TeamMemberPayload): TeamMemberPayload {
  return {
    name: payload.name.trim(),
    department: payload.department?.trim() || null,
    role: payload.role,
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
  const datePart = value.includes("T") ? value.slice(0, 10) : value;
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function withDefaultWorkTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0);
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

function formatRangeLabel(range: { start: string; end: string }) {
  return `${formatShortDate(dateFromInput(range.start))} - ${formatShortDate(dateFromInput(range.end))}`;
}

function formatMonthLabel(value: string) {
  const date = dateFromInput(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function weekdayLabel(date: Date) {
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
