export type TeamMemberRole = "member" | "manager" | "admin";
export type ScheduleType = "vacation" | "work" | "business_trip" | "training" | "other";

export type TeamMember = {
  id: number;
  name: string;
  department: string | null;
  role: TeamMemberRole;
  active: boolean;
  created_at: string;
};

export type TeamMemberPayload = {
  name: string;
  department: string | null;
  role: TeamMemberRole;
};

export type Schedule = {
  id: number;
  user_id: number;
  user_name: string;
  user_department: string | null;
  title: string;
  schedule_type: ScheduleType;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type SchedulePayload = {
  user_id: number;
  title: string;
  schedule_type: ScheduleType;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  memo: string | null;
};

export type ScheduleSaveResponse = {
  item: Schedule;
  conflicts: Schedule[];
};

export type ScheduleFilters = {
  startDate: string;
  endDate: string;
  userId?: number;
  scheduleType?: ScheduleType;
};
