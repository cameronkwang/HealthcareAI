import React, { useState } from 'react';
import { ChartBarIcon, ShieldCheckIcon, UsersIcon, BoltIcon } from '@heroicons/react/24/outline';
import ProjectionDashboard from './dashboard/ProjectionDashboard';
import { motion, AnimatePresence } from 'framer-motion';
const MotionDiv: any = motion.div;

// @ts-ignore
const panelVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
  transition: { duration: 0.5, ease: 'easeOut' },
};

function Quadrant({ Icon, color, title, description, subtext }: { Icon: any, color: string, title: string, description: string, subtext?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center p-4 sm:p-6 lg:p-8">
      <Icon className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mb-3 sm:mb-4 lg:mb-6 ${color}`} />
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-primary mb-2 sm:mb-3">{title}</h2>
      <p className="text-sm sm:text-base lg:text-lg text-gray-700 max-w-sm lg:max-w-md mb-1 sm:mb-2">{description}</p>
      {subtext && <p className="text-xs sm:text-sm lg:text-base text-gray-500 max-w-sm lg:max-w-md">{subtext}</p>}
    </div>
  );
}

const LandingQuadrants: React.FC = () => {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500">
      <AnimatePresence>
        {!showDashboard && (
          <div className="w-full min-h-screen grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 lg:grid-rows-2 gap-3 sm:gap-4 lg:gap-6 p-3 sm:p-6 lg:p-12">
            <MotionDiv
              className="rounded-xl sm:rounded-2xl shadow-lg border border-white/20 bg-white/30 backdrop-blur-md flex flex-col items-center justify-center transition-transform duration-300 hover:scale-105 min-h-[200px] sm:min-h-[250px] lg:min-h-auto"
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Quadrant
                Icon={ChartBarIcon}
                color="text-blue-600"
                title="Real Results"
                description="See how RenewalAI transformed a 500-life group's renewal process for Aetna—cutting analysis time from days to minutes."
                subtext="From small businesses to Fortune 500s, RenewalAI powers smarter renewals."
              />
            </MotionDiv>
            <MotionDiv
              className="rounded-xl sm:rounded-2xl shadow-lg border border-white/20 bg-white/30 backdrop-blur-md flex flex-col items-center justify-center transition-transform duration-300 hover:scale-105 min-h-[200px] sm:min-h-[250px] lg:min-h-auto"
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Quadrant
                Icon={ShieldCheckIcon}
                color="text-green-600"
                title="Security & Compliance"
                description="Your data is protected with industry-leading security and compliance standards."
                subtext="HIPAA, SOC2, and more—so you can focus on your business."
              />
            </MotionDiv>
            <MotionDiv
              className="rounded-xl sm:rounded-2xl shadow-lg border border-white/20 bg-white/30 backdrop-blur-md flex flex-col items-center justify-center transition-transform duration-300 hover:scale-105 min-h-[200px] sm:min-h-[250px] lg:min-h-auto"
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Quadrant
                Icon={UsersIcon}
                color="text-purple-600"
                title="Collaboration"
                description="Empower your team with real-time insights and seamless workflow integration."
                subtext="Work together, wherever you are."
              />
            </MotionDiv>
            <MotionDiv
              className="rounded-xl sm:rounded-2xl shadow-lg border border-white/20 bg-white/30 backdrop-blur-md flex flex-col items-center justify-center transition-transform duration-300 hover:scale-105 min-h-[200px] sm:min-h-[250px] lg:min-h-auto"
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Quadrant
                Icon={BoltIcon}
                color="text-yellow-500"
                title="Automation"
                description="Automate repetitive tasks and accelerate your renewal process."
                subtext="Spend less time on admin, more on strategy."
              />
            </MotionDiv>
            {/* Central Get Started Button - Positioned differently on mobile */}
            <button
              className="sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 bg-primary text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full shadow-lg text-lg sm:text-xl font-bold hover:scale-105 transition mx-auto mt-4 sm:mt-0 col-span-1 sm:col-span-2 lg:col-span-1 w-fit"
              onClick={() => setShowDashboard(true)}
              aria-label="Get Started with RenewalAI"
            >
              Get Started with RenewalAI
            </button>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDashboard && (
          <MotionDiv
            key="dashboard"
            className="absolute inset-0 bg-white z-40"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
          >
            <ProjectionDashboard />
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingQuadrants; 