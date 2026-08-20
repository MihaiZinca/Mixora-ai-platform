import { useEffect, useState } from "react";
import {
  Bot,
  Database,
  FileText,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
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
  source: string | null;
};

type TicketResponse = {
  id: number;
  conversation_id: number;
  customer_name: string;
  title: string;
  summary: string;
  priority: string;
  status: string;
  created_at: string;
};

type ConversationReply = {
  id: number;
  conversation_id: number;
  content: string;
  source: string | null;
  reply_type: "manual" | "automatic";
  created_at: string;
};

type ResponseMode = "draft" | "auto";

type ResponseModeResponse = {
  mode: ResponseMode;
};

type ConversationFieldErrors = {
  name?: string;
  subject?: string;
  message?: string;
};

async function getApiErrorMessage(
  response: Response,
  fallback: string
) {
  try {
    const data = await response.json();

    if (typeof data?.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data?.detail)) {
      const firstError = data.detail[0];

      if (firstError?.loc && firstError?.msg) {
        const field = firstError.loc[
          firstError.loc.length - 1
        ];

        const fieldNames: Record<string, string> = {
          name: "Numele",
          subject: "Subiectul",
          message: "Mesajul",
          content: "Raspunsul",
        };

        const readableField =
          fieldNames[field] ?? "Campul";

        return `${readableField}: ${firstError.msg}`;
      }
    }
  } catch {
    // Raspunsul API nu contine JSON valid.
  }

  return fallback;
}

function translateIntent(intent: string) {
  const map: Record<string, string> = {
    "Return request": "Cerere de retur",
    "Purchase intent": "Intentie de cumparare",
    "Order status": "Status comanda",
    "Payment issue": "Problema plata",
    "General support": "Suport general",
    Unclassified: "Neclasificat",
    Unknown: "Necunoscut",
  };

  return map[intent] ?? intent;
}

function translateSentiment(sentiment: string) {
  const map: Record<string, string> = {
    Positive: "Pozitiv",
    Neutral: "Neutru",
    Negative: "Negativ",
    Unknown: "Necunoscut",
  };

  return map[sentiment] ?? sentiment;
}

function translatePriority(priority: string) {
  const map: Record<string, string> = {
    High: "Ridicata",
    Medium: "Medie",
    Low: "Scazuta",
    Unknown: "Necunoscuta",
  };

  return map[priority] ?? priority;
}

function Inbox() {
  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [selected, setSelected] =
    useState<Conversation | null>(null);

  const [replies, setReplies] =
    useState<ConversationReply[]>([]);

  const [reply, setReply] = useState("");

  const [replySource, setReplySource] =
    useState<string | null>(null);

  const [responseMode, setResponseMode] =
    useState<ResponseMode>("draft");

  const [loading, setLoading] = useState(true);

  const [loadingReplies, setLoadingReplies] =
    useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [showNewConversation, setShowNewConversation] =
    useState(false);

  const [newConversation, setNewConversation] =
    useState({
      name: "",
      subject: "",
      message: "",
    });

  const [conversationFieldErrors, setConversationFieldErrors] =
    useState<ConversationFieldErrors>({});

  const [replyValidationError, setReplyValidationError] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [reanalyzing, setReanalyzing] =
    useState(false);

  const [creatingTicket, setCreatingTicket] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [intentFilter, setIntentFilter] =
    useState("All");

  const [priorityFilter, setPriorityFilter] =
    useState("All");

  const loadResponseMode = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/settings/response-mode"
      );

      if (!response.ok) {
        return;
      }

      const data: ResponseModeResponse =
        await response.json();

      setResponseMode(data.mode);
    } catch (err) {
      console.error(err);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:8000/api/conversations"
      );

      if (!response.ok) {
        throw new Error(
          "Conversatiile nu au putut fi incarcate."
        );
      }

      const data: Conversation[] =
        await response.json();

      setConversations(data);

      if (data.length > 0) {
        setSelected((current) => {
          if (!current) {
            return data[0];
          }

          const existingConversation =
            data.find(
              (conversation) =>
                conversation.id === current.id
            );

          return (
            existingConversation ??
            data[0]
          );
        });
      } else {
        setSelected(null);
      }
    } catch (err) {
      console.error(err);

      setError(
        "Nu s-a putut realiza conexiunea cu API-ul MIXORA."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (
    conversationId: number
  ) => {
    try {
      setLoadingReplies(true);
      setError("");

      const response = await fetch(
        `http://localhost:8000/api/conversations/${conversationId}/replies`
      );

      if (!response.ok) {
        throw new Error(
          "Istoricul raspunsurilor nu a putut fi incarcat."
        );
      }

      const data: ConversationReply[] =
        await response.json();

      setReplies(data);
    } catch (err) {
      console.error(err);

      setError(
        "Istoricul raspunsurilor nu a putut fi incarcat."
      );
    } finally {
      setLoadingReplies(false);
    }
  };

  useEffect(() => {
    Promise.all([
      loadConversations(),
      loadResponseMode(),
    ]);
  }, []);

  useEffect(() => {
    if (selected) {
      loadReplies(selected.id);
    } else {
      setReplies([]);
    }
  }, [selected?.id]);

  const validateNewConversation = () => {
    const errors: ConversationFieldErrors = {};

    const name = newConversation.name.trim();
    const subject = newConversation.subject.trim();
    const message = newConversation.message.trim();

    if (name.length < 2) {
      errors.name =
        "Numele trebuie sa aiba minimum 2 caractere.";
    }

    if (subject.length < 3) {
      errors.subject =
        "Subiectul trebuie sa aiba minimum 3 caractere.";
    }

    if (message.length < 5) {
      errors.message =
        "Mesajul trebuie sa aiba minimum 5 caractere.";
    }

    setConversationFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const isNewConversationValid =
    newConversation.name.trim().length >= 2 &&
    newConversation.subject.trim().length >= 3 &&
    newConversation.message.trim().length >= 5;

  const createConversation = async () => {
    if (!validateNewConversation()) {
      setError(
        "Verifica datele introduse inainte de a crea conversatia."
      );
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        "http://localhost:8000/api/conversations",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: newConversation.name.trim(),
            subject: newConversation.subject.trim(),
            message: newConversation.message.trim(),
          }),
        }
      );

      if (!response.ok) {
        const message = await getApiErrorMessage(
          response,
          "Conversatia nu a putut fi creata."
        );

        throw new Error(message);
      }

      const created: Conversation =
        await response.json();

      setConversations((current) => [
        ...current,
        created,
      ]);

      setSelected(created);

      setReply("");
      setReplySource(null);

      setNewConversation({
        name: "",
        subject: "",
        message: "",
      });

      setConversationFieldErrors({});
      setShowNewConversation(false);

      if (
        responseMode === "auto" &&
        created.confidence >= 90
      ) {
        setSuccessMessage(
          "Conversatia a fost creata. MIXORA a generat automat un raspuns."
        );

        setTimeout(() => {
          loadReplies(created.id);
        }, 500);
      } else if (
        responseMode === "auto"
      ) {
        setSuccessMessage(
          "Conversatia a fost creata, dar necesita verificare manuala deoarece increderea AI este sub 90%."
        );
      } else {
        setSuccessMessage(
          "Conversatia a fost creata cu succes."
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Conversatia nu a putut fi creata."
      );
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
      setSuccessMessage("");
      setReplySource(null);

      const response = await fetch(
        `http://localhost:8000/api/conversations/${selected.id}/generate-reply`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const message = await getApiErrorMessage(
          response,
          "Raspunsul nu a putut fi generat."
        );

        throw new Error(message);
      }

      const data: GeneratedReplyResponse =
        await response.json();

      setReply(data.reply);
      setReplySource(data.source);
    } catch (err) {
      console.error(err);

      setError(
        "MIXORA nu a putut genera raspunsul."
      );
    } finally {
      setGenerating(false);
    }
  };

  const sendReply = async () => {
    if (!selected) {
      return;
    }

    const cleanReply = reply.trim();

    if (!cleanReply) {
      setReplyValidationError(
        "Raspunsul nu poate fi gol."
      );
      return;
    }

    if (cleanReply.length > 10000) {
      setReplyValidationError(
        "Raspunsul poate avea maximum 10000 de caractere."
      );
      return;
    }

    setReplyValidationError("");

    try {
      setSending(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `http://localhost:8000/api/conversations/${selected.id}/replies`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            content: cleanReply,
            source: replySource,
          }),
        }
      );

      if (!response.ok) {
        const message = await getApiErrorMessage(
          response,
          "Raspunsul nu a putut fi trimis."
        );

        throw new Error(message);
      }

      const createdReply:
        ConversationReply =
        await response.json();

      setReplies((current) => [
        ...current,
        createdReply,
      ]);

      setReply("");
      setReplySource(null);

      setSuccessMessage(
        "Raspunsul a fost trimis si salvat."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Raspunsul nu a putut fi trimis."
      );
    } finally {
      setSending(false);
    }
  };

  const reanalyzeConversation =
    async () => {
      if (!selected) {
        return;
      }

      try {
        setReanalyzing(true);
        setError("");
        setSuccessMessage("");

        const response = await fetch(
          `http://localhost:8000/api/conversations/${selected.id}/reanalyze`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Conversatia nu a putut fi reanalizata."
          );
        }

        const updated: Conversation =
          await response.json();

        setSelected(updated);

        setConversations(
          (current) =>
            current.map(
              (conversation) =>
                conversation.id ===
                updated.id
                  ? updated
                  : conversation
            )
        );

        setReply("");
        setReplySource(null);

        setSuccessMessage(
          "Conversatia a fost reanalizata."
        );
      } catch (err) {
        console.error(err);

        setError(
          "Conversatia nu a putut fi reanalizata."
        );
      } finally {
        setReanalyzing(false);
      }
    };

  const createTicket = async () => {
    if (!selected) {
      return;
    }

    try {
      setCreatingTicket(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `http://localhost:8000/api/conversations/${selected.id}/ticket`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        if (
          response.status === 409
        ) {
          setError(
            "Exista deja un tichet pentru aceasta conversatie."
          );

          return;
        }

        throw new Error(
          "Tichetul nu a putut fi creat."
        );
      }

      const ticket:
        TicketResponse =
        await response.json();

      setSuccessMessage(
        `Tichet #${ticket.id} creat cu succes.`
      );
    } catch (err) {
      console.error(err);

      setError(
        "Tichetul nu a putut fi creat."
      );
    } finally {
      setCreatingTicket(false);
    }
  };

  const selectConversation = (
    conversation: Conversation
  ) => {
    setSelected(conversation);

    setReply("");
    setReplySource(null);
    setReplyValidationError("");
    setError("");
    setSuccessMessage("");

    loadResponseMode();
  };

  const filteredConversations =
    conversations.filter(
      (conversation) => {
        const searchValue =
          search
            .toLowerCase()
            .trim();

        const matchesSearch =
          !searchValue ||
          conversation.name
            .toLowerCase()
            .includes(searchValue) ||
          conversation.subject
            .toLowerCase()
            .includes(searchValue) ||
          conversation.message
            .toLowerCase()
            .includes(searchValue);

        const matchesIntent =
          intentFilter === "All" ||
          conversation.intent ===
            intentFilter;

        const matchesPriority =
          priorityFilter === "All" ||
          conversation.priority ===
            priorityFilter;

        return (
          matchesSearch &&
          matchesIntent &&
          matchesPriority
        );
      }
    );

  if (loading) {
    return (
      <div className="pageState">
        <RefreshCw
          className="spin"
          size={24}
        />

        <span>
          Se incarca conversatiile...
        </span>
      </div>
    );
  }

  if (
    error &&
    conversations.length === 0
  ) {
    return (
      <div className="pageState">
        <strong>
          {error}
        </strong>

        <button
          className="primaryButton"
          onClick={
            loadConversations
          }
        >
          Incearca din nou
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">
            CUSTOMER SUPPORT
          </p>

          <h2>
            Inbox
          </h2>

          <p className="subtitle">
            Conversatii preluate direct
            din API-ul MIXORA.
          </p>
        </div>

        <div className="headerActions">
          <div
            className={`aiModeBadge ${
              responseMode === "auto"
                ? "aiModeAuto"
                : "aiModeDraft"
            }`}
          >
            <Bot size={14} />

            <div>
              <span>
                MOD AI
              </span>

              <strong>
                {responseMode ===
                "auto"
                  ? "AUTO REPLY"
                  : "DRAFT"}
              </strong>
            </div>
          </div>

          <div className="inboxOnline">
            <span className="statusDot" />
            API conectat
          </div>

          <button
            className="primaryButton"
            onClick={() => {
              setConversationFieldErrors({});
              setShowNewConversation(
                true
              );
            }}
          >
            <Plus size={16} />
            Conversatie noua
          </button>
        </div>
      </header>

      {error && (
        <div className="knowledgeError">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="inboxSuccess">
          {successMessage}
        </div>
      )}

      {conversations.length === 0 ||
      !selected ? (
        <div className="pageState">
          <strong>
            Nu exista conversatii.
          </strong>

          <button
            className="primaryButton"
            onClick={() => {
              setConversationFieldErrors({});
              setShowNewConversation(
                true
              );
            }}
          >
            <Plus size={16} />
            Creeaza prima conversatie
          </button>
        </div>
      ) : (
        <div className="inboxLayout">
          <section className="conversationList">
            <div className="conversationListHeader">
              <strong>
                Conversatii
              </strong>

              <span>
                {
                  filteredConversations.length
                }
                /
                {
                  conversations.length
                }
              </span>
            </div>

            <div className="inboxFilters">
              <div className="inboxSearch">
                <Search size={14} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Cauta conversatii..."
                />
              </div>

              <select
                className="inboxFilterSelect"
                value={intentFilter}
                onChange={(event) =>
                  setIntentFilter(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  Toate intentiile
                </option>

                <option value="Return request">
                  Cerere de retur
                </option>

                <option value="Purchase intent">
                  Intentie de cumparare
                </option>

                <option value="Order status">
                  Status comanda
                </option>

                <option value="Payment issue">
                  Problema plata
                </option>

                <option value="General support">
                  Suport general
                </option>

                <option value="Unclassified">
                  Neclasificat
                </option>
              </select>

              <select
                className="inboxFilterSelect"
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  Toate prioritatile
                </option>

                <option value="High">
                  Ridicata
                </option>

                <option value="Medium">
                  Medie
                </option>

                <option value="Low">
                  Scazuta
                </option>
              </select>
            </div>

            {filteredConversations.length ===
            0 ? (
              <div className="inboxNoResults">
                <Search size={20} />

                <strong>
                  Niciun rezultat
                </strong>

                <span>
                  Incearca alte filtre
                  sau alta cautare.
                </span>

                <button
                  className="secondaryButton"
                  onClick={() => {
                    setSearch("");
                    setIntentFilter(
                      "All"
                    );
                    setPriorityFilter(
                      "All"
                    );
                  }}
                >
                  Reseteaza filtrele
                </button>
              </div>
            ) : (
              filteredConversations.map(
                (conversation) => (
                  <button
                    key={
                      conversation.id
                    }
                    className={`conversationItem ${
                      selected.id ===
                      conversation.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectConversation(
                        conversation
                      )
                    }
                  >
                    <div className="avatar">
                      {conversation.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="conversationPreview">
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

                    {conversation.priority ===
                      "High" && (
                      <span className="priorityDot" />
                    )}
                  </button>
                )
              )
            )}
          </section>

          <section className="chatPanel">
            <div className="chatHeader">
              <div className="avatar">
                {selected.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {selected.name}
                </strong>

                <span>
                  {selected.subject}
                </span>
              </div>
            </div>

            <div className="messages">
              <div className="message customerMessage">
                <span>
                  CLIENT
                </span>

                <p>
                  {selected.message}
                </p>
              </div>

              {loadingReplies && (
                <div className="replyLoading">
                  <RefreshCw
                    className="spin"
                    size={14}
                  />

                  Se incarca istoricul...
                </div>
              )}

              {!loadingReplies &&
                replies.map(
                  (savedReply) => (
                    <div
                      className={`message sentMessage ${
                        savedReply.reply_type ===
                        "automatic"
                          ? "automaticMessage"
                          : ""
                      }`}
                      key={
                        savedReply.id
                      }
                    >
                      <span
                        className={
                          savedReply.reply_type ===
                          "automatic"
                            ? "automaticReplyLabel"
                            : ""
                        }
                      >
                        {savedReply.reply_type ===
                        "automatic"
                          ? "RASPUNS AUTOMAT MIXORA"
                          : "RASPUNS TRIMIS"}
                      </span>

                      <p>
                        {
                          savedReply.content
                        }
                      </p>

                      <div className="sentReplyMeta">
                        <span>
                          {new Date(
                            savedReply.created_at
                          ).toLocaleString(
                            "ro-RO"
                          )}
                        </span>

                        {savedReply.source && (
                          <span>
                            <FileText
                              size={12}
                            />

                            {
                              savedReply.source
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )}

              {reply && (
                <div className="message aiMessage">
                  <span>
                    DRAFT MIXORA AI
                  </span>

                  <p>
                    {reply}
                  </p>

                  {replySource && (
                    <div className="draftSource">
                      <FileText
                        size={13}
                      />

                      Sursa:{" "}
                      {replySource}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="composer">
              <textarea
                value={reply}
                maxLength={10000}
                onChange={(event) => {
                  setReply(
                    event.target.value
                  );

                  if (replyValidationError) {
                    setReplyValidationError("");
                  }
                }}
                placeholder="Scrie un raspuns sau genereaza unul cu MIXORA..."
              />

              {replyValidationError && (
                <span
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#f87171",
                    fontSize: "11px",
                  }}
                >
                  {replyValidationError}
                </span>
              )}

              <div className="composerActions">
                <button
                  className="secondaryButton"
                  onClick={
                    generateReply
                  }
                  disabled={
                    generating ||
                    sending
                  }
                >
                  {generating ? (
                    <RefreshCw
                      className="spin"
                      size={16}
                    />
                  ) : (
                    <Sparkles
                      size={16}
                    />
                  )}

                  {generating
                    ? "Se genereaza..."
                    : "Genereaza cu AI"}
                </button>

                <button
                  className="secondaryButton"
                  onClick={
                    createTicket
                  }
                  disabled={
                    creatingTicket
                  }
                >
                  {creatingTicket ? (
                    <RefreshCw
                      className="spin"
                      size={16}
                    />
                  ) : (
                    <TicketPlus
                      size={16}
                    />
                  )}

                  {creatingTicket
                    ? "Se creeaza..."
                    : "Creeaza tichet"}
                </button>

                <button
                  className="primaryButton"
                  onClick={sendReply}
                  disabled={
                    !reply.trim() ||
                    sending
                  }
                >
                  {sending ? (
                    <RefreshCw
                      className="spin"
                      size={16}
                    />
                  ) : (
                    <Send
                      size={16}
                    />
                  )}

                  {sending
                    ? "Se trimite..."
                    : "Trimite"}
                </button>
              </div>
            </div>
          </section>

          <aside className="analysisPanel">
            <div className="analysisHeader">
              <p className="eyebrow">
                AI ANALYSIS
              </p>

              <button
                className="iconButton"
                onClick={
                  reanalyzeConversation
                }
                disabled={
                  reanalyzing
                }
                title="Reanalizeaza conversatia"
              >
                <RotateCcw
                  className={
                    reanalyzing
                      ? "spin"
                      : ""
                  }
                  size={15}
                />
              </button>
            </div>

            <div className="analysisBlock">
              <span>
                Intentie
              </span>

              <strong>
                {translateIntent(
                  selected.intent
                )}
              </strong>
            </div>

            <div className="analysisBlock">
              <span>
                Sentiment
              </span>

              <strong>
                {translateSentiment(
                  selected.sentiment
                )}
              </strong>
            </div>

            <div className="analysisBlock">
              <span>
                Prioritate
              </span>

              <strong>
                {translatePriority(
                  selected.priority
                )}
              </strong>
            </div>

            <div className="analysisBlock">
              <span>
                Incredere
              </span>

              <strong>
                {
                  selected.confidence
                }
                %
              </strong>

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
              <span>
                Mod AI
              </span>

              <strong
                className={
                  responseMode ===
                  "auto"
                    ? "autoModeValue"
                    : "draftModeValue"
                }
              >
                {responseMode ===
                "auto"
                  ? "AUTO REPLY"
                  : "DRAFT"}
              </strong>
            </div>

            <div className="analysisBlock">
              <span>
                Sursa date
              </span>

              <strong className="connectedValue">
                <Database
                  size={13}
                />

                PostgreSQL
              </strong>
            </div>

            <div className="analysisBlock">
              <span>
                Sursa raspuns
              </span>

              {replySource ? (
                <strong className="ragSource">
                  <FileText
                    size={13}
                  />

                  {replySource}
                </strong>
              ) : (
                <strong className="mutedValue">
                  Nicio sursa selectata
                </strong>
              )}
            </div>

            <div className="analysisBlock">
              <span>
                Raspunsuri trimise
              </span>

              <strong>
                {replies.length}
              </strong>
            </div>

            <div className="analysisBlock">
              <span>
                Decizie
              </span>

              <strong
                className={
                  responseMode ===
                  "auto"
                    ? "autoModeValue"
                    : "draftStatus"
                }
              >
                {responseMode ===
                "auto"
                  ? "AUTOMAT"
                  : "DRAFT"}
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
                <p className="eyebrow">
                  NOU
                </p>

                <h3>
                  Creeaza conversatie
                </h3>
              </div>

              <button
                className="iconButton"
                onClick={() => {
                  setShowNewConversation(
                    false
                  );
                  setConversationFieldErrors({});
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="formGroup">
              <label>
                Nume client
              </label>

              <input
                value={
                  newConversation.name
                }
                maxLength={100}
                onChange={(event) => {
                  setNewConversation({
                    ...newConversation,
                    name:
                      event.target.value,
                  });

                  if (conversationFieldErrors.name) {
                    setConversationFieldErrors(
                      (current) => ({
                        ...current,
                        name: undefined,
                      })
                    );
                  }
                }}
                placeholder="Exemplu: Alex Popescu"
              />

              {conversationFieldErrors.name && (
                <span
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#f87171",
                    fontSize: "11px",
                  }}
                >
                  {conversationFieldErrors.name}
                </span>
              )}
            </div>

            <div className="formGroup">
              <label>
                Subiect
              </label>

              <input
                value={
                  newConversation.subject
                }
                maxLength={200}
                onChange={(event) => {
                  setNewConversation({
                    ...newConversation,
                    subject:
                      event.target.value,
                  });

                  if (conversationFieldErrors.subject) {
                    setConversationFieldErrors(
                      (current) => ({
                        ...current,
                        subject: undefined,
                      })
                    );
                  }
                }}
                placeholder="Exemplu: Problema livrare"
              />

              {conversationFieldErrors.subject && (
                <span
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#f87171",
                    fontSize: "11px",
                  }}
                >
                  {conversationFieldErrors.subject}
                </span>
              )}
            </div>

            <div className="formGroup">
              <label>
                Mesaj
              </label>

              <textarea
                value={
                  newConversation.message
                }
                maxLength={5000}
                onChange={(event) => {
                  setNewConversation({
                    ...newConversation,
                    message:
                      event.target.value,
                  });

                  if (conversationFieldErrors.message) {
                    setConversationFieldErrors(
                      (current) => ({
                        ...current,
                        message: undefined,
                      })
                    );
                  }
                }}
                placeholder="Scrie mesajul clientului..."
              />

              {conversationFieldErrors.message && (
                <span
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#f87171",
                    fontSize: "11px",
                  }}
                >
                  {conversationFieldErrors.message}
                </span>
              )}
            </div>

            <div className="modalActions">
              <button
                className="secondaryButton"
                onClick={() => {
                  setShowNewConversation(
                    false
                  );
                  setConversationFieldErrors({});
                }}
              >
                Anuleaza
              </button>

              <button
                className="primaryButton"
                onClick={
                  createConversation
                }
                disabled={
                  creating ||
                  !isNewConversationValid
                }
              >
                {creating
                  ? "Se creeaza..."
                  : "Creeaza conversatia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Inbox;