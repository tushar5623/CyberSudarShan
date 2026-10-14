import React, { useState } from 'react';

const PasswordChecker = () => {
  const [password, setPassword] = useState('');
  
  const checkStrength = (pass) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length > 7) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const score = checkStrength(password);

  const getStrengthDetails = () => {
    switch (score) {
      case 0: return { label: 'Very Weak ❌', color: 'bg-red-600', width: 'w-1/4', textColor: 'text-red-500' };
      case 1: return { label: 'Weak ⚠️', color: 'bg-orange-500', width: 'w-2/4', textColor: 'text-orange-500' };
      case 2: return { label: 'Moderate 🟡', color: 'bg-yellow-400', width: 'w-3/4', textColor: 'text-yellow-400' };
      case 3: return { label: 'Strong ✅', color: 'bg-green-500', width: 'w-full', textColor: 'text-green-500' };
      case 4: return { label: 'Unbreakable 🛡️', color: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]', width: 'w-full', textColor: 'text-yellow-400' };
      default: return { label: '', color: 'bg-transparent', width: 'w-0', textColor: '' };
    }
  };

  const details = getStrengthDetails();

  return (
    // 🔥 MOBILE FIX: py-8 ko py-10 kiya mobile ke liye aur md:py-16 laptop ke liye
    <div className="bg-slate-950 py-10 md:py-16 px-4">
      
      {/* 🔥 MOBILE FIX: Card padding p-5 for mobile, p-8 for desktop */}
      <div className="max-w-3xl mx-auto bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 md:p-8 border border-slate-700/50 shadow-[0_0_30px_rgba(234,179,8,0.1)] transition-all hover:shadow-[0_0_40px_rgba(234,179,8,0.2)]">
        
        <div className="text-center mb-6 md:mb-8">
          <div className="flex justify-center items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <span className="text-3xl md:text-4xl">🔐</span>
            {/* 🔥 MOBILE FIX: Heading size text-2xl on mobile */}
            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Password <span className="text-yellow-500">Checker</span></h2>
          </div>
          <p className="text-slate-400 text-sm md:text-lg px-2">Test the strength of your password against cyber threats.</p>
        </div>

        <div className="max-w-md mx-auto relative">
          <input
            type="text"
            placeholder="Type your password here..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // 🔥 MOBILE FIX: Input padding aur text size adjust kiya
            className="w-full p-3.5 md:p-4 bg-slate-950/80 text-white border border-slate-600/50 rounded-xl focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder-slate-500 font-mono text-sm md:text-lg"
          />
          
          {password && (
            <div className="mt-5 md:mt-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-full bg-slate-800 h-2.5 md:h-3 rounded-full overflow-hidden">
                <div className={`h-full ${details.color} transition-all duration-500 ease-in-out ${details.width}`}></div>
              </div>
              <div className="flex justify-between items-center mt-3 text-xs md:text-sm">
                <span className="text-slate-400 font-medium text-sm md:text-base">Strength Level:</span>
                <span className={`font-bold tracking-wide text-base md:text-lg ${details.textColor}`}>{details.label}</span>
              </div>
              
              {score < 4 && (
                // 🔥 MOBILE FIX: Suggestions box ki padding thodi kam ki
                <div className="mt-5 md:mt-6 p-4 md:p-5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs md:text-sm text-slate-400">
                  <p className="font-semibold text-slate-300 mb-2">💡 How to make it Unbreakable:</p>
                  <ul className="list-disc pl-5 space-y-1 md:space-y-1.5">
                    {password.length <= 7 && <li>Use at least 8 characters.</li>}
                    {!/[A-Z]/.test(password) && <li>Add at least one uppercase letter (A-Z).</li>}
                    {!/[0-9]/.test(password) && <li>Include at least one number (0-9).</li>}
                    {!/[^A-Za-z0-9]/.test(password) && <li>Add a special character (like @, #, $, !).</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordChecker;