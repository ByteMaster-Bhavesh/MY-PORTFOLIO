# 🚀 Bhavesh Sanjay Somwanshi — Personal Portfolio

> **AI-Powered Full Stack Developer | AI & Data Engineering Enthusiast | AWS Cloud**  
> *Building Scalable AI-Driven Web Applications using MERN and AI Technologies.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Portfolio Status](https://img.shields.io/badge/System-Online-34d399.svg)](http://localhost:8080)
[![Tech Stack](https://img.shields.io/badge/Stack-MERN%20%2B%20AI%20%2B%20AWS-6366f1.svg)](#-technology-stack)

---

## 📌 Overview

This repository contains the production-ready personal portfolio website of **Bhavesh Sanjay Somwanshi**, a Computer Engineering student and AI-Powered Full Stack Developer based in Nashik, Maharashtra, India.

The project is structured according to modern industry standards for high-performance static web applications, featuring clean semantic HTML5, a dual-theme design system (Obsidian Dark & Clean Editorial Light), WebGL-powered interactive visual effects, and modular client-side JavaScript.

---

## 🗂️ Industry-Standard Folder Structure

```text
MY PORTFOLIO/
├── assets/                     # Static production assets
│   ├── css/
│   │   └── styles.css          # Design system, themes, typography & responsive layouts
│   ├── js/
│   │   ├── script.js           # Theme toggle, 3D tilt, skills filter, terminal stream, form actions
│   │   └── splash-cursor.js    # Interactive WebGL fluid simulation for the BhaveX interactive canvas
│   ├── images/
│   │   ├── bhavesh-avatar.png  # High-resolution avatar asset
│   │   ├── bhavesh-cutout.png  # Transparent hero section cutout
│   │   └── bhavesh-photo-new.jpg # Profile photo reference
│   └── icons/
│       └── favicon.svg         # SVG favicon with gradient vector styling
├── scripts/                    # Development, build, and maintenance scripts
│   ├── build_splash.py         # WebGL shader compiler and bundler for splash-cursor
│   └── verify_assets.py        # Automated integrity verification for local asset references
├── index.html                  # Semantic, SEO-optimized HTML5 entry point
├── package.json                # Project metadata, NPM run scripts & configuration
├── .gitignore                  # Industry-standard git ignore patterns
└── README.md                   # Comprehensive project documentation
```

### 📁 Directory Breakdown

- **`index.html`**: Entry point structured with semantic HTML5 elements (`header`, `main`, `section`, `footer`), OpenGraph/Twitter social meta tags, and accessibility attributes.
- **`assets/css/styles.css`**: Design system tokens and styles utilizing CSS custom properties (`:root`, `[data-theme="dark"]`, `[data-theme="light"]`) for dynamic zero-latency theme switching.
- **`assets/js/script.js`**: Core client-side interactions:
  - Theme switching with `localStorage` persistence and OS preference detection.
  - 3D card perspective tilt effects.
  - Interactive skill category filtering without page reload.
  - Simulated real-time terminal output telemetry stream.
  - Contact form validation and clipboard copy utilities.
- **`assets/js/splash-cursor.js`**: Lightweight custom WebGL Navier-Stokes fluid dynamics simulation for interactive splash cursor effects.
- **`assets/images/`**: Optimized imagery, cutouts, and profile assets.
- **`assets/icons/`**: Vector icons, SVG symbols, and favicon assets.
- **`scripts/`**: Automation tooling separated from production client-side bundles:
  - `build_splash.py`: Pre-processes GLSL shaders into client-ready bundle.
  - `verify_assets.py`: Validates that all asset paths in HTML exist locally.

---

## ⚡ Key Features

- 🌓 **Dynamic Dual Theme**:
  - **Obsidian Dark**: Neutral midnight palette (`#0a0b10`) eliminating eye fatigue.
  - **Editorial Light**: Crisp porcelain/ivory background (`#f8fafc`) with subtle frosted borders.
  - Real-time animated theme switcher with state persistence.
- 🌊 **BhaveX Fluid Canvas**: Interactive WebGL fluid splash cursor effect responding in real-time to pointer movement.
- 🎯 **Interactive Skills Matrix**: Filter by *Front-End, Back-End, Database, Programming, AI & Data, Cloud & Tools*.
- 🖥️ **Live Terminal Simulator**: Active telemetry stream demonstrating MERN and AI pipeline synthesis.
- 📋 **Quick Contact Utilities**: Single-click clipboard copy for email and phone, plus responsive contact form with `mailto:` integration.
- 📱 **Mobile-First Responsive Design**: Fluid layouts across mobile, tablet, laptop, and ultra-wide desktop viewports.

---

## 🛠️ Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Markup & Semantics** | HTML5, Semantic Elements, Schema.org metadata |
| **Styling & Themes** | Vanilla CSS3, CSS Custom Properties, Glassmorphism, CSS Grid/Flexbox |
| **Logic & Interactions** | Vanilla JavaScript (ES6+), WebGL (GLSL Shaders), IntersectionObserver |
| **Typography** | Google Fonts (`Space Grotesk`, `Outfit`, `JetBrains Mono`) |
| **Icons** | Font Awesome 6, Vector SVGs |

---

## 💻 Local Development

You can run this project locally using any static web server:

### Option 1: Python Built-in Server (Recommended)
```bash
# Navigate to project directory
cd "d:\Project\MY PORTFOLIO"

# Start local server on port 8080
python -m http.server 8080
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### Option 2: NPM Scripts
```bash
# Start server
npm start
# or
npm run dev

# Run asset integrity check
npm run verify
```

---

## 🚀 Deployment Guide

This portfolio can be deployed in minutes to any modern hosting platform:

### 1. GitHub Pages
1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Industry-standard portfolio"
   git branch -M main
   git remote add origin https://github.com/ByteMaster-Bhavesh/<repo-name>.git
   git push -u origin main
   ```
2. Navigate to **Settings > Pages > Branch: `main` > `/ (root)` > Save**.

### 2. Vercel / Netlify
- Connect your GitHub repository to Vercel or Netlify.
- Framework Preset: **Other / Static**.
- Root directory: `./`
- Click **Deploy**.

---

## 👤 About the Author

**Bhavesh Sanjay Somwanshi**  
- **Degree**: Bachelor of Engineering (Computer Engineering), JES-ITMR Nashik *(Class of 2028)*
- **Email**: [somwanshibhavesh71@gmail.com](mailto:somwanshibhavesh71@gmail.com)
- **Phone**: +91 7887574836
- **LinkedIn**: [linkedin.com/in/bhavesh-somwanshi-533352328](https://www.linkedin.com/in/bhavesh-somwanshi-533352328)
- **GitHub**: [github.com/ByteMaster-Bhavesh](https://github.com/ByteMaster-Bhavesh)
- **Location**: Nashik, Maharashtra, India

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Copyright &copy; 2026 Bhavesh Sanjay Somwanshi. All Rights Reserved.
