import { apiRequest } from '../lib/api';
import React, { useState } from 'react';

const ContactFooter = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiRequest('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },  
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        alert("Message Sent Successfully via Node.js! 🚀");
        setFormData({ name: '', email: '', message: '' });
      } else {
        alert("Server Error! Message not sent.");
      }

    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong. Is the server running?");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="relative z-10">
      
      {/* === CONTACT SECTION === */}
      {/* 🔥 MOBILE FIX: Top/bottom padding mobile pe 'py-12', desktop pe 'md:py-20' aur side padding 'px-4 md:px-6' */}
      <section id="contact" className="py-12 md:py-20 px-4 md:px-6 max-w-6xl mx-auto">
        
        {/* 🔥 MOBILE FIX: Gap mobile par 'gap-8', desktop par 'gap-12' */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          
          {/* Left Side: Contact Info */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 md:mb-6">
              Get in <span className="text-yellow-500">Touch</span>
            </h2>
            <p className="text-slate-400 text-sm md:text-lg mb-6 md:mb-8 max-w-md mx-auto md:mx-0">
              Have a question or want to organize a cyber awareness workshop?
              Fill out the form and we will get back to you within 24 hours.
            </p>
            
            <div className="space-y-3 md:space-y-4 inline-block text-left">
              <div className="flex items-center gap-3 md:gap-4 text-slate-300 text-sm md:text-base">
                <span className="bg-slate-900/80 backdrop-blur-sm p-2.5 md:p-3 rounded-lg text-yellow-500">📧</span>
                <span> cybersudarshan.in@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 md:gap-4 text-slate-300 text-sm md:text-base">
                <span className="bg-slate-900/80 backdrop-blur-sm p-2.5 md:p-3 rounded-lg text-yellow-500">📞</span>
                <div className="flex flex-col">
                  <span>+91 89232 05311</span>
                  <span>+91 89557 62932</span>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4 text-slate-300 text-sm md:text-base">
                <span className="bg-slate-900/80 backdrop-blur-sm p-2.5 md:p-3 rounded-lg text-yellow-500">📍</span>
                <span>New Delhi, India</span>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          {/* 🔥 MOBILE FIX: Card padding 'p-6 md:p-8' */}
          <form onSubmit={handleSubmit} className="bg-slate-900/50 p-6 md:p-8 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-[0_0_30px_rgba(234,179,8,0.05)] hover:border-yellow-500/30 transition-all">
            
            <div className="space-y-4 md:space-y-6">
              
              {/* Name Input */}
              <div>
                <label className="text-slate-400 text-xs md:text-sm mb-1.5 md:mb-2 block">Your Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe" 
                  required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3.5 md:px-4 py-2.5 md:py-3 text-sm md:text-base text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors placeholder-slate-600 backdrop-blur-md"
                />
              </div>

              {/* Email Input */}
              <div>
                <label className="text-slate-400 text-xs md:text-sm mb-1.5 md:mb-2 block">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com" 
                  required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3.5 md:px-4 py-2.5 md:py-3 text-sm md:text-base text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors placeholder-slate-600 backdrop-blur-md"
                />
              </div>

              {/* Message Input */}
              <div>
                <label className="text-slate-400 text-xs md:text-sm mb-1.5 md:mb-2 block">Message</label>
                <textarea 
                  rows="4" 
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="How can we help you?" 
                  required
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3.5 md:px-4 py-2.5 md:py-3 text-sm md:text-base text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors placeholder-slate-600 resize-none backdrop-blur-md"
                ></textarea>
              </div>

              {/* Submit Button */}
              {/* 🔥 MOBILE FIX: Button padding thodi adjust ki */}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-extrabold py-3 md:py-3.5 rounded-lg transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] disabled:opacity-50 text-sm md:text-base cursor-pointer"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>

            </div>
          </form>

        </div>
      </section>

      {/* === FOOTER === */}
      {/* 🔥 MOBILE FIX: Py-6 instead of py-8 for a tighter footer on mobile */}
      <footer className="border-t border-slate-800/50 bg-slate-950/30 backdrop-blur-md py-6 md:py-8 text-center mt-6 md:mt-10">
        <p className="text-slate-500 text-xs md:text-sm">
          © 2026 <span className="text-yellow-500 font-semibold">Cyber Sudarshan</span>. All Rights Reserved.
        </p>
        <p className="text-slate-600 text-[10px] md:text-xs mt-1.5 md:mt-2">
          Designed for a Secure Digital India 🇮🇳
        </p>
      </footer>

    </div>
  );
};

export default ContactFooter;