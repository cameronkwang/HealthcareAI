import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
const MotionNav: any = motion.nav;
const MotionDiv: any = motion.div;
const MotionSpan: any = motion.span;

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Stats', href: '#stats' },
  { label: 'Process', href: '#process' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Contact', href: '#cta' },
];

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('Home');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      const offset = 120; // Adjust for navbar height
      let currentSection = navItems[0].label;
      for (const item of navItems) {
        const section = document.querySelector(item.href);
        if (section) {
          const top = section.getBoundingClientRect().top + window.scrollY - offset;
          if (window.scrollY >= top) {
            currentSection = item.label;
          }
        }
      }
      setActive(currentSection);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Set on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <MotionNav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-md' : 'bg-transparent'} border-b border-transparent`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <MotionDiv
          className="font-extrabold text-2xl text-primary cursor-pointer select-none"
          animate={{ scale: scrolled ? 0.85 : 1 }}
          transition={{ duration: 0.3 }}
        >
          RenewalAI
        </MotionDiv>
        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 items-center">
          {navItems.map(item => (
            <a
              key={item.label}
              href={item.href}
              className={`relative font-medium text-lg px-2 py-1 transition-colors duration-200 ${active === item.label ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
            >
              {item.label}
              {active === item.label && (
                <MotionSpan
                  layoutId="nav-underline"
                  className="absolute left-0 -bottom-1 w-full h-0.5 bg-primary rounded"
                />
              )}
            </a>
          ))}
        </div>
        {/* Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 group"
          aria-label="Open menu"
          onClick={() => setMenuOpen(m => !m)}
        >
          <span className={`block w-7 h-0.5 bg-primary transition-transform duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-7 h-0.5 bg-primary transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-7 h-0.5 bg-primary transition-transform duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>
      {/* Mobile Menu */}
      {menuOpen && (
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white/95 backdrop-blur-md shadow-lg px-6 py-4 flex flex-col gap-4 border-t border-gray-100"
        >
          {navItems.map(item => (
            <a
              key={item.label}
              href={item.href}
              className={`font-medium text-lg px-2 py-1 transition-colors duration-200 ${active === item.label ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </MotionDiv>
      )}
    </MotionNav>
  );
};

export default Navbar; 