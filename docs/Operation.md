# Operation - 공공직군 행정업무 슈퍼앱

## 1. 문서 목적

이 문서는 공공직군 행정업무 슈퍼앱의 로컬 실행 방법, 운영 절차, 자주 발생하는 오류, 사용자 기능 사용법을 정리한다.

## 2. 현재 환경 요약

| 항목 | 상태 |
| --- | --- |
| OS | Windows |
| Shell | PowerShell |
| Node | `v24.18.0` 확인됨 |
| npm | `11.16.0` 확인됨 |
| uv | `0.11.25` 확인됨 |
| uv Python | `Python 3.14.6` 확인됨 |
| SQLite CLI | 미설치 |
| Python sqlite3 모듈 | 사용 가능, SQLite `3.53.1` 확인됨 |

## 3. 운영상 주의사항

| 항목 | 주의사항 |
| --- | --- |
| npm 실행 | PowerShell 실행 정책 때문에 `npm` 대신 `npm.cmd` 사용을 권장한다. |
| uv 캐시 | 기본 캐시 경로 권한 문제가 있어 `--cache-dir ..\\.uv-cache` 사용을 권장한다. |
| Python 실행 | `python` 명령은 Windows Store alias 문제로 실패할 수 있으므로 `uv run python` 사용을 권장한다. |
| SQLite | CLI가 없어도 Python 내장 `sqlite3` 모듈로 앱 실행은 가능하다. |

## 4. 초기 설치 명령

## 4.1 Frontend

```powershell
cd C:\Users\admin\Desktop\DAY3_RPA\frontend
npm.cmd install
```

현재 설치된 FE 필수 모듈은 다음과 같다.

| 구분 | 모듈 |
| --- | --- |
| Runtime | `react`, `react-dom` |
| Development | `vite`, `typescript`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom` |

## 4.2 Backend

```powershell
cd C:\Users\admin\Desktop\DAY3_RPA\backend
uv --cache-dir ..\.uv-cache sync
```

현재 설치된 BE 필수 모듈은 다음과 같다.

| 구분 | 모듈 |
| --- | --- |
| API Server | `fastapi` |
| ASGI Server | `uvicorn[standard]` |

## 5. 실행 방법

현재는 소스 코드가 아직 작성되지 않았으므로 아래 명령은 구현 이후의 표준 실행 방식이다.

## 5.1 Frontend 실행

```powershell
cd C:\Users\admin\Desktop\DAY3_RPA\frontend
npm.cmd run dev
```

예상 접속 주소는 다음과 같다.

```text
http://localhost:5173
```

## 5.2 Backend 실행

```powershell
cd C:\Users\admin\Desktop\DAY3_RPA\backend
uv --cache-dir ..\.uv-cache run uvicorn app.main:app --reload
```

예상 API 주소는 다음과 같다.

```text
http://localhost:8000
http://localhost:8000/docs
```

## 6. 환경 변수

MVP 구현 시 `.env` 파일 또는 실행 환경 변수로 다음 값을 사용한다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `APP_ENV` | `local` | 실행 환경 |
| `DATABASE_URL` | `sqlite:///data/app.db` | DB 경로 |
| `UPLOAD_DIR` | `data/uploads` | 업로드 파일 임시 저장 위치 |
| `EXPORT_DIR` | `data/exports` | 엑셀 처리 결과 저장 위치 |
| `MANUAL_DIR` | `data/manuals` | 민원 매뉴얼 저장 위치 |
| `MAX_UPLOAD_MB` | `20` | 업로드 파일 크기 제한 |
| `NEWS_COLLECT_TIME` | `08:00` | 뉴스 자동 수집 시간 |
| `NEWS_KEYWORDS` | `공공행정,지방행정,민원,디지털정부` | 기본 수집 키워드 |
| `LLM_API_KEY` | empty | 외부 LLM 사용 시 설정 |

## 7. 사용자 기능 사용법

## 7.1 팀원 스케줄 관리

| 작업 | 사용 방법 |
| --- | --- |
| 일정 조회 | 캘린더 화면에서 월별 일정을 확인한다. |
| 일정 등록 | 일정 등록 버튼을 누르고 유형, 기간, 제목, 메모를 입력한다. |
| 일정 수정 | 캘린더에서 본인 일정을 선택한 뒤 수정한다. |
| 일정 필터 | 팀원, 일정 유형, 기간 필터를 적용한다. |

운영 기준은 다음과 같다.

| 항목 | 기준 |
| --- | --- |
| 휴가 | 휴가 유형으로 등록한다. |
| 출장 | 출장 기간과 목적지를 메모에 남긴다. |
| 근무 | 특이 근무 또는 당직 일정을 등록한다. |
| 교육 | 교육명과 장소를 메모에 남긴다. |

## 7.2 엑셀 업무 자동화

| 작업 | 사용 방법 |
| --- | --- |
| 파일 분할 | 엑셀 파일 업로드 후 기준 컬럼을 선택하고 분할을 실행한다. |
| 파일 병합 | 여러 엑셀 파일을 업로드하고 병합을 실행한다. |
| 결과 다운로드 | 처리 완료 후 ZIP 또는 XLSX 결과 파일을 다운로드한다. |
| 오류 확인 | 실패 시 표시되는 컬럼명, 행 번호, 파일 형식 오류를 확인한다. |

운영 기준은 다음과 같다.

| 항목 | 기준 |
| --- | --- |
| 권장 형식 | `.xlsx` |
| 비권장 형식 | 암호화 파일, 병합 셀이 많은 파일, 복잡한 수식 파일 |
| 개인정보 | 주민번호, 연락처 등 민감정보 포함 파일은 처리 후 즉시 삭제 대상 |
| 컬럼명 | 병합 작업에서는 모든 파일의 컬럼명을 동일하게 맞추는 것을 권장 |

## 7.3 민원 대응 챗봇

| 작업 | 사용 방법 |
| --- | --- |
| 매뉴얼 등록 | 관리자가 민원 매뉴얼을 업로드하거나 텍스트로 등록한다. |
| 질문 입력 | 민원 상황을 개인정보 없이 요약해서 입력한다. |
| 답변 확인 | 상황 요약, 확인 사항, 대응 방향, 응대 스크립트, 근거를 확인한다. |
| 근거 부족 | 근거 부족 메시지가 나오면 담당 부서나 최신 지침을 확인한다. |

운영 기준은 다음과 같다.

| 항목 | 기준 |
| --- | --- |
| 개인정보 | 민원인의 이름, 주민번호, 전화번호, 주소는 입력하지 않는다. |
| 최종 판단 | 챗봇 답변은 초안이며 최종 답변 책임자는 담당자이다. |
| 근거 | 매뉴얼 근거가 표시되지 않은 답변은 대외 발송에 사용하지 않는다. |
| 매뉴얼 갱신 | 지침 변경 시 관리자에게 최신 매뉴얼 반영을 요청한다. |

## 7.4 뉴스 기사 수집

| 작업 | 사용 방법 |
| --- | --- |
| 자동 수집 | 매일 아침 지정된 시간에 등록 키워드 기준으로 수집된다. |
| 수동 수집 | 관리자 화면에서 수동 수집을 실행한다. |
| 기사 조회 | 날짜, 키워드, 출처 기준으로 필터링한다. |
| 키워드 관리 | 관리자가 수집 키워드를 추가, 수정, 삭제한다. |

운영 기준은 다음과 같다.

| 항목 | 기준 |
| --- | --- |
| 저작권 | 기사 본문 전문 저장은 기본적으로 하지 않는다. |
| 링크 | 원문 링크를 통해 언론사 페이지에서 확인한다. |
| 중복 | URL 기준으로 중복 제거한다. |
| 실패 | 수집 실패 시 수집 로그에서 원인을 확인한다. |

## 8. 자주 발생하는 오류와 대응

## 8.1 npm 실행 정책 오류

### 증상

```text
이 시스템에서 스크립트를 실행할 수 없으므로 npm.ps1 파일을 로드할 수 없습니다.
```

### 원인

PowerShell 실행 정책이 `.ps1` 실행을 차단한다.

### 대응

```powershell
npm.cmd install
npm.cmd run dev
```

## 8.2 uv 캐시 권한 오류

### 증상

```text
Failed to initialize cache at C:\Users\admin\AppData\Local\uv\cache
액세스가 거부되었습니다.
```

### 원인

기본 uv 캐시 경로에 접근 권한 문제가 있다.

### 대응

```powershell
uv --cache-dir ..\.uv-cache sync
uv --cache-dir ..\.uv-cache run python --version
```

## 8.3 python 명령 실행 실패

### 증상

```text
'python.exe' 프로그램을 실행하지 못했습니다.
```

### 원인

Windows Store Python alias 또는 세션 문제로 직접 실행이 실패한다.

### 대응

```powershell
uv --cache-dir ..\.uv-cache run python --version
```

## 8.4 sqlite3 명령을 찾을 수 없음

### 증상

```text
sqlite3: command not found
```

### 원인

SQLite CLI가 설치되어 있지 않다.

### 대응

앱은 Python 내장 `sqlite3` 모듈을 사용할 수 있으므로 CLI는 필수가 아니다. DB를 직접 열어야 하는 운영 요구가 생기면 SQLite CLI 또는 DB Browser for SQLite 설치를 검토한다.

## 8.5 FastAPI 서버 실행 실패

### 예상 원인

| 원인 | 대응 |
| --- | --- |
| `app.main` 파일 없음 | 구현 단계에서 `backend/app/main.py` 생성 필요 |
| 패키지 미동기화 | `uv --cache-dir ..\.uv-cache sync` 실행 |
| 포트 충돌 | `--port 8001` 등 다른 포트 지정 |
| 환경 변수 누락 | `.env` 또는 기본 설정 확인 |

## 8.6 Vite 서버 실행 실패

### 예상 원인

| 원인 | 대응 |
| --- | --- |
| `index.html` 또는 `src/main.tsx` 없음 | 구현 단계에서 FE 소스 생성 필요 |
| npm 패키지 누락 | `npm.cmd install` 실행 |
| 포트 충돌 | `npm.cmd run dev -- --port 5174` 실행 |

## 9. 백업과 복구

| 대상 | 백업 방법 |
| --- | --- |
| SQLite DB | `backend/data/app.db` 파일 백업 |
| 민원 매뉴얼 | `backend/data/manuals` 폴더 백업 |
| 운영 설정 | `.env` 파일 또는 배포 환경 변수 별도 보관 |
| 문서 | `docs` 폴더 백업 |

복구 기준은 다음과 같다.

| 상황 | 대응 |
| --- | --- |
| DB 손상 | 마지막 백업 DB 파일로 교체 |
| 매뉴얼 누락 | 백업된 매뉴얼 폴더 복원 |
| 패키지 손상 | FE는 `npm.cmd install`, BE는 `uv sync` 재실행 |

## 10. 운영 체크리스트

| 주기 | 점검 항목 |
| --- | --- |
| 매일 | 뉴스 수집 성공 여부 확인 |
| 매주 | 엑셀 임시 파일 삭제 상태 확인 |
| 매주 | 챗봇 답변 이력 중 개인정보 포함 여부 점검 |
| 매월 | 민원 매뉴얼 최신성 확인 |
| 매월 | SQLite DB 백업 확인 |

## 11. 배포 전 확인사항

| 항목 | 확인 |
| --- | --- |
| FE 빌드 | `npm.cmd run build` 성공 |
| BE 실행 | `uv run uvicorn app.main:app` 성공 |
| API 문서 | `/docs` 접속 가능 |
| DB 생성 | SQLite DB 파일 생성 확인 |
| 파일 디렉터리 | uploads, exports, manuals 경로 존재 |
| 보안 | 로그에 개인정보 원문 미저장 |
| 뉴스 | 수집 출처 약관 확인 |

## 12. 장애 대응 원칙

| 원칙 | 설명 |
| --- | --- |
| 원본 보호 | 엑셀 원본 파일은 처리 중 수정하지 않는다. |
| 로그 확인 | 장애 발생 시 API 로그, 작업 로그, 브라우저 콘솔 순서로 확인한다. |
| 재시도 | 뉴스 수집과 파일 처리 작업은 실패 원인을 확인한 뒤 재시도한다. |
| 개인정보 | 장애 분석 중에도 개인정보 원문을 공유하지 않는다. |
| 변경 기록 | 운영 설정 변경 시 변경일, 변경자, 변경 사유를 기록한다. |
