import { sendChatMessage, removeOptimisticMessage, restoreFailedDraft } from '../lib/chatSend';
import { readStoredUser } from '../lib/storedUser';
import { useTimeout } from '../hooks/useTimeout';
import { subscribeToApi } from '../lib/apiSubscription';
import { reconcileChatMessages } from '../lib/chatMessages';
import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, ShieldAlert, MessageSquare, Terminal, ArrowLeft, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Community = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null); 
  const feedRef = useRef(null);
  const active = useRef(false);
  const pendingMessages = useRef(new Map());
  const [sendError, setSendError] = useState('');
  const scheduleScroll = useTimeout();

  const loggedInUser = readStoredUser();
  const username = loggedInUser ? loggedInUser.name : '';
  const isAuthenticated = !!loggedInUser; 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    active.current = true;
    const feed = subscribeToApi('/api/chat', {
      intervalMs: 3000,
      onData: data => {
        if (Array.isArray(data)) setMessages(previous => reconcileChatMessages(previous,
          [...data, ...pendingMessages.current.values()]));
      },
      onError: () => console.error("Failed to load chats.")
    });
    feedRef.current = feed;
    return () => {
      active.current = false;
      feedRef.current = null;
      feed.unsubscribe();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom || messages.length <= 10) {
        scrollToBottom();
      }
    } else {
      scrollToBottom();
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated) return;

    const tempMsg = { _id: `pending-${crypto.randomUUID()}`, sender: username, message: newMessage, timestamp: new Date() };
    pendingMessages.current.set(tempMsg._id, tempMsg);
    setSendError('');
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage('');
    
    scheduleScroll(() => scrollToBottom(), 100);

    try {
      await sendChatMessage(username, tempMsg.message);
      pendingMessages.current.delete(tempMsg._id);
      if (active.current) feedRef.current?.refresh();
    } catch {
      pendingMessages.current.delete(tempMsg._id);
      if (!active.current) return;
      setMessages(previous => removeOptimisticMessage(previous, tempMsg._id));
      setNewMessage(current => restoreFailedDraft(current, tempMsg.message));
      setSendError('Message failed to send. Please try again.');
      console.error("Message failed to send");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cyberUser');
    navigate('/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900/80 border border-red-500/30 p-8 md:p-10 rounded-3xl text-center max-w-md shadow-[0_0_50px_rgba(239,68,68,0.1)] backdrop-blur-md animate-in zoom-in-95 duration-300">
          <ShieldAlert size={60} className="text-red-500 mx-auto mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] md:w-[70px] md:h-[70px]" />
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 tracking-tight">Access Denied</h2>
          <p className="text-sm md:text-base text-slate-400 mb-8 leading-relaxed">You must be a registered and verified member to access the Global Cyber Lounge.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/login')} className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-extrabold py-3 md:py-4 rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] cursor-pointer text-sm md:text-base">
              Secure Login / Sign Up
            </button>
            <button onClick={() => navigate('/')} className="w-full bg-slate-800 text-slate-300 font-bold py-3 md:py-4 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 text-sm md:text-base">
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 z-[99999] w-full h-full bg-slate-950 flex flex-row overflow-hidden font-sans text-white">
      
      <div className="absolute top-1/4 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-yellow-500/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none"></div>

      {/* ================= SIDEBAR ================= */}
      <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0 flex-col bg-slate-950 border-r border-slate-800 z-20 shadow-2xl">
        <div className="flex-shrink-0 h-24 border-b border-slate-800 flex items-end pb-5 px-6 gap-3 bg-slate-900/50">
          <Link to="/" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer" title="Back to Home">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold tracking-wide">Cyber Sudarshan</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-3 mb-8 mt-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl"><Users className="text-yellow-500" size={28}/></div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Community</h2>
              <p className="text-slate-400 text-sm">Global Cyber Lounge</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-lg">
            <h3 className="text-yellow-500 font-bold text-sm mb-3 flex items-center gap-2"><ShieldAlert size={16}/> Rules of Engagement</h3>
            <ul className="text-slate-400 text-xs space-y-3">
              <li className="flex gap-2"><span>1.</span> Be respectful to fellow members.</li>
              <li className="flex gap-2"><span>2.</span> Do not share illegal hacking tools.</li>
              <li className="flex gap-2 text-red-400"><span>3.</span> Never share personal passwords/OTPs.</li>
              <li className="flex gap-2"><span>4.</span> Help beginners learn cybersecurity.</li>
            </ul>
          </div>
          <div className="mt-auto pt-6 flex-shrink-0">
            <p className="text-slate-500 text-xs text-center flex items-center justify-center gap-1">
              <Terminal size={14}/> Secured by Cyber Sudarshan
            </p>
          </div>
        </div>
      </div>

      {/* ================= CHAT AREA ================= */}
      {/* Added 'h-full' to guarantee max dimensions for mobile flex */}
      <div className="flex-1 flex flex-col bg-slate-900/30 min-w-0 z-10 relative h-full">
        
        {/* Chat Header */}
        <div className="flex-shrink-0 h-14 md:h-24 border-b border-slate-800 flex items-center md:items-end pb-0 md:pb-5 px-4 md:px-6 justify-between bg-slate-950/50 shadow-sm relative z-20">
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/" aria-label="Back to home" className="md:hidden p-1.5 mr-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer">
              <ArrowLeft size={18} />
            </Link>
            <span className="relative flex h-2 w-2 md:h-3 md:w-3 md:mb-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-green-500"></span>
            </span>
            <span className="font-medium tracking-wide text-[15px] md:text-lg">Live Server Chat</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-[10px] md:text-xs text-slate-400 bg-slate-800/80 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-slate-700 shadow-inner hidden md:block">
              Logged in as <span className="text-yellow-400 font-bold ml-1">{username}</span>
            </span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 md:gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg transition-colors cursor-pointer text-[11px] md:text-xs font-bold" title="Logout">
              <LogOut size={14} className="md:w-4 md:h-4"/> <span className="hidden md:inline">Exit</span>
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        {/* 🔥 THE FREEZE FIX: 'overscroll-contain touch-pan-y h-full' added to lock scrolling exactly to this div 🔥 */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto overscroll-contain touch-pan-y h-full p-3 md:p-8 space-y-4 md:space-y-6 min-h-0 [&::-webkit-scrollbar]:w-1 md:[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full relative z-10">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <MessageSquare size={36} className="mb-4 opacity-30 md:w-12 md:h-12" />
              <p className="text-base md:text-lg">No messages yet.</p>
              <p className="text-xs md:text-sm mt-1">Be the first to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.sender === username;
              return (
                <div key={msg._id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <span className="text-[9px] md:text-[11px] text-slate-500 mb-1 md:mb-1.5 mx-1 font-medium tracking-wide">
                    {isMe ? 'You' : msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className={`px-3 py-2 md:px-5 md:py-3 max-w-[90%] md:max-w-[70%] rounded-2xl ${isMe ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-slate-950 rounded-tr-sm font-semibold shadow-[0_5px_15px_rgba(234,179,8,0.25)]' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm shadow-md'}`}>
                    <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Chat Input Area */}
        <div className="flex-shrink-0 p-3 md:p-6 pb-4 md:pb-10 bg-slate-900 border-t border-slate-800 relative z-20">
          {sendError && <p role="alert" className="mb-2 text-sm text-red-400">{sendError}</p>}
          <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3 max-w-4xl mx-auto">
            <input 
              type="text" aria-label="Chat message" placeholder="Type a message..." required autoComplete="off"
              className="flex-1 bg-slate-950 border border-slate-700 text-white px-4 py-3 md:px-5 md:py-4 rounded-xl focus:border-yellow-500 outline-none transition-all focus:shadow-[0_0_15px_rgba(234,179,8,0.1)] text-sm md:text-[15px]"
              value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              autoFocus
            />
            <button type="submit" aria-label="Send message" className="bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 p-3 px-4 md:p-4 md:px-6 rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
              <Send size={18} className="md:w-[22px] md:h-[22px] md:-ml-1" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Community;
