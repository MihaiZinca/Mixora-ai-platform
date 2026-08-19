import { Bot } from "lucide-react";

function Dashboard() {
  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h2>Dashboard</h2>
          <p className="subtitle">
            Monitorizează activitatea și performanța MIXORA.
          </p>
        </div>

        <div className="profile">M</div>
      </header>

      <section className="stats">
        <StatCard title="Mesaje astăzi" value="128" change="+12%" />
        <StatCard title="Rezolvate de AI" value="86%" change="+4.2%" />
        <StatCard title="Tichete deschise" value="14" change="3 urgente" />
        <StatCard title="Lead-uri" value="23" change="7 hot" />
      </section>

      <section className="dashboardGrid">
        <div className="panel activityPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">LIVE</p>
              <h3>Activitate recentă</h3>
            </div>

            <span className="live">
              <span className="statusDot" />
              Live
            </span>
          </div>

          <Activity
            name="Maria Popescu"
            text="Solicită informații despre retur"
            type="Retur"
            confidence="94%"
          />

          <Activity
            name="Andrei Ionescu"
            text="Interesat de planul Premium"
            type="Lead"
            confidence="91%"
          />

          <Activity
            name="Elena Matei"
            text="Întreabă despre statusul comenzii"
            type="Comandă"
            confidence="97%"
          />
        </div>

        <div className="panel aiPanel">
          <p className="eyebrow">AI ENGINE</p>
          <h3>MIXORA AI</h3>

          <div className="aiOrb">
            <Bot size={38} />
          </div>

          <div className="aiStatus">
            <span className="statusDot" />
            Sistem operațional
          </div>

          <div className="aiMetric">
            <span>Confidence mediu</span>
            <strong>94.2%</strong>
          </div>

          <div className="progress">
            <div className="progressFill" />
          </div>

          <div className="aiMetric">
            <span>Răspuns mediu</span>
            <strong>1.4s</strong>
          </div>
        </div>
      </section>
    </>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  change: string;
};

function StatCard({ title, value, change }: StatCardProps) {
  return (
    <div className="statCard">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{change}</small>
    </div>
  );
}

type ActivityProps = {
  name: string;
  text: string;
  type: string;
  confidence: string;
};

function Activity({
  name,
  text,
  type,
  confidence,
}: ActivityProps) {
  return (
    <div className="activity">
      <div className="avatar">{name.charAt(0)}</div>

      <div className="activityContent">
        <strong>{name}</strong>
        <span>{text}</span>
      </div>

      <span className="activityType">{type}</span>
      <span className="confidence">{confidence}</span>
    </div>
  );
}

export default Dashboard;