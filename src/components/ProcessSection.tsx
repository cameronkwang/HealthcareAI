import React from 'react';
import { motion } from 'framer-motion';
const MotionDiv: any = motion.div;

const steps = [
  {
    title: 'Upload Data',
    desc: 'Drag and drop your census and claims files. Our system parses and validates instantly.'
  },
  {
    title: 'Select Carrier',
    desc: 'Choose from Aetna, UHC, Cigna, or BCBS. Get carrier-specific calculations.'
  },
  {
    title: 'Review Projections',
    desc: 'See renewal outcomes, member months, and credibility in real time.'
  },
  {
    title: 'Export & Present',
    desc: 'Download reports or present live with interactive dashboards.'
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.7, ease: 'easeOut' } })
};

const ProcessSection: React.FC = () => (
  <section id="process" className="py-24 bg-gradient-to-br from-primary/10 to-blue-100/30">
    <div className="max-w-6xl mx-auto px-6">
      <h2 className="text-3xl md:text-4xl font-extrabold text-center text-primary mb-4">How It Works</h2>
      <p className="text-center text-lg text-gray-600 mb-12 max-w-2xl mx-auto">Get from raw data to impressive renewal analytics in four simple steps.</p>
      <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative">
        {/* Timeline line */}
        <div className="absolute left-1/2 top-8 bottom-8 w-1 bg-primary/10 rounded-full hidden md:block" style={{ transform: 'translateX(-50%)' }} />
        {steps.map((step, i) => (
          <MotionDiv
            key={step.title}
            className="flex flex-col items-center md:w-1/5 mb-12 md:mb-0 relative"
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={cardVariants}
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary text-2xl font-bold shadow-lg">{i + 1}</div>
            <h3 className="text-lg font-bold mb-2 text-primary-dark text-center">{step.title}</h3>
            <p className="text-gray-600 text-center">{step.desc}</p>
            <div className="absolute left-1/2 -bottom-8 w-4 h-4 bg-primary rounded-full shadow-md hidden md:block" style={{ transform: 'translateX(-50%)' }} />
          </MotionDiv>
        ))}
      </div>
    </div>
  </section>
);

export default ProcessSection; 