import { NavLink, Route, Routes } from "react-router-dom";
import {
  Bot,
  BookOpen,
  Inbox,
  LayoutDashboard,
  Settings,
  TicketCheck,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import InboxPage from "./pages/Inbox";
import Tickets from "./pages/Tickets";
import Knowledge from "./pages/Knowledge";

import "./App.css";

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logoIcon">
            <Bot size={22} />
          </div>

          <div>
            <h1>MIXORA</h1>
            <span>Operatiuni AI pentru clienti</span>
          </div>
        </div>

        <nav className="navigation">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `navItem ${isActive ? "active" : ""}`
            }
          >
            <LayoutDashboard size={19} />
            Dashboard
          </NavLink>

          <NavLink
            to="/inbox"
            className={({ isActive }) =>
              `navItem ${isActive ? "active" : ""}`
            }
          >
            <Inbox size={19} />
            Inbox
          </NavLink>

          <NavLink
            to="/tickets"
            className={({ isActive }) =>
              `navItem ${isActive ? "active" : ""}`
            }
          >
            <TicketCheck size={19} />
            Tickets
          </NavLink>

          <NavLink
            to="/knowledge"
            className={({ isActive }) =>
              `navItem ${isActive ? "active" : ""}`
            }
          >
            <BookOpen size={19} />
            Knowledge Base
          </NavLink>
        </nav>

        <div className="sidebarBottom">
          <button className="navItem">
            <Settings size={19} />
            Settings
          </button>

          <div className="systemStatus">
            <span className="statusDot" />
            MIXORA activ
          </div>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/knowledge" element={<Knowledge />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;