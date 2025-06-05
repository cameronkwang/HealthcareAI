import React from 'react';
import { motion } from 'framer-motion';
const MotionDiv: any = motion.div;
const MotionH2: any = motion.h2;
const MotionP: any = motion.p;

const CTASection: React.FC = () => (
  <section id="cta" className="py-24 bg-gradient-to-br from-primary/10 to-blue-100/30">
    <div className="max-w-2xl mx-auto px-6 text-center">
      <MotionH2
        className="text-3xl md:text-4xl font-extrabold text-primary mb-4"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7 }}
      >
        Ready to transform your renewal process?
      </MotionH2>
      <MotionP
        className="text-lg text-gray-700 mb-8"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        Join leading brokers, consultants, and HR teams using RenewalAI to automate, standardize, and impress. Get started in minutes.
      </MotionP>
      <MotionDiv
        whileHover={{ scale: 1.07, boxShadow: "0 8px 32px rgba(37,99,235,0.18)" }}
        whileTap={{ scale: 0.97 }}
        className="inline-block"
      >
        <a
          href="#"
          className="inline-block px-10 py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300"
        >
          Request a Demo
        </a>
      </MotionDiv>
    </div>
  </section>
);

export default CTASection; 