import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Protected from './components/Protected.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Mesh from './pages/Mesh.jsx';
import Donors from './pages/Donors.jsx';
import Sos from './pages/Sos.jsx';
import Requests from './pages/Requests.jsx';
import RequestDetail from './pages/RequestDetail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Camps from './pages/Camps.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/mesh"
            element={
              <Protected>
                <Mesh />
              </Protected>
            }
          />
          <Route
            path="/donors"
            element={
              <Protected>
                <Donors />
              </Protected>
            }
          />
          <Route
            path="/sos"
            element={
              <Protected>
                <Sos />
              </Protected>
            }
          />
          <Route
            path="/requests"
            element={
              <Protected>
                <Requests />
              </Protected>
            }
          />
          <Route
            path="/requests/:id"
            element={
              <Protected>
                <RequestDetail />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <Profile />
              </Protected>
            }
          />
          <Route
            path="/camps"
            element={
              <Protected>
                <Camps />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
