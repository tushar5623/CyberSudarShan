import React from 'react';
import logo from '../assets/logo.png'; 

const Hero = () => {
  return (
    // 🔥 MOBILE FIX 1: 'h-screen' ki jagah 'min-h-[100dvh]' kiya, aur 'pt-24 md:pt-32' (Top Padding) add kiya Navbar ke overlap ke liye
    <section className="relative w-full min-h-[100dvh] flex flex-col justify-center items-center text-center px-4 pt-24 md:pt-32 pb-16 overflow-hidden">
      
      {/* 1. NEW HOLOGRAPHIC LOGO MOTION BACKGROUND 🔥 */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex justify-center items-center overflow-hidden z-0">
        <img 
          src={logo} 
          alt="Cyber Sudarshan Hologram" 
          // 🔥 MOBILE FIX 2: Mobile pe logo ki width thodi kam ki (w-[400px]) taaki screen ke bahar na phaile
          className="absolute w-[400px] md:w-[900px] opacity-[0.05] md:opacity-[0.07] animate-[spin_40s_linear_infinite] blur-[2px]"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-yellow-500/10 rounded-full blur-[80px] md:blur-[100px] animate-pulse"></div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="relative z-10 max-w-4xl space-y-5 md:space-y-6 w-full mt-4 md:mt-0">
        
        {/* Badge (Yellow Alert Style) */}
        <div className="inline-block px-3 md:px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs md:text-sm font-semibold mb-2 animate-pulse backdrop-blur-sm">
          🛡️ Building a Secure Digital India
        </div>

       {/* 🔥 MOBILE FIX 3: Text chhota kiya (text-4xl) aur leading (line-height) tight ki */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] md:leading-tight">
          Securing The <br className="hidden sm:block" />
          {/* Mobile par span ko 'block' banaya taaki ye alag line mein smoothly fit ho */}
          <span className="bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500 animate-gradient-flow bg-clip-text text-transparent block mt-1 md:mt-0 sm:inline">
            Digital World
          </span>
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base md:text-xl text-slate-400 max-w-2xl mx-auto backdrop-blur-sm bg-slate-950/20 p-2 rounded-xl px-4 md:px-0 leading-relaxed">
          Cyber Sudarshan is an initiative to fight cyber crime,
          spread awareness, and empower the youth with knowledge.
        </p>

        {/* 🔥 MOBILE FIX 4: Buttons ko mobile pe 'w-full' aur Desktop pe 'sm:w-auto' kiya */}
        <div className="flex flex-col sm:flex-row gap-4 md:gap-5 justify-center pt-4 md:pt-6 items-center w-full max-w-sm mx-auto sm:max-w-none">
          
          {/* JOIN THE MISSION - Solid Gold Button */}
          <button className="w-full sm:w-auto group flex items-center justify-center gap-2.5 px-8 md:px-10 py-3.5 md:py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_35px_rgba(234,179,8,0.6)] hover:scale-105 active:scale-95 cursor-pointer text-base md:text-lg relative overflow-hidden">
            <span className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-500 opacity-0 group-hover:opacity-20 transition-opacity"></span>
            <span className="relative z-10 text-lg md:text-xl group-hover:scale-110 transition-transform">👤+</span>
            <span className="relative z-10 tracking-wide uppercase text-[13px] md:text-sm">Join the Mission</span>
          </button>
          
          {/* LEARN MORE - Outline Gold Button */}
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-slate-700 text-white hover:border-yellow-500 hover:text-yellow-400 rounded-xl transition-all duration-300 bg-slate-900/30 backdrop-blur-sm cursor-pointer group hover:bg-slate-900/60 text-sm md:text-base">
            Learn More
            <span className="text-slate-500 group-hover:text-yellow-400 group-hover:translate-x-1 transition-transform">→</span>
          </button>
          
        </div>

      </div>

      {/* Decorative Grid Bottom Fade */}
      <div className="absolute bottom-0 w-full h-20 md:h-32 bg-gradient-to-t from-slate-950 to-transparent z-20"></div>

    </section>
  );
};

export default Hero;