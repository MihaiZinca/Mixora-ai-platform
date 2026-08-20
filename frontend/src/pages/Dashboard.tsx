import {
  Activity,
  AlertTriangle,
  Bot,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  RefreshCw,
  Settings2,
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

type ActivityLog = {
  id: number;
  event_type: string;
  title: string;
  description: string;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
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

function getActivityIcon(eventType: string) {
  if (eventType === "conversation_created") {
    return <MessageSquare size={16} />;
  }

  if (
    eventType === "ai_reply_generated" ||
    eventType === "automatic_reply_sent"
  ) {
    return <Bot size={16} />;
  }

  if (eventType === "manual_reply_sent") {
    return <MessageSquare size={16} />;
  }

  if (
    eventType === "ticket_created" ||
    eventType === "ticket_status_changed"
  ) {
    return <TicketCheck size={16} />;
  }

  if (
    eventType === "knowledge_uploaded" ||
    eventType === "knowledge_deleted"
  ) {
    return <FileText size={16} />;
  }

  if (eventType === "response_mode_changed") {
    return <Settings2 size={16} />;
  }

  if (eventType === "conversation_reanalyzed") {
    return <RefreshCw size={16} />;
  }

  return <Activity size={16} />;
}

function formatActivityDate(value: string) {
  const date = new Date(value);

  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dashboard() {
  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [recent, setRecent] =
    useState<RecentConversation[]>([]);

  const [intents, setIntents] =
    useState<IntentStat[]>([]);

  const [activity, setActivity] =
    useState<ActivityLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        statsResponse,
        recentResponse,
        intentsResponse,
        activityResponse,
      ] = await Promise.all([
        fetch(
          "http://localhost:8000/api/dashboard/stats"
        ),
        fetch(
          "http://localhost:8000/api/dashboard/recent-conversations"
        ),
        fetch(
          "http://localhost:8000/api/dashboard/intents"
        ),
        fetch(
          "http://localhost:8000/api/dashboard/recent-activity"
        ),
      ]);

      if (
        !statsResponse.ok ||
        !recentResponse.ok ||
        !intentsResponse.ok ||
        !activityResponse.ok
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

      const activityData: ActivityLog[] =
        await activityResponse.json();

      setStats(statsData);
      setRecent(recentData);
      setIntents(intentData);
      setActivity(activityData);
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
        <RefreshCw
          className="spin"
          size={24}
        />

        <span>
          Se incarca Dashboard...
        </span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="pageState">
        <strong>
          {error ||
            "Datele nu sunt disponibile."}
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
    ...intents.map(
      (item) => item.count
    ),
    1
  );

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">
            MIXORA OVERVIEW
          </p>

          <h2>
            Dashboard
          </h2>

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

          <span>
            Conversatii
          </span>

          <strong>
            {stats.conversations}
          </strong>

          <small>
            Total conversatii
          </small>
        </div>

        <div className="statCard">
          <TicketCheck size={20} />

          <span>
            Tickets
          </span>

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
                Conversatii recente
              </h3>
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="dashboardEmpty">
              Nu exista conversatii.
            </div>
          ) : (
            recent.map(
              (conversation) => (
                <div
                  className="dashboardConversation"
                  key={
                    conversation.id
                  }
                >
                  <div className="avatar">
                    {conversation.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="dashboardConversationInfo">
                    <strong>
                      {
                        conversation.name
                      }
                    </strong>

                    <span>
                      {
                        conversation.subject
                      }
                    </span>
                  </div>

                  <div className="dashboardConversationMeta">
                    <span>
                      {translateIntent(
                        conversation.intent
                      )}
                    </span>

                    <small>
                      {
                        conversation.confidence
                      }
                      %
                    </small>
                  </div>

                  <span
                    className={`dashboardPriority ${
                      conversation.priority ===
                      "High"
                        ? "dashboardPriorityHigh"
                        : ""
                    }`}
                  >
                    {translatePriority(
                      conversation.priority
                    )}
                  </span>
                </div>
              )
            )
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
                (item.count /
                  maxIntentCount) *
                100;

              return (
                <div
                  className="intentRow"
                  key={item.intent}
                >
                  <div className="intentRowTop">
                    <span>
                      {translateIntent(
                        item.intent
                      )}
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
                RECENT ACTIVITY
              </p>

              <h3>
                Activitate recenta
              </h3>
            </div>

            <span className="activityCount">
              {activity.length}
            </span>
          </div>

          {activity.length === 0 ? (
            <div className="dashboardEmpty">
              Nu exista activitate recenta.
            </div>
          ) : (
            <div className="activityList">
              {activity.map(
                (item) => (
                  <div
                    className="activityItem"
                    key={item.id}
                  >
                    <div className="activityIcon">
                      {getActivityIcon(
                        item.event_type
                      )}
                    </div>

                    <div className="activityInfo">
                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {
                          item.description
                        }
                      </span>

                      <small>
                        {formatActivityDate(
                          item.created_at
                        )}
                      </small>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

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
              <span>
                Deschise
              </span>
            </div>

            <strong>
              {stats.tickets_open}
            </strong>
          </div>

          <div className="dashboardStatusRow">
            <div>
              <RefreshCw size={17} />

              <span>
                In lucru
              </span>
            </div>

            <strong>
              {
                stats.tickets_in_progress
              }
            </strong>
          </div>

          <div className="dashboardStatusRow">
            <div>
              <CheckCircle2 size={17} />

              <span>
                Rezolvate
              </span>
            </div>

            <strong>
              {stats.tickets_resolved}
            </strong>
          </div>
        </div>
      </section>

      <section className="dashboardGrid">
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

            <strong>
              ONLINE
            </strong>
          </div>

          <div className="systemService">
            <div>
              <span className="statusDot" />
              PostgreSQL
            </div>

            <strong>
              ONLINE
            </strong>
          </div>

          <div className="systemService">
            <div>
              <span className="statusDot" />
              Qdrant
            </div>

            <strong>
              ONLINE
            </strong>
          </div>

          <div className="systemService">
            <div>
              <span className="statusDot" />
              RAG Engine
            </div>

            <strong>
              READY
            </strong>
          </div>
        </div>

        <div className="panel">
          <div className="dashboardPanelHeader">
            <div>
              <p className="eyebrow">
                PLATFORM
              </p>

              <h3>
                Rezumat operational
              </h3>
            </div>
          </div>

          <div className="dashboardStatusRow">
            <div>
              <MessageSquare
                size={17}
              />

              <span>
                Conversatii procesate
              </span>
            </div>

            <strong>
              {stats.conversations}
            </strong>
          </div>

          <div className="dashboardStatusRow">
            <div>
              <TicketCheck
                size={17}
              />

              <span>
                Tichete totale
              </span>
            </div>

            <strong>
              {stats.tickets_total}
            </strong>
          </div>

          <div className="dashboardStatusRow">
            <div>
              <BookOpen size={17} />

              <span>
                Documente RAG
              </span>
            </div>

            <strong>
              {
                stats.knowledge_documents
              }
            </strong>
          </div>
        </div>
      </section>
    </>
  );
}

export default Dashboard;