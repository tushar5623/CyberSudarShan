import React, { useState, useEffect } from 'react';
import Hero from './hero';
import VisionMission from './VisionMission';
import About from './About';

import ContactFooter from './ContactFooter';
import PasswordChecker from './PasswordChecker';
import EmailBreachChecker from './EmailBreachChecker';
import CyberNews from './CyberNews';

import AOS from 'aos';
import 'aos/dist/aos.css';

const Home = () => {
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyData, setEmergencyData] = useState({ name: '', email: '', mobile: '', problem: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 800, 
      easing: 'ease-in-out', 
      once: false, 
      mirror: true,
      offset: 100, 
    });
  }, []);

  const handleEmergencyChange = (e) => {
    setEmergencyData({ ...emergencyData, [e.target.name]: e.target.value });
  };

  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('https://cyber-sudarshan-backend-1.onrender.com/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emergencyData),
      });

      if (response.ok) {
        alert("Emergency Alert Sent! We will contact you soon. ");
        setShowEmergency(false); 
        setEmergencyData({ name: '', email: '', mobile: '', problem: '' }); 
      } else {
        alert("Error sending alert. Please try again.");
      }
    } catch (error) {
      alert("Network error!");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="overflow-x-hidden">
      <Hero />
      <CyberNews />
      <VisionMission />
      {/* <About /> */}
      

      <div data-aos="fade-up">
        <PasswordChecker />
      </div>
      <div data-aos="fade-up">
        <EmailBreachChecker />
      </div>

      <ContactFooter />

      {/* 🔥 MOBILE FIX: Emergency Button 🔥 */}
      {/* Mobile pe margin kam kiya (bottom-4 right-4), text chhota kiya, aur naam 'SOS' kar diya */}
      <div className="fixed bottom-4 right-4 md:bottom-10 md:right-10 z-50">
        <button 
          onClick={() => setShowEmergency(true)}
          className="animate-pulse bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold md:font-extrabold py-3 px-4 md:py-4 md:px-6 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)] flex items-center gap-2 transition-all duration-300 transform hover:scale-105 cursor-pointer text-sm md:text-base"
        >
          <span className="text-xl md:text-2xl drop-shadow-md">🚨</span> 
          <span className="hidden sm:inline">REPORT EMERGENCY</span>
          <span className="sm:hidden tracking-wider">SOS</span>
        </button>
      </div>

      {/* 🔥 MOBILE FIX: Emergency Popup Form 🔥 */}
      {showEmergency && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-in fade-in duration-200">
          {/* Mobile par padding (p-5) rakhi aur max-height di taaki scroll ho sake agar screen choti ho */}
          <div className="bg-slate-900 border border-red-500/50 p-5 md:p-8 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.2)] w-full max-w-md relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setShowEmergency(false)} className="absolute top-3 right-3 md:top-4 md:right-4 text-slate-500 hover:text-white bg-slate-800 hover:bg-red-500/20 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer">✖</button>
            <div className="text-center mb-4 md:mb-6 mt-2 md:mt-0">
              <h2 className="text-xl md:text-2xl font-bold text-red-500 flex items-center justify-center gap-2">🚨 Cyber Fraud Alert</h2>
              <p className="text-slate-400 text-xs md:text-sm mt-1 md:mt-2">Fill this form for immediate assistance.</p>
            </div>
            <form onSubmit={handleEmergencySubmit} className="flex flex-col gap-3 md:gap-4">
              <input type="text" name="name" placeholder="Enter Name" required value={emergencyData.name} onChange={handleEmergencyChange} className="p-3 md:p-3.5 text-sm md:text-base bg-slate-950/50 text-white border border-slate-700 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-slate-500 backdrop-blur-md"/>
              <input type="email" name="email" placeholder="Email Address" required value={emergencyData.email} onChange={handleEmergencyChange} className="p-3 md:p-3.5 text-sm md:text-base bg-slate-950/50 text-white border border-slate-700 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-slate-500 backdrop-blur-md"/>
              <input type="tel" name="mobile" placeholder="Mobile Number" required value={emergencyData.mobile} onChange={handleEmergencyChange} className="p-3 md:p-3.5 text-sm md:text-base bg-slate-950/50 text-white border border-slate-700 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-slate-500 backdrop-blur-md"/>
              <textarea name="problem" rows="3" placeholder="Briefly describe the fraud..." required value={emergencyData.problem} onChange={handleEmergencyChange} className="p-3 md:p-3.5 text-sm md:text-base bg-slate-950/50 text-white border border-slate-700 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder-slate-500 resize-none backdrop-blur-md"></textarea>
              <button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-extrabold py-3 md:py-3.5 rounded-xl mt-1 md:mt-2 transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] disabled:opacity-50 cursor-pointer text-sm md:text-base">{isSubmitting ? "Sending Alert..." : "Send Emergency Alert"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;