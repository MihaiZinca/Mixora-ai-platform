import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  MessageSquare,
  RefreshCw,
  TicketCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

type DashboardStats = {
  conversations: number;
  tickets_total: number;
  tickets_open: number;
  tickets_in_progress: number;
  tickets_resolved: number;
  high_priority_tickets: number;
  knowledge_documents: number;
};

type RecentConversation = {
  id: number;
  name: string;
  subject: string;
  intent: string;
  priority: string;
  confidence: number;
};

type IntentStat = {
  intent: string;
  count: number;
};

function translateIntent(intent: string) {
  const map: Record<string, string> = {
    "Return request": "Cerere de retur",
    "Purchase intent": "Intentie de cumparare",
    "Order status": "Status comanda",
    "Payment issue": "Problema plata",
    "General support": "Suport general",
    Unclassified: "Neclasificat",
  };

  return map[intent] ?? intent;
}

function translatePriority(priority: string) {
  const map: Record<string, string> = {
    High: "Ridicata",
    Medium: "Medie",
    Low: "Scazuta",
  };

  return map[priority] ?? priority;
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentConversation[]>([]);
  const [intents, setIntents] = useState<IntentStat[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        statsResponse,
        recentResponse,
        intentsResponse,
      ] = await Promise.all([
        fetch("http://localhost:8000/api/dashboard/stats"),
        fetch(
          "http://localhost:8000/api/dashboard/recent-conversations"
        ),
        fetch(
          "http://localhost:8000/api/dashboard/intents"
        ),
      ]);

      if (
        !statsResponse.ok ||
        !recentResponse.ok ||
        !intentsResponse.ok
      ) {
        throw new Error(
          "Dashboard-ul nu a putut fi incarcat."
        );
      }

      const statsData: DashboardStats =
        await statsResponse.json();

      const recentData: RecentConversation[] =
        await recentResponse.json();

      const intentData: IntentStat[] =
        await intentsResponse.json();

      setStats(statsData);
      setRecent(recentData);
      setIntents(intentData);
    } catch (err) {
      console.error(err);

      setError(
        "Nu s-a putut realiza conexiunea cu MIXORA API."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="pageState">
        <RefreshCw className="spin" size={24} />
        <span>Se incarca Dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="pageState">
        <strong>
          {error || "Datele nu sunt disponibile."}
        </strong>

        <button
          className="primaryButton"
          onClick={loadDashboard}
        >
          Incearca din nou
        </button>
      </div>
    );
  }

  const maxIntentCount = Math.max(
    ...intents.map((item) => item.count),
    1
  );

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">
            MIXORA OVERVIEW
          </p>

          <h2>Dashboard</h2>

          <p className="subtitle">
            Activitatea si performanta platformei MIXORA.
          </p>
        </div>

        <button
          className="secondaryButton"
          onClick={loadDashboard}
        >
          <RefreshCw size={16} />
          Reincarca
        </button>
      </header>

      <section className="stats">
        <div className="statCard">
          <MessageSquare size={20} />

          <span>Conversatii</span>

          <strong>
            {stats.conversations}
          </strong>

          <small>Total conversatii</small>
        </div>

        <div className="statCard">
          <TicketCheck size={20} />

          <span>Tickets</span>

          <strong>
            {stats.tickets_total}
          </strong>

          <small>
            {stats.tickets_open} deschise
          </small>
        </div>

        <div className="statCard">
          <AlertTriangle size={20} />

          <span>
            Prioritate ridicata
          </span>

          <strong>
            {stats.high_priority_tickets}
          </strong>

          <small>
            Necesita atentie
          </small>
        </div>

        <div className="statCard">
          <BookOpen size={20} />

          <span>
            Knowledge Base
          </span>

          <strong>
            {stats.knowledge_documents}
          </strong>

          <small>
            Documente disponibile
          </small>
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="panel">
          <div className="dashboardPanelHeader">
            <div>
              <p className="eyebrow">
                CONVERSATII
              </p>

              <h3>
                Activitate recenta
              </h3>
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="dashboardEmpty">
              Nu exista conversatii.
            </div>
          ) : (
            recent.map((conversation) => (
              <div
                className="dashboardConversation"
                key={conversation.id}
              >
                <div className="avatar">
                  {conversation.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="dashboardConversationInfo">
                  <strong>
                    {conversation.name}
                  </strong>

                  <span>
                    {conversation.subject}
                  </span>
                </div>

                <div className="dashboardConversationMeta">
                  <span>
                    {translateIntent(
                      conversation.intent
                    )}
                  </span>

                  <small>
                    {conversation.confidence}%
                  </small>
                </div>

                <span
                  className={`dashboardPriority ${
                    conversation.priority === "High"
                      ? "dashboardPriorityHigh"
                      : ""
                  }`}
                >
                  {translatePriority(
                    conversation.priority
                  )}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <div className="dashboardPanelHeader">
            <div>
              <p className="eyebrow">
                AI INSIGHTS
              </p>

              <h3>
                Distributie intentii
              </h3>
            </div>
          </div>

          {intents.length === 0 ? (
            <div className="dashboardEmpty">
              Nu exista date.
            </div>
          ) : (
            intents.map((item) => {
              const width =
                (item.count / maxIntentCount) * 100;

              return (
                <div
                  className="intentRow"
                  key={item.intent}
                >
                  <div className="intentRowTop">
                    <span>
                      {translateIntent(item.intent)}
                    </span>

                    <strong>
                      {item.count}
                    </strong>
                  </div>

                  <div className="intentProgress">
                    <div
                      className="intentProgressFill"
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="panel">
          <div className="dashboardPanelHeader">
            <div>
              <p className="eyebrow">
                TICKET PIPELINE
              </p>

              <h3>
                Status tichete
              </h3>
            </div>
          </div>

          <div className="dashboardStatusRow">
            <div>
              <Clock3 size={17} />
              <span>Deschise</span>
            </div>

            <strong>
              {stats.tickets_open}
            </strong>
          </div>

          <div className="dashboardStatusRow">
            <div>
              <RefreshCw size={17} />
              <span>In lucru</span>
            </div>

            <strong>
              {stats.tickets_in_progress}
            </strong>
          </div>

          <div className="dashboardStatusRow">
            <div>
              <CheckCircle2 size={17} />
              <span>Rezolvate</span>
            </div>

            <strong>
              {stats.tickets_resolved}
            </strong>
          </div>
        </div>

        <div className="panel">
          <div className="dashboardPanelHeader">
            <div>
              <p className="eyebrow">
                SYSTEM
              </p>

              <h3>
                Servicii MIXORA
              </h3>
            </div>
          </div>

          <div className="systemService">
            <div>
              <span className="statusDot" />
              FastAPI
            </div>

            <strong>ONLINE</strong>
          </div>

          <div className="systemService">
            <div>
              <span className="statusDot" />
              PostgreSQL
            </div>

            <strong>ONLINE</strong>
          </div>

          <div className="systemService">
            <div>
              <span className="statusDot" />
              Qdrant
            </div>

            <strong>ONLINE</strong>
          </div>

          <div className="systemService">
            <div>
              <span className="statusDot" />
              RAG Engine
            </div>

            <strong>READY</strong>
          </div>
        </div>
      </section>
    </>
  );
}

export default Dashboard;