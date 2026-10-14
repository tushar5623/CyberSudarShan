import React from 'react';
import { ShieldAlert, BrainCircuit, Users, BookOpenCheck, HeartHandshake, Rocket } from 'lucide-react';

const AboutPage = () => {
  // Purane team members ka data
  const teamMembers = [
    { name: "Yatendra Dixit", role: "Founder & CEO", image: "https://ui-avatars.com/api/?name=Yatendra+Dixit&background=eab308&color=fff" },
    { name: "Gajendra Singh", role: "Co-Founder & Director", image: "https://ui-avatars.com/api/?name=Gajendra+Singh&background=f59e0b&color=fff" },
    { name: "Shailendra Singh Dhakad", role: "CTO", image: "https://ui-avatars.com/api/?name=Shailendra+Singh&background=d97706&color=fff" }
  ];

  return (
    <div className="bg-slate-950 min-h-screen pt-24 md:pt-32 pb-16 overflow-hidden relative text-white">
      
      {/* Background Glows */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 relative z-10">
        
        {/* ========================================= */}
        {/* 1. HERO SECTION (Brand Identity) */}
        {/* ========================================= */}
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-24" data-aos="fade-down">
          <div className="inline-flex items-center justify-center p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl mb-6 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
            <ShieldAlert className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Defending the <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">Digital Frontier</span>
          </h1>
          <div className="space-y-4 text-slate-300 text-sm md:text-lg leading-relaxed">
            <p>
              <strong className="text-white">Cyber-Sudarshan</strong> represents protection, knowledge, and collaboration in the digital world. The name symbolizes strength and defense against cyber threats, inspired by the idea of powerful protection safeguarding the digital ecosystem.
            </p>
            <p>
              Our brand identity reflects our commitment to building a trusted cybersecurity community that focuses on awareness, ethical practices, and digital safety. We aim to unite cybersecurity professionals, ethical hackers, developers, analysts, and learners to collectively strengthen cyber defense.
            </p>
            <p>
              We believe that cybersecurity is not only about technology but also about <span className="text-yellow-400 font-semibold">responsibility, education, and collaboration.</span> Our brand stands for trust, innovation, and the shared mission of defending cyberspace.
            </p>
          </div>
        </div>

        {/* ========================================= */}
        {/* 2. THE MIND BEHIND (Vision & Mission) */}
        {/* ========================================= */}
        <div className="mb-16 md:mb-24" data-aos="fade-up">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-6 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-yellow-500/30 transition-colors duration-500">
            {/* Decorative Icon Background */}
            <BrainCircuit className="absolute -right-10 -bottom-10 w-64 h-64 text-slate-800/30 group-hover:text-yellow-500/5 transition-colors duration-700 pointer-events-none" />
            
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-6 flex items-center gap-3">
              <BrainCircuit className="text-yellow-500 w-8 h-8" /> The Mind Behind Cyber-Sudarshan
            </h2>
            
            <div className="space-y-4 text-slate-400 text-sm md:text-base leading-relaxed relative z-10">
              <p>
                Cyber-Sudarshan was founded with a vision to create a safer digital world. In an era where cyber threats are increasing rapidly and millions of people are becoming victims of online crimes, the founders recognized the need for a platform that not only promotes cybersecurity awareness but also builds a strong community.
              </p>
              <p>
                The idea is to bridge the gap between cybersecurity professionals and individuals who need protection and guidance. By bringing together experts, learners, and organizations on a single platform, we aim to create a collaborative ecosystem where knowledge is shared, cyber threats are analyzed, and digital safety becomes accessible to everyone.
              </p>
              <p className="text-slate-300 font-medium border-l-4 border-yellow-500 pl-4 py-1 my-4 bg-slate-800/30 rounded-r-lg">
                "The founders believe that cybersecurity is not just a technical field—it is a responsibility toward society."
              </p>
              <p>
                Cyber-Sudarshan is more than just a platform; it is a mission to strengthen digital security and build a global community dedicated to protecting the future of the internet.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* 3. WHY CHOOSE US (Differentiators) */}
        {/* ========================================= */}
        <div className="mb-16 md:mb-24">
          <div className="text-center mb-10 md:mb-12" data-aos="fade-down">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Why <span className="text-yellow-500">Cyber-Sudarshan?</span></h2>
            <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto">
              In today’s digital era, despite the growing risks, many people lack awareness and access to trusted communities. Here is what makes us different.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
            
            {/* Card 1 */}
            <div className="bg-slate-900/50 p-6 md:p-8 rounded-2xl border border-slate-800 hover:border-yellow-500/50 hover:-translate-y-2 transition-all duration-300 group shadow-lg hover:shadow-[0_10px_30px_rgba(234,179,8,0.1)]" data-aos="fade-up" data-aos-delay="0">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-5 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                <Users className="text-blue-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Community-Driven</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                A growing network of cybersecurity professionals, researchers, and learners collaborating to share knowledge and strengthen digital security.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900/50 p-6 md:p-8 rounded-2xl border border-slate-800 hover:border-yellow-500/50 hover:-translate-y-2 transition-all duration-300 group shadow-lg hover:shadow-[0_10px_30px_rgba(234,179,8,0.1)]" data-aos="fade-up" data-aos-delay="100">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-5 border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
                <BookOpenCheck className="text-orange-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Cyber Awareness & Education</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Promoting cyber safety through webinars, workshops, and educational resources to help individuals and organizations understand modern cyber threats.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900/50 p-6 md:p-8 rounded-2xl border border-slate-800 hover:border-yellow-500/50 hover:-translate-y-2 transition-all duration-300 group shadow-lg hover:shadow-[0_10px_30px_rgba(234,179,8,0.1)]" data-aos="fade-up" data-aos-delay="200">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-5 border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
                <HeartHandshake className="text-red-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Support for Cybercrime Victims</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Guiding individuals who have been affected by cybercrime and helping them understand the proper steps to report and respond to such incidents.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-900/50 p-6 md:p-8 rounded-2xl border border-slate-800 hover:border-yellow-500/50 hover:-translate-y-2 transition-all duration-300 group shadow-lg hover:shadow-[0_10px_30px_rgba(234,179,8,0.1)]" data-aos="fade-up" data-aos-delay="300">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-5 border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                <Rocket className="text-green-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Mentorship & Skill Development</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Encouraging the next generation of cybersecurity professionals through mentorship programs and hands-on learning opportunities.
              </p>
            </div>

          </div>
        </div>

        {/* ========================================= */}
        {/* 4. THE TEAM (Bonus: Merged from old component) */}
        {/* ========================================= */}
        <div className="pt-10 border-t border-slate-800/50" data-aos="fade-up">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">Meet the <span className="text-yellow-500">Leadership</span></h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
            {teamMembers.map((member, index) => (
              <div 
                key={index} 
                className="bg-slate-900/30 p-5 md:p-6 rounded-2xl border border-slate-800/50 hover:border-yellow-500/30 transition-all duration-300 text-center group"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 rounded-full p-1 bg-gradient-to-r from-yellow-400 to-amber-600 group-hover:shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all">
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="w-full h-full rounded-full object-cover border-4 border-[#020617]" 
                  />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-1">{member.name}</h3>
                <p className="text-yellow-400 font-medium tracking-wide uppercase text-xs">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AboutPage;