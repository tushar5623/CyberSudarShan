import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, UserCircle, LogOut } from 'lucide-react';
import logo from '../assets/logo.png';
import { readStoredUser } from '../lib/storedUser';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); 

  const loggedInUser = readStoredUser();
  const isAuthenticated = !!loggedInUser;

  const handleLogout = () => {
    localStorage.removeItem('cyberUser');
    navigate('/'); 
    window.location.reload(); 
  };

  return (
    <nav className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 fixed top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
       {/* LOGO */}
        <Link to="/" className="flex items-center gap-2">
          <img 
            src={logo}
            alt="Cyber Sudarshan Logo" 
            className="w-12 h-12 object-contain" 
          />
          <div>
            <h1 className="text-white font-extrabold text-lg md:text-xl tracking-wider leading-tight">CYBER</h1>
            <h1 className="text-yellow-500 font-extrabold text-lg md:text-xl tracking-wider leading-tight">SUDARSHAN</h1>
          </div>
        </Link>

        {/* DESKTOP LINKS */}
        {/* 🔥 FIX: Yahan se maine saare scroll logic hata diye hain. Ab ye normal links hain jo seedha naye page par jayenge. */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className={`font-medium transition-colors ${location.pathname === '/' ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}>Home</Link>
          
          <Link to="/about" className={`font-medium transition-colors ${location.pathname === '/about' ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}>About</Link>
          
          <Link to="/services" className={`font-medium transition-colors ${location.pathname === '/services' ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}>Services</Link>
          
          <Link to="/blogs" className={`font-medium transition-colors ${location.pathname === '/blogs' ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}>Blogs</Link>
          
          <Link to="/community" className={`flex items-center gap-1 font-medium transition-colors ${location.pathname === '/community' ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`}>
            Community <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
          </Link>
        </div>

        {/* LOGIN / LOGOUT BUTTON (DESKTOP) */}
        <div className="hidden md:flex items-center gap-4">
          {!isAuthenticated ? (
            <Link to="/login" className="bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-bold px-6 py-2.5 rounded-full hover:scale-105 transition-transform shadow-[0_0_15px_rgba(234,179,8,0.3)]">
              Login / Sign Up
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-slate-300 text-sm flex items-center gap-2">
                <UserCircle size={20} className="text-yellow-500" /> 
                Hi, <span className="text-white font-bold">{loggedInUser.name}</span>
              </span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors p-2" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button aria-label={isOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={isOpen} className="md:hidden text-white cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col gap-4">
          <Link to="/" onClick={() => setIsOpen(false)} className="text-slate-300 font-medium">Home</Link>
          
          <Link to="/about" onClick={() => setIsOpen(false)} className="text-slate-300 font-medium">About</Link>
          <Link to="/services" onClick={() => setIsOpen(false)} className="text-slate-300 font-medium">Services</Link>
          <Link to="/blogs" onClick={() => setIsOpen(false)} className="text-slate-300 font-medium">Blogs</Link>
          <Link to="/community" onClick={() => setIsOpen(false)} className="text-slate-300 font-medium">Community</Link>
          
          <hr className="border-slate-800 my-2" />
          
          {!isAuthenticated ? (
            <Link to="/login" onClick={() => setIsOpen(false)} className="bg-yellow-500 text-slate-900 font-bold px-6 py-3 rounded-xl text-center">
              Login / Sign Up
            </Link>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="text-slate-300 text-sm flex items-center gap-2">
                <UserCircle size={20} className="text-yellow-500" /> Hi, {loggedInUser.name}
              </span>
              <button onClick={() => { handleLogout(); setIsOpen(false); }} className="bg-red-500/10 text-red-400 font-bold px-6 py-3 rounded-xl text-center border border-red-500/20 cursor-pointer">
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
