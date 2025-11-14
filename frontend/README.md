# 🔥 Extreme High-Fidelity Glassmorphism Security Dashboard

A stunning, performant Single-Page Application (SPA) dashboard for security analytics built with React, TypeScript, Tailwind CSS, Recharts, and Framer Motion.

## Features

- **Glassmorphism 3.0 Design**: Transparent cards with backdrop blur effects and neon cyan accents
- **Interactive Charts**: Risk timeline, anomaly distribution, and radar charts using Recharts
- **Smooth Animations**: Zero-jank transitions powered by Framer Motion
- **User Management**: Detailed user profiles with risk analysis and activity logs
- **Responsive Design**: Fully responsive layout that works on all screen sizes

## Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Recharts** for data visualizations
- **Framer Motion** for animations
- **Vite** for build tooling

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   └── FloatingNav.tsx
│   └── UI/
│       ├── GlassCard.tsx
│       └── ActionButton.tsx
├── views/
│   ├── Dashboard.tsx
│   ├── Users/
│   │   ├── UserDetails.tsx
│   │   └── UserProfileDrilldown.tsx
│   ├── Events.tsx
│   └── Settings.tsx
├── data/
│   └── mockData.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Design Highlights

- **Dark Theme**: Deep gray-900 background
- **Neon Accents**: Vibrant cyan/electric blue for highlights
- **Glassmorphism**: Transparent cards with backdrop-filter blur
- **Performance**: All components memoized for optimal rendering

