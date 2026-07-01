import type {
  Schedule,
  ScheduleFilters,
  SchedulePayload,
  ScheduleSaveResponse,
  TeamMember,
  TeamMemberPayload,
} from "./scheduleTypes";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function listTeamMembers(active?: boolean): Promise<TeamMember[]> {
  const params = active === undefined ? "" : `?active=${String(active)}`;
  const data = await requestJson<{ items: TeamMember[] }>(`/api/team-members${params}`);
  return data.items;
}

export async function createTeamMember(payload: TeamMemberPayload): Promise<TeamMember> {
  return requestJson<TeamMember>("/api/team-members", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTeamMember(
  memberId: number,
  payload: TeamMemberPayload,
): Promise<TeamMember> {
  return requestJson<TeamMember>(`/api/team-members/${memberId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteTeamMember(memberId: number): Promise<void> {
  await requestJson<{ deleted: boolean }>(`/api/team-members/${memberId}`, {
    method: "DELETE",
  });
}

export async function deactivateTeamMember(memberId: number): Promise<TeamMember> {
  return requestJson<TeamMember>(`/api/team-members/${memberId}/deactivate`, {
    method: "PATCH",
  });
}

export async function activateTeamMember(memberId: number): Promise<TeamMember> {
  return requestJson<TeamMember>(`/api/team-members/${memberId}/activate`, {
    method: "PATCH",
  });
}

export async function listSchedules(filters: ScheduleFilters): Promise<Schedule[]> {
  const params = new URLSearchParams({
    start_date: filters.startDate,
    end_date: filters.endDate,
  });

  if (filters.userId) {
    params.set("user_id", String(filters.userId));
  }
  if (filters.scheduleType) {
    params.set("schedule_type", filters.scheduleType);
  }

  const data = await requestJson<{ items: Schedule[] }>(`/api/schedules?${params.toString()}`);
  return data.items;
}

export async function createSchedule(payload: SchedulePayload): Promise<ScheduleSaveResponse> {
  return requestJson<ScheduleSaveResponse>("/api/schedules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSchedule(
  scheduleId: number,
  payload: SchedulePayload,
): Promise<ScheduleSaveResponse> {
  return requestJson<ScheduleSaveResponse>(`/api/schedules/${scheduleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteSchedule(scheduleId: number): Promise<void> {
  await requestJson<{ deleted: boolean }>(`/api/schedules/${scheduleId}`, {
    method: "DELETE",
  });
}
