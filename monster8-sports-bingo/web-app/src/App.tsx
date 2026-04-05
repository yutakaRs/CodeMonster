import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import SportsPage from "./pages/sports/SportsPage";
import EventDetailPage from "./pages/sports/EventDetailPage";
import DrawHallPage from "./pages/bingo/DrawHallPage";
import BetPage from "./pages/bingo/BetPage";
import BetHistoryPage from "./pages/bingo/BetHistoryPage";
import DrawHistoryPage from "./pages/bingo/DrawHistoryPage";
import WalletPage from "./pages/bingo/WalletPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import OAuthCallbackPage from "./pages/auth/OAuthCallbackPage";
import ProfilePage from "./pages/auth/ProfilePage";
import Navbar from "./components/Navbar";
import { ProtectedRoute, GuestRoute } from "./components/RouteGuards";

const env = import.meta.env.VITE_ENV;

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-4xl font-bold text-[#faf5f0]">Monster #8</h1>
      <p className="text-[#a89890]">Sports Data API + Bingo Bingo</p>
      <div className="flex gap-4 mt-8">
        <Link to="/sports" className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-500 hover:to-orange-500 font-bold">Sports Data</Link>
        <Link to="/bingo" className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-xl hover:from-amber-400 hover:to-orange-400 font-bold">Bingo Bingo</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {env === "staging" && (
          <div className="bg-amber-500 text-black text-center text-sm py-1 font-semibold">STAGING</div>
        )}
        <Navbar />
        <main className="flex-1 min-h-screen bg-[#1a1412] text-[#faf5f0]">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/sports" element={<SportsPage />} />
            <Route path="/sports/events/:eventId" element={<EventDetailPage />} />
            <Route path="/bingo" element={<DrawHallPage />} />
            <Route path="/bingo/draws" element={<DrawHistoryPage />} />
            <Route path="/bingo/bet" element={<ProtectedRoute><BetPage /></ProtectedRoute>} />
            <Route path="/bingo/history" element={<ProtectedRoute><BetHistoryPage /></ProtectedRoute>} />
            <Route path="/bingo/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}
