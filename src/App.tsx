import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ProjectionDashboard from './components/dashboard/ProjectionDashboard';

const App: React.FC = () => (
  <Router basename="/HealthcareAI">
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<ProjectionDashboard />} />
    </Routes>
  </Router>
);

export default App;
