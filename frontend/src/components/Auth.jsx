import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  
  // 🔥 Error aur Success dono ke state banaye hain 🔥
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score; 
  };

  const strength = calculateStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!isLogin && strength < 3) {
      setError("Please create a stronger password (mix of letters, numbers & symbols).");
      setLoading(false);
      return;
    }

    const url = isLogin 
      ? 'https://cyber-sudarshan-backend-1.onrender.com/api/auth/login'
      : 'https://cyber-sudarshan-backend-1.onrender.com/api/auth/signup';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        if (!isLogin) {
          // ==========================================
          // 🆕 SIGN UP SUCCESS FLOW
          // ==========================================
          setSuccess("Mission Accomplished! Account created securely. Please log in.");
          setIsLogin(true); // Wapas login page par bhej do
          setFormData({ ...formData, password: '' }); // Password field khali kar do
        } else {
          // ==========================================
          // 🆕 LOGIN SUCCESS FLOW
          // ==========================================
          localStorage.setItem('cyberUser', JSON.stringify(data.user));
          navigate('/'); // Community nahi, ab seedha Home Page par jayega!
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <section className="min-h-screen bg-slate-950 flex items-center justify-center pt-28 pb-10 px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 p-6 md:p-8 animate-in zoom-in-95 duration-300">
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-yellow-500/20 shadow-inner">
            <ShieldCheck size={28} className="text-yellow-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {isLogin ? "Welcome Back" : "Join the Mission"}
          </h2>
          <p className="text-slate-400 mt-1.5 text-xs md:text-sm">
            {isLogin ? "Enter your credentials to access the portal." : "Create an account to join the cyber community."}
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2.5 rounded-xl flex items-center gap-3 text-xs md:text-sm font-medium animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        {/* SUCCESS MESSAGE (Account Created) */}
        {success && (
          <div className="mb-5 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-2.5 rounded-xl flex items-center gap-3 text-xs md:text-sm font-medium animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="text" placeholder="Full Name" required className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all text-sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="email" placeholder="Email Address" required className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-4 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all text-sm" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type={showPassword ? "text" : "password"} placeholder="Password" required minLength="6" className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-12 py-3 rounded-xl focus:border-yellow-500 outline-none transition-all text-sm" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-yellow-500 transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {!isLogin && formData.password.length > 0 && (
            <div className="animate-in fade-in duration-300">
              <div className="flex gap-1 mb-1.5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-300 ${strength >= 1 ? 'bg-red-500 w-1/4' : 'w-0'}`}></div>
                <div className={`h-full transition-all duration-300 ${strength >= 2 ? 'bg-orange-500 w-1/4' : 'w-0'}`}></div>
                <div className={`h-full transition-all duration-300 ${strength >= 3 ? 'bg-yellow-500 w-1/4' : 'w-0'}`}></div>
                <div className={`h-full transition-all duration-300 ${strength >= 4 ? 'bg-green-500 w-1/4' : 'w-0'}`}></div>
              </div>
              <p className="text-[10px] text-slate-400 flex justify-between">
                <span>{strength <= 1 && "Weak"}{strength === 2 && "Fair"}{strength === 3 && "Good"}{strength === 4 && "Strong"}</span>
                <span className="text-yellow-500/70">Use 8+ chars, A-Z, 0-9, & symbols</span>
              </p>
            </div>
          )}

          <button disabled={loading} className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-extrabold py-3.5 rounded-xl flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-70 cursor-pointer mt-4">
            {loading ? "Authenticating..." : (isLogin ? "Secure Login" : "Create Account")} <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 text-center text-xs md:text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); setFormData({...formData, password: ''}); }} className="text-yellow-500 font-bold hover:underline cursor-pointer">
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </div>

      </div>
    </section>
  );
};

export default Auth;