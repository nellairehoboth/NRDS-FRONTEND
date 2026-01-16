import React from "react";
import "./AboutUs.css";
import profileImg from "../assets/profile.jpeg";

const AboutUs = () => {
  return (
    <div className="about-page">
      <div className="about-container">
        <div className="about-card">
          {/* Header */}
          <div className="about-header">
            <h1>About Us</h1>
            <p>Your trusted destination for quality products</p>
          </div>

          {/* Hero Section */}
          <div className="about-hero">
            <div className="about-hero-media">
              <img
                className="about-hero-image"
                src={profileImg}
                alt="Owner - Nellai Rehoboth Department Store"
                loading="lazy"
              />
            </div>

            <div className="about-hero-text">
              <p className="about-hero-subtitle">
                Nellai Rehoboth Department Store is built on trust, quality,
                and customer satisfaction. We proudly serve our community with
                dedication and honesty.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="about-content">
            <section className="about-section">
              <h2>Store Information</h2>
              <p><strong>Store Name:</strong> Nellai Rehoboth Department Store</p>
              <p><strong>Phone:</strong> +91 99420 75849</p>
              <p><strong>Email:</strong> nellairehoboth@gmail.com</p>
              <p>
                <strong>Experience:</strong> Successfully running for more than{" "}
                <strong>20+ years</strong>
              </p>
            </section>

            <section className="about-section">
              <h2>About Our Products</h2>
              <p>
                We offer a wide range of groceries including fresh fruits,
                vegetables, daily essentials, and branded products. Every item
                is carefully selected to meet quality standards.
              </p>
            </section>

            <section className="about-section">
              <h2>Affordable Pricing</h2>
              <p>
                Our pricing is fair and competitive. We focus on delivering
                maximum value with transparent rates and regular offers.
              </p>
            </section>

            <section className="about-section">
              <h2>Quality & Trust</h2>
              <p>
                Quality is our promise. All products undergo quality checks,
                ensuring freshness, reliability, and customer satisfaction.
              </p>
            </section>

            <section className="about-section highlight">
              ⭐ Thousands of happy customers trust us for our quality,
              affordability, and friendly service.
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
