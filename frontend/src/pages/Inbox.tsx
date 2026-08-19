import { useState } from "react";
import { Send, Sparkles, TicketPlus } from "lucide-react";

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

const conversations: Conversation[] = [
  {
    id: 1,
    name: "Maria Popescu",
    subject: "Retur comanda",
    message:
      "Buna! Am cumparat produsul acum 10 zile, dar nu mi se potriveste. Il mai pot returna?",
    intent: "Return request",
    priority: "Medium",
    sentiment: "Neutral",
    confidence: 94,
  },
  {
    id: 2,
    name: "Andrei Ionescu",
    subject: "Interesat de Premium",
    message:
      "Salut! Sunt interesat de pachetul Premium pentru firma mea. Care este pretul si ce include?",
    intent: "Purchase intent",
    priority: "High",
    sentiment: "Positive",
    confidence: 91,
  },
  {
    id: 3,
    name: "Elena Matei",
    subject: "Comanda intarziata",
    message:
      "Comanda mea trebuia sa ajunga ieri si inca nu am primit nimic. Ma puteti ajuta?",
    intent: "Order status",
    priority: "High",
    sentiment: "Negative",
    confidence: 97,
  },
];

function Inbox() {
  const [selected, setSelected] = useState<Conversation>(
    conversations[0]
  );

  const [reply, setReply] = useState("");

  const generateDemoReply = () => {
    if (selected.intent === "Return request") {
      setReply(
        "Buna, Maria! Sigur. Conform politicii noastre de retur, produsele eligibile pot fi returnate in termen de 30 de zile de la achizitie."
      );
      return;
    }

    if (selected.intent === "Purchase intent") {
      setReply(
        "Buna, Andrei! Multumim pentru interes. Pachetul Premium include functionalitatile noastre avansate si suport prioritar. Iti pot oferi mai multe detalii despre oferta."
      );
      return;
    }

    setReply(
      "Buna, Elena! Imi pare rau pentru intarziere. Pot verifica situatia comenzii si te pot ajuta cu urmatorii pasi."
    );
  };

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">CUSTOMER SUPPORT</p>
          <h2>Inbox</h2>
          <p className="subtitle">
            Conversatii, clasificare si raspunsuri asistate de AI.
          </p>
        </div>

        <div className="inboxOnline">
          <span className="statusDot" />
          AI Online
        </div>
      </header>

      <div className="inboxLayout">
        <section className="conversationList">
          <div className="conversationListHeader">
            <strong>Conversatii</strong>
            <span>{conversations.length}</span>
          </div>

          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`conversationItem ${
                selected.id === conversation.id ? "selected" : ""
              }`}
              onClick={() => {
                setSelected(conversation);
                setReply("");
              }}
            >
              <div className="avatar">
                {conversation.name.charAt(0)}
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
              {selected.name.charAt(0)}
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
              onChange={(event) => setReply(event.target.value)}
              placeholder="Scrie un raspuns sau genereaza unul cu MIXORA..."
            />

            <div className="composerActions">
              <button
                className="secondaryButton"
                onClick={generateDemoReply}
              >
                <Sparkles size={16} />
                Generate AI
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
          <p className="eyebrow">AI ANALYSIS</p>

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

            <div className="confidenceRow">
              <strong>{selected.confidence}%</strong>
            </div>

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
            <span>Knowledge source</span>
            <strong className="mutedValue">
              Not connected
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
    </>
  );
}

export default Inbox;