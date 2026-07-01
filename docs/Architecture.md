# Architecture - 공공직군 행정업무 슈퍼앱

## 1. 문서 목적

이 문서는 공공직군 행정업무 슈퍼앱의 기술 요구사항, 프로젝트 구조, 모듈별 역할, 데이터 구조, API 설계 방향을 정의한다.

## 2. 기술 스택

| 영역 | 기술 | 비고 |
| --- | --- | --- |
| Frontend | TypeScript, Vite, React | 현재 모듈 설치 완료 |
| Backend | Python, FastAPI | `uv` 기반 프로젝트 구성 완료 |
| Python Package Manager | uv | Python 실행과 의존성 관리는 uv로 통일 |
| Database | SQLite | MVP DB |
| File Processing | Python 라이브러리 | `openpyxl`, `pandas` 등은 구현 단계에서 추가 검토 |
| Scheduler | Backend 내장 작업 또는 별도 프로세스 | MVP는 단일 FastAPI 프로세스 내 간단 스케줄러로 시작 가능 |
| News Collection | RSS/API 기반 수집 | 웹 크롤링보다 공식 API/RSS 우선 |

## 3. 현재 프로젝트 상태

| 경로 | 상태 |
| --- | --- |
| `frontend/` | `package.json`, `package-lock.json`, `node_modules` 존재 |
| `backend/` | `pyproject.toml`, `uv.lock`, `.venv` 존재 |
| `docs/` | 문서화 산출물 저장 위치 |

현재 설치된 주요 패키지는 다음과 같다.

| 영역 | 패키지 |
| --- | --- |
| FE Runtime | `react`, `react-dom` |
| FE Dev | `vite`, `typescript`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom` |
| BE | `fastapi`, `uvicorn[standard]` |

## 4. 목표 아키텍처

```text
User Browser
  |
  | HTTP
  v
React + Vite Frontend
  |
  | REST API / JSON / File Upload
  v
FastAPI Backend
  |
  +-- Schedule Module
  +-- Excel Automation Module
  +-- Complaint Chatbot Module
  +-- News Collector Module
  +-- Auth/User Module
  +-- Audit/Log Module
  |
  v
SQLite Database
  |
  +-- Temporary File Storage
  +-- Manual Document Storage
```

## 5. 프로젝트 구조 제안

```text
DAY3_RPA/
  frontend/
    package.json
    package-lock.json
    index.html
    tsconfig.json
    vite.config.ts
    src/
      main.tsx
      App.tsx
      api/
      components/
      features/
        schedule/
        excel/
        chatbot/
        news/
      routes/
      styles/
      types/
  backend/
    pyproject.toml
    uv.lock
    app/
      main.py
      core/
        config.py
        database.py
        security.py
      api/
        routes.py
        schedule.py
        excel.py
        chatbot.py
        news.py
      models/
      schemas/
      services/
        schedule_service.py
        excel_service.py
        chatbot_service.py
        news_service.py
      repositories/
      jobs/
      utils/
    data/
      app.db
      manuals/
      uploads/
      exports/
    tests/
  docs/
    PRD.md
    Architecture.md
    Operation.md
    index.html
```

## 6. Frontend 구조

| 영역 | 역할 |
| --- | --- |
| `src/api/` | FastAPI 호출 클라이언트, 요청/응답 타입 관리 |
| `src/components/` | 버튼, 모달, 테이블, 파일 업로드 등 공통 UI |
| `src/features/schedule/` | 캘린더, 일정 등록, 일정 필터 UI |
| `src/features/excel/` | 엑셀 업로드, 컬럼 선택, 분할/병합 결과 UI |
| `src/features/chatbot/` | 민원 질의 입력, 답변 표시, 근거 표시 UI |
| `src/features/news/` | 뉴스 목록, 키워드 필터, 수집 로그 UI |
| `src/routes/` | 페이지 라우팅 |
| `src/types/` | 도메인 타입 정의 |

## 7. Backend 구조

| 영역 | 역할 |
| --- | --- |
| `app/main.py` | FastAPI 앱 생성, 미들웨어, 라우터 등록 |
| `app/core/config.py` | 환경 변수와 설정값 관리 |
| `app/core/database.py` | SQLite 연결, 세션 또는 커넥션 관리 |
| `app/api/` | HTTP 라우터 계층 |
| `app/schemas/` | 요청/응답 DTO |
| `app/models/` | DB 모델 또는 테이블 정의 |
| `app/services/` | 업무 로직 |
| `app/repositories/` | DB 접근 |
| `app/jobs/` | 뉴스 수집 등 예약 작업 |
| `app/utils/` | 파일명 정리, 마스킹, 공통 유틸 |

## 8. 모듈별 역할

## 8.1 Schedule Module

| 계층 | 역할 |
| --- | --- |
| API | 일정 CRUD, 기간별 조회, 필터 조회 |
| Service | 기간 검증, 중복 일정 경고, 권한 검증 |
| Repository | `schedules`, `users` 테이블 조회/저장 |
| Frontend | 캘린더 표시, 등록 모달, 필터 |

주요 책임은 팀 일정 가시화와 일정 데이터 정합성 보장이다.

## 8.2 Excel Automation Module

| 계층 | 역할 |
| --- | --- |
| API | 파일 업로드, 컬럼 미리보기, 분할, 병합, 다운로드 |
| Service | 엑셀 파싱, 컬럼 검증, 분할/병합 처리 |
| Repository | 처리 이력 저장 |
| File Storage | 업로드 임시 파일과 결과 파일 저장 |
| Frontend | 파일 선택, 컬럼 선택, 처리 결과 표시 |

파일 처리 계층은 보안상 DB에 원본 파일을 저장하지 않고 파일 시스템의 임시 영역을 사용한다.

## 8.3 Complaint Chatbot Module

| 계층 | 역할 |
| --- | --- |
| API | 매뉴얼 등록, 질의 요청, 답변 이력 조회 |
| Service | 매뉴얼 검색, 근거 추출, 응대 문안 생성 |
| Repository | 매뉴얼 메타데이터, 질의 이력 저장 |
| File Storage | 매뉴얼 원본 또는 전처리 파일 저장 |
| Frontend | 질문 입력, 답변 카드, 근거 표시 |

MVP는 매뉴얼 기반 검색과 템플릿형 응답 생성을 기본으로 한다. 외부 LLM API를 사용할 경우 환경 변수로 API 키를 주입하고, 근거 없는 생성은 제한해야 한다.

## 8.4 News Collector Module

| 계층 | 역할 |
| --- | --- |
| API | 뉴스 목록 조회, 키워드 관리, 수집 로그 조회 |
| Job | 매일 아침 뉴스 수집 실행 |
| Service | RSS/API 호출, 중복 제거, 요약/태깅 |
| Repository | 기사 메타데이터, 키워드, 수집 로그 저장 |
| Frontend | 뉴스 카드 목록, 날짜/키워드 필터 |

뉴스 수집은 본문 전문 저장보다 링크와 메타데이터 저장을 우선한다.

## 9. 데이터 모델 초안

## 9.1 users

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | INTEGER PK | 사용자 ID |
| name | TEXT | 이름 |
| department | TEXT | 부서 |
| role | TEXT | `member`, `manager`, `admin` |
| created_at | TEXT | 생성일시 |

## 9.2 schedules

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | INTEGER PK | 일정 ID |
| user_id | INTEGER FK | 사용자 ID |
| title | TEXT | 일정 제목 |
| schedule_type | TEXT | `vacation`, `work`, `business_trip`, `training`, `other` |
| start_at | TEXT | 시작일시 |
| end_at | TEXT | 종료일시 |
| memo | TEXT | 메모 |
| created_at | TEXT | 생성일시 |
| updated_at | TEXT | 수정일시 |

## 9.3 excel_jobs

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | INTEGER PK | 처리 작업 ID |
| job_type | TEXT | `split`, `merge` |
| original_filename | TEXT | 원본 파일명 |
| result_path | TEXT | 결과 파일 경로 |
| status | TEXT | `pending`, `success`, `failed` |
| row_count | INTEGER | 처리 행 수 |
| error_message | TEXT | 실패 사유 |
| created_at | TEXT | 생성일시 |

## 9.4 manuals

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | INTEGER PK | 매뉴얼 ID |
| title | TEXT | 문서명 |
| file_path | TEXT | 저장 경로 |
| content_text | TEXT | 추출 텍스트 |
| created_at | TEXT | 등록일시 |

## 9.5 chatbot_messages

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | INTEGER PK | 메시지 ID |
| question | TEXT | 사용자 질문 |
| answer | TEXT | 생성 답변 |
| source_manual_id | INTEGER FK | 참조 매뉴얼 |
| created_at | TEXT | 생성일시 |

## 9.6 news_articles

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | INTEGER PK | 기사 ID |
| title | TEXT | 제목 |
| source | TEXT | 출처 |
| url | TEXT UNIQUE | 기사 URL |
| published_at | TEXT | 발행일 |
| collected_at | TEXT | 수집일 |
| keyword | TEXT | 수집 키워드 |
| summary | TEXT | 짧은 요약 |

## 9.7 collection_logs

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | INTEGER PK | 로그 ID |
| job_name | TEXT | 작업명 |
| status | TEXT | `success`, `failed` |
| message | TEXT | 결과 메시지 |
| started_at | TEXT | 시작일시 |
| finished_at | TEXT | 종료일시 |

## 10. API 설계 초안

## 10.1 Schedule API

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/schedules` | 기간, 팀원, 유형 기준 일정 조회 |
| POST | `/api/schedules` | 일정 생성 |
| PUT | `/api/schedules/{schedule_id}` | 일정 수정 |
| DELETE | `/api/schedules/{schedule_id}` | 일정 삭제 |

## 10.2 Excel API

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/excel/preview` | 업로드 파일 컬럼 미리보기 |
| POST | `/api/excel/split` | 컬럼 기준 엑셀 분할 |
| POST | `/api/excel/merge` | 여러 엑셀 파일 병합 |
| GET | `/api/excel/jobs/{job_id}/download` | 결과 파일 다운로드 |

## 10.3 Chatbot API

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/manuals` | 민원 매뉴얼 등록 |
| GET | `/api/manuals` | 매뉴얼 목록 조회 |
| POST | `/api/chatbot/ask` | 민원 대응 질문 |
| GET | `/api/chatbot/history` | 질의 이력 조회 |

## 10.4 News API

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/news` | 뉴스 목록 조회 |
| POST | `/api/news/collect` | 수동 뉴스 수집 실행 |
| GET | `/api/news/keywords` | 수집 키워드 조회 |
| POST | `/api/news/keywords` | 수집 키워드 등록 |
| GET | `/api/news/logs` | 수집 로그 조회 |

## 11. 설정값

| 설정 | 예시 | 설명 |
| --- | --- | --- |
| `APP_ENV` | `local` | 실행 환경 |
| `DATABASE_URL` | `sqlite:///data/app.db` | SQLite DB 경로 |
| `UPLOAD_DIR` | `data/uploads` | 업로드 임시 저장 위치 |
| `EXPORT_DIR` | `data/exports` | 결과 파일 저장 위치 |
| `MANUAL_DIR` | `data/manuals` | 매뉴얼 저장 위치 |
| `MAX_UPLOAD_MB` | `20` | 파일 업로드 최대 크기 |
| `NEWS_COLLECT_TIME` | `08:00` | 뉴스 수집 시간 |
| `NEWS_KEYWORDS` | `공공행정,민원,디지털정부` | 기본 수집 키워드 |
| `LLM_API_KEY` | optional | 외부 LLM 사용 시 필요 |

## 12. 보안 설계 원칙

| 항목 | 원칙 |
| --- | --- |
| 파일 업로드 | 확장자, MIME, 크기 검증을 수행한다. |
| 개인정보 | 로그와 챗봇 이력에 민감정보 원문을 저장하지 않는다. |
| 파일 보관 | 엑셀 원본과 결과물은 TTL 기반으로 삭제한다. |
| 답변 생성 | 매뉴얼 근거 없는 민원 답변 생성을 제한한다. |
| 뉴스 | 기사 본문 전문 저장을 기본 비활성화한다. |
| 권한 | 관리자 기능은 일반 사용자와 분리한다. |

## 13. 구현 단계 제안

| 단계 | 산출물 |
| --- | --- |
| 1단계 | FE/BE 기본 실행 구조, 라우팅, Health Check |
| 2단계 | SQLite 연결, 사용자/일정 CRUD |
| 3단계 | 엑셀 미리보기, 분할, 병합 |
| 4단계 | 매뉴얼 등록, 검색, 챗봇 응답 템플릿 |
| 5단계 | 뉴스 수집 작업, 목록 조회 |
| 6단계 | 공통 에러 처리, 로그, 운영 문서 보완 |

## 14. 기술적 의사결정

| 결정 | 이유 |
| --- | --- |
| SQLite 사용 | MVP에서 설치와 운영이 단순하다. |
| uv 사용 | Python 버전과 의존성 관리를 일관되게 처리한다. |
| REST API 사용 | 파일 업로드, CRUD, 화면 연동이 단순하다. |
| 파일은 DB 외부 저장 | 대용량 파일과 개인정보 파일을 DB에 직접 저장하지 않기 위함이다. |
| 뉴스 본문 저장 제한 | 저작권과 약관 리스크를 줄이기 위함이다. |
