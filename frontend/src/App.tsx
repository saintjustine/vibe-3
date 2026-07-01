import { useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "./api/client";
import { features, type Feature, type FeatureKey } from "./features";

const initialFeature = features[0].key;

function App() {
  const [activeKey, setActiveKey] = useState<FeatureKey>(initialFeature);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getHealth()
      .then((data) => {
        if (!ignore) {
          setHealth(data);
          setHealthError(null);
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setHealthError(error instanceof Error ? error.message : "Unknown error");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const activeFeature = features.find((feature) => feature.key === activeKey) ?? features[0];

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">MVP Scaffold</p>
          <h1>공공직군 행정업무 슈퍼앱</h1>
          <p className="lead">
            문서화된 PRD와 Architecture 기준으로 FE 페이지 구조, FE-BE 헬스체크,
            BE-SQLite 연결 확인을 위한 최소 실행 골격입니다.
          </p>
        </div>
        <SystemStatus health={health} error={healthError} />
      </section>

      <nav className="feature-nav" aria-label="업무 메뉴">
        {features.map((feature) => (
          <button
            key={feature.key}
            className={feature.key === activeKey ? "active" : ""}
            type="button"
            onClick={() => setActiveKey(feature.key)}
          >
            {feature.routeLabel}
          </button>
        ))}
      </nav>

      <section className="content-grid">
        <FeaturePanel feature={activeFeature} />
        <IntegrationPanel health={health} error={healthError} />
      </section>
    </main>
  );
}

function SystemStatus({ health, error }: { health: HealthResponse | null; error: string | null }) {
  const statusText = health ? "연동 정상" : error ? "연동 실패" : "확인 중";

  return (
    <aside className="status-card">
      <span className={health ? "status-dot ok" : error ? "status-dot fail" : "status-dot"} />
      <strong>{statusText}</strong>
      <p>FE에서 `/api/health`를 호출해 FastAPI와 SQLite 상태를 확인합니다.</p>
    </aside>
  );
}

function FeaturePanel({ feature }: { feature: Feature }) {
  return (
    <article className="panel feature-panel">
      <span className="panel-label">FE 페이지 구조</span>
      <h2>{feature.title}</h2>
      <p>{feature.summary}</p>
      <div className="placeholder-box">
        <strong>{feature.routeLabel} 페이지 영역</strong>
        <span>상세 기능 구현 전, 라우팅과 화면 구획만 준비된 상태입니다.</span>
      </div>
      <ul className="requirement-list">
        {feature.requirements.map((requirement) => (
          <li key={requirement}>{requirement}</li>
        ))}
      </ul>
    </article>
  );
}

function IntegrationPanel({
  health,
  error,
}: {
  health: HealthResponse | null;
  error: string | null;
}) {
  return (
    <article className="panel">
      <span className="panel-label">연동 확인</span>
      <h2>FE-BE / BE-DB</h2>
      {health ? (
        <dl className="health-list">
          <div>
            <dt>API</dt>
            <dd>{health.status}</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>{health.service}</dd>
          </div>
          <div>
            <dt>DB</dt>
            <dd>{health.database.status}</dd>
          </div>
          <div>
            <dt>SQLite</dt>
            <dd>{health.database.sqlite_version}</dd>
          </div>
          <div>
            <dt>Tables</dt>
            <dd>{health.database.tables.join(", ")}</dd>
          </div>
        </dl>
      ) : (
        <p className="error-text">
          {error ?? "Backend 서버 응답을 기다리는 중입니다. FastAPI 서버가 실행 중인지 확인하세요."}
        </p>
      )}
    </article>
  );
}

export default App;
