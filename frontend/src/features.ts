export type FeatureKey = "schedule" | "excel" | "chatbot" | "news";

export type Feature = {
  key: FeatureKey;
  title: string;
  summary: string;
  requirements: string[];
  routeLabel: string;
};

export const features: Feature[] = [
  {
    key: "schedule",
    title: "팀원 스케줄 관리",
    summary: "휴가, 근무, 출장, 교육 일정을 팀 캘린더에서 공유합니다.",
    routeLabel: "캘린더",
    requirements: ["월간 캘린더", "일정 CRUD", "팀원/유형 필터", "중복 일정 경고"],
  },
  {
    key: "excel",
    title: "엑셀 업무 자동화",
    summary: "특정 컬럼 기준 분할과 여러 엑셀 파일 병합을 처리합니다.",
    routeLabel: "엑셀 자동화",
    requirements: ["파일 업로드", "컬럼 미리보기", "컬럼 기준 분할", "파일 병합"],
  },
  {
    key: "chatbot",
    title: "민원 대응 챗봇",
    summary: "민원 매뉴얼 근거를 바탕으로 대응 방향과 스크립트를 작성합니다.",
    routeLabel: "민원 챗봇",
    requirements: ["매뉴얼 등록", "근거 표시", "응대 스크립트", "개인정보 마스킹 안내"],
  },
  {
    key: "news",
    title: "뉴스 기사 수집",
    summary: "공공행정 관련 뉴스를 매일 아침 수집하고 중복을 제거합니다.",
    routeLabel: "뉴스 수집",
    requirements: ["키워드 관리", "08:00 자동 수집", "중복 제거", "수집 로그"],
  },
];
