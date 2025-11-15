import React, { useCallback } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import type { Engine } from 'tsparticles-engine';

/**
 * AmbientParticles
 * Subtle, dark-gray particles for a light theme background.
 * Uses tsparticles-slim (lighter subset of tsparticles) for performance.
 */
const AmbientParticles: React.FC = () => {
  const particlesInit = useCallback(async (engine: Engine) => {
    // Load the slim bundle for a small, performant particle set
    await loadSlim(engine);
  }, []);

  const options = {
    // Allow the particles canvas to be full-screen and fixed to the viewport
    // This avoids stacking issues where the canvas is clipped by parent elements
    fullScreen: { enable: true, zIndex: -1 },
    particles: {
      color: { value: ['#4a4a4a', '#6b6b6b', '#333333', '#00f0ff'] },
      move: {
        enable: true,
        // make particles move at a subtle steady pace; random is false
        speed: 0.5,
        random: false,
        // pick a gentle sweeping direction so the particles appear coordinated
        direction: 'bottom',
        straight: false,
        outModes: { default: 'out' },
      },
      // increase count for a richer background (50% increase from 120 -> 180)
      number: {
        value: 259,
        density: { enable: true, area: 1600 },
      },
      // synchronize size and opacity animations to create a coordinated pulse
      size: {
        value: { min: 0.8, max: 2.5 },
        animation: { enable: true, speed: 1.2, minimumValue: 0.5, sync: true },
      },
      opacity: {
        value: 0.85,
        animation: { enable: true, speed: 0.8, minimumValue: 0.25, sync: true },
      },
      links: {
        enable: true,
        distance: 120,
        color: '#666666',
        opacity: 0.3,
        width: 1,
      },
      collisions: { enable: false },
    },
    interactivity: {
      detectsOn: 'canvas',
      events: {
        onHover: { enable: false },
        onClick: { enable: false },
        resize: true,
      },
    },
    detectRetina: true,
  } as const;

  // When using fullScreen.enable the canvas is appended to the document and
  // already fills the viewport. We still render a container for semantic
  // reasons, but we don't need to position it.
  return (
    <div aria-hidden="true">
      <Particles id="ambient-particles" init={particlesInit} options={options} />
    </div>
  );
};

export default AmbientParticles;
