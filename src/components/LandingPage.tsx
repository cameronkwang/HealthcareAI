import React, { useState, useEffect } from 'react';
import LandingQuadrants from './LandingQuadrants';
// import Navbar from './Navbar';
// import HeroSection from './HeroSection';
// import FeaturesSection from './FeaturesSection';
// import StatsSection from './StatsSection';
// import ProcessSection from './ProcessSection';
// import PortfolioSection from './PortfolioSection';
// import TestimonialsSection from './TestimonialsSection';
// import CTASection from './CTASection';
import SkeletonLoader from './common/SkeletonLoader';

const LandingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  if (loading) return <SkeletonLoader />;
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-blue-100 flex flex-col items-center">
      {/* InsightAI Logo */}
      <img
        src={require('../logo.svg').default}
        alt="InsightAI Logo"
        className="w-32 mt-8 mb-6"
        style={{ maxWidth: '140px', height: 'auto' }}
      />
      {/* <Navbar /> */}
      <LandingQuadrants />
      {/* <TestimonialsSection /> */}
    </div>
  );
};

export default LandingPage; 