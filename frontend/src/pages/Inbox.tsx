import { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  TicketPlus,
  X,
} from "lucide-react";

type Conversation = {
  id: number;
  name: string;
  subject: string;
  message: string;
  intent: string;
  priority: string;
  sentiment: string;
  confidence: number;
};

type GeneratedReplyResponse = {
  reply: string;
};

function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);

  const [reply, setReply] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showNewConversation, setShowNewConversation] = useState(false);

  const [newConversation, setNewConversation] = useState({
    name: "",
    subject: "",
    message: "",
  });

  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:8000/api/conversations"
      );

      if (!response.ok) {
        throw new Error("Could not load conversations.");
      }

      const data: Conversation[] = await response.json();

      setConversations(data);

      if (data.length > 0) {
        setSelected((current) => {
          if (!current) {
            return data[0];
          }

          const existingConversation = data.find(
            (conversation) => conversation.id === current.id
          );

          return existingConversation ?? data[0];
        });
      } else {
        setSelected(null);
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to MIXORA API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const createConversation = async () => {
    if (
      !newConversation.name.trim() ||
      !newConversation.subject.trim() ||
      !newConversation.message.trim()
    ) {
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch(
        "http://localhost:8000/api/conversations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newConversation),
        }
      );

      if (!response.ok) {
        throw new Error("Could not create conversation.");
      }

      const created: Conversation = await response.json();

      setConversations((current) => [
        ...current,
        created,
      ]);

      setSelected(created);
      setReply("");

      setNewConversation({
        name: "",
        subject: "",
        message: "",
      });

      setShowNewConversation(false);
    } catch (err) {
      console.error(err);
      setError("Could not create conversation.");
    } finally {
      setCreating(false);
    }
  };

  const generateReply = async () => {
    if (!selected) {
      return;
    }

    try {
      setGenerating(true);
      setError("");

      const response = await fetch(
        `http://localhost:8000/api/conversations/${selected.id}/generate-reply`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Could not generate reply.");
      }

      const data: GeneratedReplyResponse = await response.json();

      setReply(data.reply);
    } catch (err) {
      console.error(err);
      setError("Could not generate AI reply.");
    } finally {
      setGenerating(false);
    }
  };

  const reanalyzeConversation = async () => {
    if (!selected) {
      return;
    }

    try {
      setReanalyzing(true);
      setError("");

      const response = await fetch(
        `http://localhost:8000/api/conversations/${selected.id}/reanalyze`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Could not re-analyze conversation.");
      }

      const updated: Conversation = await response.json();

      setSelected(updated);

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === updated.id
            ? updated
            : conversation
        )
      );
    } catch (err) {
      console.error(err);
      setError("Could not re-analyze conversation.");
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="pageState">
        <RefreshCw className="spin" size={24} />
        <span>Loading conversations...</span>
      </div>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <div className="pageState">
        <strong>{error}</strong>

        <button
          className="primaryButton"
          onClick={loadConversations}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">CUSTOMER SUPPORT</p>

          <h2>Inbox</h2>

          <p className="subtitle">
            Conversations loaded directly from MIXORA API.
          </p>
        </div>

        <div className="headerActions">
          <div className="inboxOnline">
            <span className="statusDot" />
            API Connected
          </div>

          <button
            className="primaryButton"
            onClick={() => setShowNewConversation(true)}
          >
            <Plus size={16} />
            New conversation
          </button>
        </div>
      </header>

      {error && (
        <div
          style={{
            marginBottom: "14px",
            color: "#f87171",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {conversations.length === 0 || !selected ? (
        <div className="pageState">
          <strong>No conversations found.</strong>

          <button
            className="primaryButton"
            onClick={() => setShowNewConversation(true)}
          >
            <Plus size={16} />
            Create first conversation
          </button>
        </div>
      ) : (
        <div className="inboxLayout">
          <section className="conversationList">
            <div className="conversationListHeader">
              <strong>Conversations</strong>
              <span>{conversations.length}</span>
            </div>

            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`conversationItem ${
                  selected.id === conversation.id
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  setSelected(conversation);
                  setReply("");
                }}
              >
                <div className="avatar">
                  {conversation.name.charAt(0).toUpperCase()}
                </div>

                <div className="conversationPreview">
                  <strong>{conversation.name}</strong>
                  <span>{conversation.subject}</span>
                </div>

                {conversation.priority === "High" && (
                  <span className="priorityDot" />
                )}
              </button>
            ))}
          </section>

          <section className="chatPanel">
            <div className="chatHeader">
              <div className="avatar">
                {selected.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{selected.name}</strong>
                <span>{selected.subject}</span>
              </div>
            </div>

            <div className="messages">
              <div className="message customerMessage">
                <span>CLIENT</span>
                <p>{selected.message}</p>
              </div>

              {reply && (
                <div className="message aiMessage">
                  <span>MIXORA AI DRAFT</span>
                  <p>{reply}</p>
                </div>
              )}
            </div>

            <div className="composer">
              <textarea
                value={reply}
                onChange={(event) =>
                  setReply(event.target.value)
                }
                placeholder="Write a reply or generate one with MIXORA..."
              />

              <div className="composerActions">
                <button
                  className="secondaryButton"
                  onClick={generateReply}
                  disabled={generating}
                >
                  {generating ? (
                    <RefreshCw className="spin" size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}

                  {generating
                    ? "Generating..."
                    : "Generate AI"}
                </button>

                <button className="secondaryButton">
                  <TicketPlus size={16} />
                  Create Ticket
                </button>

                <button
                  className="primaryButton"
                  disabled={!reply.trim()}
                >
                  <Send size={16} />
                  Send
                </button>
              </div>
            </div>
          </section>

          <aside className="analysisPanel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <p className="eyebrow">AI ANALYSIS</p>

              <button
                className="iconButton"
                onClick={reanalyzeConversation}
                disabled={reanalyzing}
                title="Re-analyze conversation"
              >
                <RotateCcw
                  className={reanalyzing ? "spin" : ""}
                  size={15}
                />
              </button>
            </div>

            <div className="analysisBlock">
              <span>Intent</span>
              <strong>{selected.intent}</strong>
            </div>

            <div className="analysisBlock">
              <span>Sentiment</span>
              <strong>{selected.sentiment}</strong>
            </div>

            <div className="analysisBlock">
              <span>Priority</span>
              <strong>{selected.priority}</strong>
            </div>

            <div className="analysisBlock">
              <span>Confidence</span>

              <strong>{selected.confidence}%</strong>

              <div className="progress">
                <div
                  className="dynamicProgress"
                  style={{
                    width: `${selected.confidence}%`,
                  }}
                />
              </div>
            </div>

            <div className="analysisBlock">
              <span>Data source</span>

              <strong className="connectedValue">
                PostgreSQL
              </strong>
            </div>

            <div className="analysisBlock">
              <span>Decision</span>

              <strong className="draftStatus">
                DRAFT
              </strong>
            </div>
          </aside>
        </div>
      )}

      {showNewConversation && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">NEW</p>
                <h3>Create conversation</h3>
              </div>

              <button
                className="iconButton"
                onClick={() =>
                  setShowNewConversation(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className="formGroup">
              <label>Customer name</label>

              <input
                value={newConversation.name}
                onChange={(event) =>
                  setNewConversation({
                    ...newConversation,
                    name: event.target.value,
                  })
                }
                placeholder="Example: Alex Popescu"
              />
            </div>

            <div className="formGroup">
              <label>Subject</label>

              <input
                value={newConversation.subject}
                onChange={(event) =>
                  setNewConversation({
                    ...newConversation,
                    subject: event.target.value,
                  })
                }
                placeholder="Example: Delivery problem"
              />
            </div>

            <div className="formGroup">
              <label>Message</label>

              <textarea
                value={newConversation.message}
                onChange={(event) =>
                  setNewConversation({
                    ...newConversation,
                    message: event.target.value,
                  })
                }
                placeholder="Write the customer message..."
              />
            </div>

            <div className="modalActions">
              <button
                className="secondaryButton"
                onClick={() =>
                  setShowNewConversation(false)
                }
              >
                Cancel
              </button>

              <button
                className="primaryButton"
                onClick={createConversation}
                disabled={
                  creating ||
                  !newConversation.name.trim() ||
                  !newConversation.subject.trim() ||
                  !newConversation.message.trim()
                }
              >
                {creating
                  ? "Creating..."
                  : "Create conversation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Inbox;