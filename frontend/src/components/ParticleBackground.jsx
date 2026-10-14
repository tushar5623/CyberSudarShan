import React, { useEffect, useState, useMemo } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const ParticleBackground = () => {
  const [init, setInit] = useState(false);
  
  // 🔥 MOBILE FIX 1: Screen size check karne ke liye state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check screen size on mount and resize
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // 768px se kam matlab Mobile
    };
    
    handleResize(); // Pehli baar run karo
    window.addEventListener("resize", handleResize);

    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const options = useMemo(
    () => ({
      background: {
        color: {
          value: "#020617", 
        },
      },
      // 🔥 MOBILE FIX 2: Mobile pe 60fps taaki battery bache, Desktop pe 120fps
      fpsLimit: isMobile ? 60 : 120,
      
      interactivity: {
        // 🔥 BONUS FIX: Ye zaroori hai agar canvas pe 'pointer-events-none' laga ho, tabhi hover kaam karega!
        detectsOn: "window", 
        events: {
          onHover: {
            // 🔥 MOBILE FIX 3: Mobile pe hover band kar do (kyunki wahan mouse nahi hota)
            enable: !isMobile, 
            mode: "grab", 
          },
        },
        modes: {
          grab: {
            distance: 200,
            links: {
              opacity: 1,
              color: "#eab308" 
            }
          },
        },
      },
      particles: {
        color: {
          value: "#eab308", 
        },
        links: {
          color: "#eab308", 
          distance: 150,
          enable: true,
          opacity: 0.3, 
          width: 1,
        },
        move: {
          enable: true,
          speed: 1.5, 
        },
        number: {
          density: {
            enable: true,
          },
          // 🔥 MOBILE FIX 4: Mobile ki choti screen pe sirf 40 dots, Desktop pe 100 dots
          value: isMobile ? 40 : 100, 
        },
        opacity: {
          value: 0.5,
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 1, max: 3 },
        },
      },
      detectRetina: true,
    }),
    [isMobile] // Jab bhi isMobile change hoga, particles update honge
  );

  if (init) {
    return (
      <Particles
        id="tsparticles"
        options={options}
        // pointer-events-none rakha hai taaki website ke buttons block na hon
        className="fixed inset-0 z-[-1] h-full w-full pointer-events-none" 
      />
    );
  }

  return null;
};

export default ParticleBackground;