import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  Bot,
  BookOpen,
  Inbox,
  LayoutDashboard,
  LogOut,
  Settings as SettingsIcon,
  TicketCheck,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import Dashboard from "./pages/Dashboard";
import InboxPage from "./pages/Inbox";
import Tickets from "./pages/Tickets";
import Knowledge from "./pages/Knowledge";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

import "./App.css";

type AuthMeResponse = {
  username: string;
  operator_name: string;
};

function App() {
  const navigate = useNavigate();

  const [authenticated, setAuthenticated] =
    useState(
      () =>
        Boolean(
          localStorage.getItem(
            "mixora_access_token"
          )
        )
    );

  const [checkingSession, setCheckingSession] =
    useState(
      () =>
        Boolean(
          localStorage.getItem(
            "mixora_access_token"
          )
        )
    );

  const [operatorName, setOperatorName] =
    useState(
      () =>
        localStorage.getItem(
          "mixora_operator"
        ) ?? "Operator"
    );

  useEffect(() => {
    const verifySession = async () => {
      const token =
        localStorage.getItem(
          "mixora_access_token"
        );

      if (!token) {
        setAuthenticated(false);
        setCheckingSession(false);
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:8000/api/auth/me"
        );

        if (!response.ok) {
          throw new Error(
            "Sesiunea nu este valida."
          );
        }

        const data: AuthMeResponse =
          await response.json();

        localStorage.setItem(
          "mixora_operator",
          data.operator_name
        );

        localStorage.setItem(
          "mixora_session",
          "authenticated"
        );

        setOperatorName(
          data.operator_name
        );

        setAuthenticated(true);
      } catch (err) {
        console.error(err);

        localStorage.removeItem(
          "mixora_access_token"
        );

        localStorage.removeItem(
          "mixora_session"
        );

        localStorage.removeItem(
          "mixora_operator"
        );

        setAuthenticated(false);
      } finally {
        setCheckingSession(false);
      }
    };

    verifySession();
  }, []);

  const handleLogin = () => {
    setAuthenticated(true);

    setOperatorName(
      localStorage.getItem(
        "mixora_operator"
      ) ?? "Operator"
    );

    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem(
      "mixora_access_token"
    );

    localStorage.removeItem(
      "mixora_session"
    );

    localStorage.removeItem(
      "mixora_operator"
    );

    setAuthenticated(false);
    setOperatorName("Operator");

    navigate("/login");
  };

  if (checkingSession) {
    return (
      <div className="pageState">
        <span>
          Se verifica sesiunea...
        </span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <Login
              onLogin={handleLogin}
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />
      </Routes>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logoIcon">
            <Bot size={22} />
          </div>

          <div>
            <h1>
              MIXORA
            </h1>

            <span>
              Operatiuni AI pentru clienti
            </span>
          </div>
        </div>

        <nav className="navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `navItem ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            <LayoutDashboard
              size={19}
            />

            Dashboard
          </NavLink>

          <NavLink
            to="/inbox"
            className={({ isActive }) =>
              `navItem ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            <Inbox size={19} />

            Inbox
          </NavLink>

          <NavLink
            to="/tickets"
            className={({ isActive }) =>
              `navItem ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            <TicketCheck
              size={19}
            />

            Tickets
          </NavLink>

          <NavLink
            to="/knowledge"
            className={({ isActive }) =>
              `navItem ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            <BookOpen size={19} />

            Knowledge Base
          </NavLink>
        </nav>

        <div className="sidebarBottom">
          <div className="operatorCard">
            <div className="operatorAvatar">
              <UserRound
                size={15}
              />
            </div>

            <div>
              <span>
                OPERATOR
              </span>

              <strong>
                {operatorName}
              </strong>
            </div>
          </div>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `navItem ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            <SettingsIcon
              size={19}
            />

            Settings
          </NavLink>

          <button
            className="navItem logoutButton"
            onClick={
              handleLogout
            }
          >
            <LogOut size={19} />

            Deconectare
          </button>

          <div className="systemStatus">
            <span className="statusDot" />

            MIXORA activ
          </div>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard />
            }
          />

          <Route
            path="/inbox"
            element={
              <InboxPage />
            }
          />

          <Route
            path="/tickets"
            element={
              <Tickets />
            }
          />

          <Route
            path="/knowledge"
            element={
              <Knowledge />
            }
          />

          <Route
            path="/settings"
            element={
              <Settings />
            }
          />

          <Route
            path="/login"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;