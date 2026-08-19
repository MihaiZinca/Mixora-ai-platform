import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  TicketCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

type TicketStatus =
  | "Open"
  | "In Progress"
  | "Resolved";

type Ticket = {
  id: number;
  conversation_id: number;
  customer_name: string;
  title: string;
  summary: string;
  priority: string;
  status: TicketStatus;
  created_at: string;
};

function translatePriority(priority: string) {
  const map: Record<string, string> = {
    High: "Ridicata",
    Medium: "Medie",
    Low: "Scazuta",
  };

  return map[priority] ?? priority;
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    Open: "Deschis",
    "In Progress": "In lucru",
    Resolved: "Rezolvat",
  };

  return map[status] ?? status;
}

function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingTicketId, setUpdatingTicketId] =
    useState<number | null>(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:8000/api/tickets"
      );

      if (!response.ok) {
        throw new Error(
          "Tichetele nu au putut fi incarcate."
        );
      }

      const data: Ticket[] = await response.json();

      setTickets(data);
    } catch (err) {
      console.error(err);

      setError(
        "Nu s-a putut realiza conexiunea cu API-ul MIXORA."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const updateStatus = async (
    ticketId: number,
    status: TicketStatus
  ) => {
    try {
      setUpdatingTicketId(ticketId);
      setError("");

      const response = await fetch(
        `http://localhost:8000/api/tickets/${ticketId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Statusul nu a putut fi actualizat."
        );
      }

      const updatedTicket: Ticket =
        await response.json();

      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket.id === updatedTicket.id
            ? updatedTicket
            : ticket
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        "Statusul tichetului nu a putut fi actualizat."
      );
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "Open"
  ).length;

  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "In Progress"
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) => ticket.status === "Resolved"
  ).length;

  if (loading) {
    return (
      <div className="pageState">
        <RefreshCw className="spin" size={24} />
        <span>Se incarca tichetele...</span>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <div>
          <p className="eyebrow">CUSTOMER SUPPORT</p>
          <h2>Tickets</h2>
          <p className="subtitle">
            Gestioneaza solicitarile clientilor direct din MIXORA.
          </p>
        </div>

        <button
          className="secondaryButton"
          onClick={loadTickets}
        >
          <RefreshCw size={16} />
          Reincarca
        </button>
      </header>

      {error && (
        <div className="knowledgeError">
          {error}
        </div>
      )}

      <section className="stats">
        <div className="statCard">
          <span>Total</span>
          <strong>{tickets.length}</strong>
          <small>Toate tichetele</small>
        </div>

        <div className="statCard">
          <span>Deschise</span>
          <strong>{openTickets}</strong>
          <small>Asteapta procesare</small>
        </div>

        <div className="statCard">
          <span>In lucru</span>
          <strong>{inProgressTickets}</strong>
          <small>Procesate acum</small>
        </div>

        <div className="statCard">
          <span>Rezolvate</span>
          <strong>{resolvedTickets}</strong>
          <small>Finalizate</small>
        </div>
      </section>

      {tickets.length === 0 ? (
        <div className="pageState">
          <TicketCheck size={32} />
          <strong>Nu exista tichete.</strong>
          <span>
            Creeaza primul tichet din Inbox.
          </span>
        </div>
      ) : (
        <div className="ticketsGrid">
          {tickets.map((ticket) => (
            <article
              className="ticketCard"
              key={ticket.id}
            >
              <div className="ticketCardTop">
                <span className="ticketId">
                  TICKET #{ticket.id}
                </span>

                <span
                  className={`ticketPriority priority${ticket.priority}`}
                >
                  {translatePriority(ticket.priority)}
                </span>
              </div>

              <h3>{ticket.title}</h3>

              <span className="ticketCustomer">
                {ticket.customer_name}
              </span>

              <p>{ticket.summary}</p>

              <div className="ticketStatusSection">
                <span className="ticketStatusLabel">
                  Status
                </span>

                <select
                  className="ticketStatusSelect"
                  value={ticket.status}
                  disabled={
                    updatingTicketId === ticket.id
                  }
                  onChange={(event) =>
                    updateStatus(
                      ticket.id,
                      event.target.value as TicketStatus
                    )
                  }
                >
                  <option value="Open">
                    Deschis
                  </option>

                  <option value="In Progress">
                    In lucru
                  </option>

                  <option value="Resolved">
                    Rezolvat
                  </option>
                </select>
              </div>

              <div className="ticketFooter">
                <span>
                  {ticket.status === "Resolved" ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <Clock3 size={13} />
                  )}

                  {translateStatus(ticket.status)}
                </span>

                <span>
                  {new Date(
                    ticket.created_at
                  ).toLocaleString("ro-RO")}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default Tickets;