import React from 'react';

const VisionMission = () => {
  return (
    // 🔥 MOBILE FIX: Top/bottom padding mobile pe 'py-12', desktop pe 'md:py-20' aur side padding 'px-4 md:px-6'
    <section className="w-full py-12 md:py-20 px-4 md:px-6 relative overflow-hidden">
      
      {/* Background Lights */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] right-[10%] w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-yellow-600/20 rounded-full blur-[80px] md:blur-[100px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-amber-600/20 rounded-full blur-[80px] md:blur-[100px]"></div>
      </div>

      {/* 🔥 MOBILE FIX: Gap mobile par 'gap-6', desktop par 'gap-10' */}
      <div className="max-w-6xl mx-auto relative z-10 grid md:grid-cols-2 gap-6 md:gap-10">

        {/* === VISION CARD (Left se aayega) === */}
        {/* 🔥 MOBILE FIX: Card padding 'p-6 md:p-8' */}
        <div data-aos="fade-right" className="group p-6 md:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:border-yellow-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:-translate-y-2">
          
          {/* 🔥 MOBILE FIX: Icon box thoda chhota kiya */}
          <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-500/10 rounded-lg flex items-center justify-center text-2xl md:text-3xl mb-5 md:mb-6 group-hover:bg-yellow-500/20 transition">👁️</div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Our <span className="text-yellow-400">Vision</span></h2>
          
          <p className="text-sm md:text-base text-slate-400 leading-relaxed">
            Our vision is to create India’s most trusted <span className="text-white font-medium">youth-driven cyber awareness ecosystem</span> that educates, empowers, and protects people from evolving cyber crimes through knowledge, technology, and community action.
          </p>
        </div>

        {/* === MISSION CARD (Right se aayega) === */}
        <div data-aos="fade-left" data-aos-delay="200" className="group p-6 md:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:border-amber-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:-translate-y-2">
          
          {/* 🔥 MOBILE FIX: Icon box thoda chhota kiya */}
          <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500/10 rounded-lg flex items-center justify-center text-2xl md:text-3xl mb-5 md:mb-6 group-hover:bg-amber-500/20 transition">🎯</div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Our <span className="text-amber-400">Mission</span></h2>
          
          <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-4">
            Our mission is to spread cyber awareness at the grassroots level by conducting seminars, workshops, and awareness campaigns.
          </p>
          
          {/* 🔥 MOBILE FIX: List items ke font size aur spacing ko adjust kiya */}
          <ul className="space-y-2.5 md:space-y-2 text-sm md:text-base text-slate-400">
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5 md:mt-1 font-bold">✓</span> Educate about cyber crimes & scams.</li>
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5 md:mt-1 font-bold">✓</span> Promote responsible digital behavior.</li>
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5 md:mt-1 font-bold">✓</span> Collaborate with experts & law enforcement.</li>
          </ul>
        </div>

      </div>
    </section>
  );
};

export default VisionMission;