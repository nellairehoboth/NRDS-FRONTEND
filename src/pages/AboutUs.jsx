import React, { useRef } from 'react';
import './AboutUs.css';
import { useNavigate } from 'react-router-dom';
import profileImg from '../assets/profile.jpeg';
import { motion, useScroll, useTransform } from 'framer-motion';

const AboutUs = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // --- Hero Parallax ---
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 200]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.1]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);


  const features = [
    { icon: "🥦", title: "Fresh Products", desc: "Farm-fresh vegetables and fruits sourced directly from verified local growers." },
    { icon: "🚚", title: "Fast Delivery", desc: "Get your groceries delivered to your doorstep in record time." },
    { icon: "🏷️", title: "Best Prices", desc: "Quality shouldn't cost a fortune. Competitive prices daily." },
    { icon: "🤝", title: "Trusted Quality", desc: "Strict quality checks ensuring only the best for your family." }
  ];

  const values = [
    { title: "Quality", desc: "Uncompromised freshness in every bite." },
    { title: "Hygiene", desc: "Safety standards that exceed expectations." },
    { title: "Service", desc: "Customer satisfaction is our north star." },
    { title: "Eco-Friendly", desc: "Committed to a greener, cleaner planet." }
  ];

  const steps = [
    { num: "01", title: "Choose", desc: "Browse our fresh catalog." },
    { num: "02", title: "Order", desc: "Secure & fast checkout." },
    { num: "03", title: "Receive", desc: "Doorstep delivery." }
  ];

  return (
    <div className="about-page" ref={containerRef}>

      {/* 1. HERO SECTION */}
      <header className="cinematic-hero">
        <motion.div
          className="hero-bg"
          style={{ y: heroY, scale: heroScale }}
        />
        <div className="hero-overlay"></div>
        <motion.div
          className="hero-content"
          style={{ opacity: heroOpacity }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        >
          <div className="hero-glass-box">
            <motion.h1
              style={{ color: "white" }}
              initial={{ opacity: 0, letterSpacing: "10px" }}
              animate={{ opacity: 1, letterSpacing: "2px" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              ABOUT US
            </motion.h1>
            <motion.p
              style={{ color: "white" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              Redefining Freshness. Delivering Trust.
            </motion.p>
          </div>
        </motion.div>
      </header>

      <div className="content-wrapper">

        {/* 2. OUR STORY (Professional Clean Layout) */}
        <section className="section story-clean-section">
          <div className="story-clean-container">
            <div className="story-clean-inner">
              <motion.div
                className="story-clean-image-side"
                initial={{ x: -100, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <div className="clean-image-frame">
                  <img src={profileImg} alt="Our Founders" className="story-clean-img" />
                </div>
              </motion.div>

              <div className="story-clean-text-side">
                <div className="clean-tag">SINCE 1995</div>
                <h2 className="clean-title">Our Story</h2>

                <div className="clean-description">
                  <div className="reveal-item">
                    <CharacterReveal>
                      Nellai Rehoboth Department Store began with a vision.
                    </CharacterReveal>
                  </div>
                  <div className="reveal-item">
                    <CharacterReveal delay={0.4}>
                      To bring the farm's freshness directly to your table.
                    </CharacterReveal>
                  </div>
                  <div className="reveal-item">
                    <CharacterReveal delay={0.8}>
                      What started as a humble shop is now a community pillar.
                    </CharacterReveal>
                  </div>
                  <div className="reveal-item">
                    <CharacterReveal delay={1.2}>
                      We don't just sell groceries; we deliver care, quality, and a promise of excellence.
                    </CharacterReveal>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. MISSION & VISION (Cards) */}
        <section className="section mv-section">
          <div className="mv-grid">
            <Card
              title="Our Mission"
              icon="🎯"
              desc="To enable every household to access premium quality groceries at prices that make sense."
            />
            <Card
              title="Our Vision"
              icon="🔭"
              desc="To become the most trusted name in home essentials, bridging the gap between farmers and families."
              delay={0.2}
            />
          </div>
        </section>

        {/* 4. WHY CHOOSE US (Staggered Reveal Layout) */}
        <section className="section features-grid-section">
          <div className="section-header-reveal">
            <CharacterReveal>
              Why Choose Us
            </CharacterReveal>
          </div>
          <div className="features-container">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="feature-cinematic-card"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -10, rotate: i % 2 === 0 ? 1 : -1 }}
              >
                <div className="f-icon">{f.icon}</div>
                <div className="feature-title-reveal">
                  <CharacterReveal delay={i * 0.1}>
                    {f.title}
                  </CharacterReveal>
                </div>
                <div className="feature-desc-reveal">
                  <CharacterReveal delay={i * 0.1 + 0.2}>
                    {f.desc}
                  </CharacterReveal>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 5. HOW WE WORK (Step Stagger) */}
        <section className="section steps-section">
          <div className="section-header-reveal">
            <CharacterReveal>
              How It Works
            </CharacterReveal>
          </div>
          <div className="steps-container">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                className="step-card"
                initial={{ y: 100, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: false, margin: "-50px" }}
                transition={{ duration: 0.8, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="step-num">{step.num}</div>
                <div className="step-title-reveal">
                  <CharacterReveal delay={i * 0.1}>
                    {step.title}
                  </CharacterReveal>
                </div>
                <div className="step-desc-reveal">
                  <CharacterReveal delay={i * 0.1 + 0.2}>
                    {step.desc}
                  </CharacterReveal>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 6. VALUES (Depth & Blur-to-Clear) */}
        <section className="section values-section">
          <div className="values-content">
            <div className="section-header-reveal">
              <CharacterReveal>
                Our Core Values
              </CharacterReveal>
            </div>
            <div className="values-grid">
              {values.map((v, i) => (
                <motion.div
                  key={i}
                  className="value-item"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false }}
                  transition={{ duration: 0.8, delay: i * 0.2 }}
                >
                  <div className="value-title-reveal">
                    <CharacterReveal delay={i * 0.1}>
                      {v.title}
                    </CharacterReveal>
                  </div>
                  <div className="value-desc-reveal">
                    <CharacterReveal delay={i * 0.1 + 0.2}>
                      {v.desc}
                    </CharacterReveal>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. CTA */}
        <section className="section cta-section">
          <motion.div
            className="cta-content"
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8 }}
          >
            <div className="cta-title-reveal">
              <CharacterReveal>
                Start Your Fresh Journey
              </CharacterReveal>
            </div>
            <div className="cta-desc-reveal">
              <CharacterReveal delay={0.5}>
                Join the thousands who trust us everyday.
              </CharacterReveal>
            </div>
            <motion.button
              className="cta-btn"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/products')}
            >
              Shop Now
            </motion.button>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

// Cinematic Character-by-Character Reveal
const CharacterReveal = ({ children, delay = 0 }) => {
  const text = typeof children === "string" ? children : "";
  if (!text) return <>{children}</>;

  const characters = text.split("");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.015,
        delayChildren: delay,
      }
    }
  };

  const childVariants = {
    hidden: {
      opacity: 0,
      y: 10,
      filter: "blur(4px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.6, // Slightly faster for snappiness
        ease: "easeOut", // Standard easeOut is often more performant than custom beziers for blur
      }
    }
  };

  return (
    <motion.div
      className="character-reveal-container"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.1 }} // Changed to once: false to allow replaying on scroll back
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center"
      }}
    >
      {characters.map((char, index) => (
        <motion.span
          key={index}
          variants={childVariants}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            fontFamily: "inherit"
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.div>
  );
};

const Card = ({ title, icon, desc, delay = 0 }) => {
  return (
    <motion.div
      className="mv-card"
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.8, delay }}
      whileHover={{ y: -10 }}
    >
      <div className="mv-icon">{icon}</div>
      <div className="card-title-reveal">
        <CharacterReveal delay={delay + 0.3}>
          {title}
        </CharacterReveal>
      </div>
      <div className="card-desc-reveal">
        <CharacterReveal delay={delay + 0.6}>
          {desc}
        </CharacterReveal>
      </div>
    </motion.div>
  );
};

export default AboutUs;
