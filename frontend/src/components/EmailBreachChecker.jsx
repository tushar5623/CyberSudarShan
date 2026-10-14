import React, { useState } from 'react';

const EmailBreachChecker = () => {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkBreach = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`https://cyber-sudarshan-backend-1.onrender.com/api/breach/${email}`);

      if (response.ok) {
        const data = await response.json();
        if (data.safe) {
            setResult({ safe: true });
        } else {
            setResult({ safe: false, breaches: data.breaches });
        }
      } else {
        setResult({ error: "Backend error! Please try again." });
      }
    } catch (error) {
      setResult({ error: "Network Error! Apna internet check karo." });
    }
    
    setLoading(false);
  };

  return (
    // 🔥 MOBILE FIX: py-16 ko mobile ke liye py-10 kar diya
    <div className="bg-slate-950 py-10 md:py-16 px-4">
      {/* 🔥 MOBILE FIX: Card padding mobile pe p-5, desktop pe p-8 */}
      <div className="max-w-3xl mx-auto bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 md:p-8 border border-slate-700/50 shadow-[0_0_30px_rgba(234,179,8,0.1)] transition-all hover:shadow-[0_0_40px_rgba(234,179,8,0.2)]">
        
        <div className="text-center mb-6 md:mb-8">
          <div className="flex justify-center items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <span className="text-3xl md:text-4xl">📧</span>
            {/* 🔥 MOBILE FIX: Text size text-2xl kiya mobile ke liye */}
            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Data Breach <span className="text-yellow-500">Scanner</span></h2>
          </div>
          <p className="text-slate-400 text-sm md:text-lg px-2">Check if your email address has been compromised in a data breach.</p>
        </div>

        <form onSubmit={checkBreach} className="flex flex-col md:flex-row gap-3 md:gap-4 max-w-2xl mx-auto">
          <input
            type="email"
            placeholder="Enter your email address..."
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            // 🔥 MOBILE FIX: Input padding aur text size adjust kiya
            className="flex-1 p-3.5 md:p-4 bg-slate-950/80 text-white border border-slate-600/50 rounded-xl focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder-slate-500 font-mono text-sm md:text-base"
          />
          <button 
            type="submit" 
            disabled={loading}
            // 🔥 MOBILE FIX: Button ko responsive kiya
            className="px-6 md:px-8 py-3.5 md:py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm md:text-base w-full md:w-auto"
          >
            {loading ? "Scanning..." : "Scan Now"}
          </button>
        </form>

        {/* RESULTS SECTION */}
        {result && (
          <div className="mt-6 md:mt-8 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            {result.error && (
              <div className="p-3 md:p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-xl text-center text-sm md:text-base">
                {result.error}
              </div>
            )}

            {result.safe === true && (
              // 🔥 MOBILE FIX: Padding aur text sizing
              <div className="p-5 md:p-6 bg-green-900/20 border border-green-500/50 rounded-xl text-center">
                <span className="text-4xl md:text-5xl block mb-2">🎉</span>
                <h3 className="text-xl md:text-2xl font-bold text-green-400 mb-2">Good News! No Breaches Found.</h3>
                <p className="text-green-200/70 text-sm md:text-base">Your email is safe and hasn't been found in any known data leaks.</p>
              </div>
            )}

            {result.safe === false && (
              <div className="p-5 md:p-6 bg-red-900/20 border border-red-500/50 rounded-xl">
                <div className="text-center mb-5 md:mb-6">
                  <span className="text-4xl md:text-5xl block mb-2">🚨</span>
                  <h3 className="text-xl md:text-2xl font-bold text-red-500 mb-2">Oh no! Your email has been leaked!</h3>
                  <p className="text-red-300/70 text-sm md:text-base">We found your email in the following data breaches:</p>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {result.breaches.map((breachName, index) => (
                    // 🔥 MOBILE FIX: Tags ko chhota kiya (text-xs)
                    <span key={index} className="px-2.5 md:px-3 py-1 bg-red-950 border border-red-800 text-red-300 rounded-md text-xs md:text-sm font-mono text-center">
                      {breachName}
                    </span>
                  ))}
                </div>
                
                <div className="mt-5 md:mt-6 p-4 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="font-semibold text-slate-300 mb-2 text-sm md:text-base">💡 Next Steps:</p>
                  <ul className="list-disc pl-5 text-xs md:text-sm text-slate-400 space-y-1.5 md:space-y-1">
                    <li>Change your password immediately for the affected sites.</li>
                    <li>Use a strong, unique password (use our Password Checker!).</li>
                    <li>Enable Two-Factor Authentication (2FA) wherever possible.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default EmailBreachChecker;