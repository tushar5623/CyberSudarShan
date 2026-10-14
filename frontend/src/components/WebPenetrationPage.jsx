import React from 'react';
import { ShieldCheck, Target, ScanFace, FileText, CalendarDays, Hourglass, Zap } from 'lucide-react';

const WebPenetrationPage = () => {
  // Service Packages Data
  const packages = [
    {
      type: "Basic package",
      name: "Basic Security Scan",
      icon: <ScanFace className="w-10 h-10 text-orange-400" />,
      // Price Presentation from reference
      pricePrefix: "Starting at",
      price: "₹2500/-",
      priceSuffix: "Per Scan / Per App",
      themeColor: "text-orange-400",
      borderColor: "hover:border-orange-500/50",
      glowColor: "hover:shadow-[0_0_30px_rgba(251,146,60,0.15)]",
      // Professional Expanded Services
      services: [
        "Fully Automated Vulnerability Scanning (DAST/SAST)",
        "Identification of Common Misconfigurations (CORS, Headers)",
        "Check for Insecure TLS/SSL Settings",
        "Passive OSINT Fingerprinting",
        "Industry-Standard Executive Summary Report",
        "High-Level Remediation Roadmap"
      ],
      delivery: "2 Working Days",
      duration: "1-Week Total Engagement",
      reportCount: "1 Detailed Report"
    },
    {
      type: "Standard package",
      name: "Web Application Security Audit",
      icon: <ShieldCheck className="w-10 h-10 text-yellow-500" />,
      pricePrefix: "Comprehensive Audit",
      price: "8000/-",
      priceSuffix: "Per Application Audit",
      themeColor: "text-yellow-500",
      borderColor: "hover:border-yellow-500/50",
      glowColor: "hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]",
      // Professional Expanded Services (Expert Manual Focus)
      services: [
        "Expert Manual Penetration Testing & Analysis",
        "Deep Assessment based on OWASP Top 10 Framework",
        "Advanced Authentication & Authorization Testing",
        "Logic Flaw & Privilege Escalation Checks",
        "Comprehensive In-Depth Security Audit Report",
        "Detailed Proof-of-Concept for Critical Flaws",
        "Priority Support for Remediation (1 Month)"
      ],
      delivery: "5 Working Days",
      duration: "1-Month Total Engagement",
      reportCount: "4 Weekly Reports (inc. Re-testing)"
    }
  ];

  return (
    // 🔥 MOBILE FIX: Top padding 'pt-24 md:pt-32' to clear the fixed navbar
    <section className="bg-slate-950 py-16 px-4 pt-24 md:pt-32 min-h-screen relative overflow-hidden text-white">
      
      {/* Container to center everything */}
      <div className="max-w-7xl mx-auto relative z-10 px-2 md:px-6">
        
        {/* === PAGE HEADER === */}
        <div className="text-center mb-16" data-aos="fade-down">
          <div className="bg-slate-900 border border-yellow-500/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
            <Target className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Advanced <span className="text-yellow-500 underline decoration-4 decoration-yellow-600 underline-offset-8">Web Penetration Testing</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
            Secure your web applications against modern cyber threats. Our proactive defense strategy identifies critical vulnerabilities before attackers can exploit them.
          </p>
        </div>

        {/* === PRICING GRID (2 Professional Boxes) === */}
        {/* We use max-w-5xl to keep the 2 boxes centered on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
          {packages.map((pkg, index) => (
            // Card Structure
            <div 
              key={index} 
              data-aos="fade-up" 
              data-aos-delay={index * 200}
              className={`bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-slate-800 flex flex-col transition-all duration-300 ${pkg.borderColor} ${pkg.glowColor} group`}
            >
              {/* Card Header */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
                <div className="bg-slate-800 p-3 rounded-lg">
                  {pkg.icon}
                </div>
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-slate-800 border ${pkg.borderColor} ${pkg.themeColor}`}>
                    {pkg.type}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold mt-2 pr-6 leading-tight text-white">{pkg.name}</h3>
                </div>
              </div>

              {/* Price Presentation from reference image */}
              <div className="text-center mb-8 p-6 bg-slate-950/80 rounded-xl border border-slate-800">
                <p className="text-slate-400 text-sm mb-1">{pkg.pricePrefix}</p>
                <div className="flex items-center justify-center gap-1.5">
                  {/* Currency Symbol from reference */}
                  <span className={`text-2xl font-semibold -mt-3 ${pkg.themeColor}`}>₹</span>
                  {/* Big bold Price */}
                  <h2 className={`text-4xl md:text-5xl font-extrabold tracking-tighter ${pkg.themeColor}`}>{pkg.price.replace('₹','').replace('/-','')}</h2>
                  {/* Suffix like Per Month from reference */}
                  <span className={`text-2xl font-semibold -mt-3 ${pkg.themeColor}`}>/-</span>
                </div>
                <p className="text-slate-500 text-xs mt-1.5">{pkg.priceSuffix}</p>
              </div>

              {/* Professional Services List */}
              <div className="flex-grow">
                <h4 className="text-white font-semibold mb-4 text-sm md:text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" /> Key Features Included:
                </h4>
                <ul className="space-y-3 mb-8">
                  {pkg.services.map((service, sIndex) => (
                    <li key={sIndex} className="flex items-start gap-2.5 text-slate-300 text-xs md:text-sm">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0 mt-1.5"></span>
                      {service}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Timelines & Deliverables (from your list) */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 mt-auto space-y-3 mb-6">
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <CalendarDays className="w-4 h-4 text-yellow-500 flex-shrink-0" /> Delivery: <span className="font-medium text-slate-100">{pkg.delivery}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <Hourglass className="w-4 h-4 text-yellow-500 flex-shrink-0" /> Project Duration: <span className="font-medium text-slate-100">{pkg.duration}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <FileText className="w-4 h-4 text-yellow-500 flex-shrink-0" /> Deliverable: <span className="font-medium text-slate-100">{pkg.reportCount}</span>
                </div>
              </div>

              {/* Call to Action Button */}
              <button 
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-extrabold py-3 md:py-3.5 rounded-lg transition-all cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] group-hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                Secure Your App Now
              </button>

            </div>
          ))}
        </div>

        {/* Decorative Particles can still work in the background globally */}
      </div>

      {/* Decorative Gradient Fade on Bottom */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-slate-950 to-transparent z-20"></div>

    </section>
  );
};

export default WebPenetrationPage;