import { useDialog } from '../hooks/useDialog';
import { useTimeout } from '../hooks/useTimeout';
import { apiRequest } from '../lib/api';
import { subscribeToApi } from '../lib/apiSubscription';
import React, { useState, useEffect, useRef } from 'react';
import { Zap, ChevronRight, ChevronLeft, Clock, X, CheckCircle, AlertCircle, PlusCircle, Newspaper } from 'lucide-react';

const CyberNews = () => {
  const [newsList, setNewsList] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 🔥 NAYA: Slider ko left-right scroll karne ke liye Ref
  const sliderRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '', summary: '', fullDetails: '', type: 'News', imageUrl: ''
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const scheduleToast = useTimeout();
  const submitDialog = useDialog(showSubmitForm, () => setShowSubmitForm(false));
  const detailDialog = useDialog(Boolean(selectedNews), () => setSelectedNews(null));
  
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    scheduleToast(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const subscription = subscribeToApi('/api/news', {
      onData: (data, response) => {
        setNewsLoading(false);
        if (response.ok && Array.isArray(data)) {
          setNewsList(data);
          setLoadError('');
        } else {
          setLoadError('Failed to load news. Please try again later.');
        }
      },
      onError: () => {
        setNewsLoading(false);
        setLoadError('Failed to load news. Please try again later.');
        console.error("Failed to load news.");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showNotification("News submitted for verification! ✅", "success");
        setFormData({ title: '', summary: '', fullDetails: '', type: 'News', imageUrl: '' });
        setShowSubmitForm(false);
      } else { 
        showNotification("Action failed.", "error"); 
      }
    } catch {
      showNotification("Network Error!", "error"); 
    }
    setLoading(false);
  };

  // 🔥 NAYA: Scroll Functions for Desktop Arrows
  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* 🔔 TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed top-20 left-4 right-4 md:left-auto md:top-24 md:right-6 z-[99999] flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 md:slide-in-from-right-8 duration-300 border backdrop-blur-md ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
          {toast.type === 'success' ? <CheckCircle size={20} className="md:w-[22px] md:h-[22px]" /> : <AlertCircle size={20} className="md:w-[22px] md:h-[22px]" />}
          <span className="font-bold tracking-wide text-sm md:text-base">{toast.message}</span>
        </div>
      )}

      {/* MAIN SECTION */}
      <section className="py-10 md:py-16 bg-slate-950 relative overflow-hidden border-y border-slate-800/50 z-10">
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[100px] bg-yellow-500/5 blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10 px-4 md:px-12">
          
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 md:mb-10" data-aos="fade-down">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 mb-5 md:mb-0 text-center md:text-left">
              <Zap className="text-yellow-500 animate-pulse hidden md:block" size={32} />
              <Zap className="text-yellow-500 animate-pulse md:hidden" size={28} />
              <div>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                  Live <span className="text-yellow-500">Cyber News</span>
                </h2>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Real-time alerts & updates.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowSubmitForm(true)} 
              className="w-full md:w-auto flex justify-center items-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 font-bold px-4 py-3 md:py-2 rounded-lg hover:scale-105 transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] cursor-pointer text-sm md:text-base"
            >
              <PlusCircle size={18} /> Share a News Tip
            </button>
          </div>

          {/* 🔥 AMAZON-STYLE SLIDER CONTAINER 🔥 */}
          {loadError ? <p role="alert" className="py-10 text-center text-red-400">{loadError}</p>
            : newsLoading ? <p role="status" className="py-10 text-center text-slate-400">Loading news...</p>
            : newsList.length === 0 ? (
            <div className="text-center py-10 text-slate-500 border border-slate-800 rounded-xl bg-slate-900/50 text-sm md:text-base mx-2 md:mx-0">No recent cyber news at the moment.</div>
          ) : (
            <div className="relative group w-full">
              
              {/* Desktop Left Arrow */}
              <button 
                onClick={scrollLeft} 
                aria-label="Previous news"
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-slate-900 border border-slate-700 hover:border-yellow-500 hover:text-yellow-500 text-slate-400 p-3 rounded-full shadow-2xl transition-all opacity-0 group-hover:opacity-100 -ml-5 cursor-pointer"
              >
                <ChevronLeft size={24} />
              </button>

              {/* Scrollable Area */}
              {/* 'overflow-x-auto snap-x' -> isse swipe makhhan chalega phone pe! */}
              <div 
                ref={sliderRef}
                className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory px-2 md:px-4 pb-8 pt-4 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none' }} 
              >
                {newsList.map((news, index) => (
                  // 'flex-shrink-0 snap-start' -> ensure karta hai ki swipe karte waqt card ekdum sahi jagah rukega
                  <div key={index} className="flex-shrink-0 snap-start w-[280px] sm:w-[320px] md:w-[380px] bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-yellow-500/50 transition-all duration-300 shadow-lg flex flex-col overflow-hidden relative">
                    {news.imageUrl && (
                      <div className="h-32 md:h-40 w-full overflow-hidden relative">
                        <img src={news.imageUrl} alt={news.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                      </div>
                    )}
                    <div role="button" tabIndex={0} aria-label={`Read ${news.title}`} onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedNews(news);
                      }
                    }} className="p-4 md:p-6 flex flex-col flex-grow cursor-pointer" onClick={() => setSelectedNews(news)}>
                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <span className={`text-[9px] md:text-xs font-bold px-2.5 md:px-3 py-1 rounded-full border flex items-center gap-1.5 ${news.type.includes('Alert') || news.type.includes('Urgent') ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}`}>
                          {news.type}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 text-[10px] md:text-xs font-medium mt-1">
                          <Clock size={12} /> {new Date(news.date).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 group-hover:text-yellow-400 transition-colors leading-snug line-clamp-2">{news.title}</h3>
                      <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-4 md:mb-6 line-clamp-3">{news.summary}</p>
                      <div className="flex items-center gap-2 text-yellow-500 text-xs md:text-sm font-bold uppercase tracking-wider group-hover:translate-x-2 transition-transform mt-auto">Read Details <ChevronRight size={16} /></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Right Arrow */}
              <button 
                onClick={scrollRight} 
                aria-label="Next news"
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-slate-900 border border-slate-700 hover:border-yellow-500 hover:text-yellow-500 text-slate-400 p-3 rounded-full shadow-2xl transition-all opacity-0 group-hover:opacity-100 -mr-5 cursor-pointer"
              >
                <ChevronRight size={24} />
              </button>

            </div>
          )}
        </div>
      </section>

      {/* 📝 SUBMIT FORM MODAL */}
      {showSubmitForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div ref={submitDialog} role="dialog" aria-modal="true" aria-labelledby="news-submit-title" tabIndex={-1} className="bg-slate-900 border border-yellow-500/50 w-full max-w-4xl p-5 md:p-10 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.2)] relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <button aria-label="Close news submission" onClick={() => setShowSubmitForm(false)} className="absolute top-3 right-3 md:top-4 md:right-4 bg-slate-800 text-slate-400 hover:text-white p-2 rounded-full transition-colors z-50 cursor-pointer"><X size={18} className="md:w-[20px] md:h-[20px]" /></button>
            <h3 id="news-submit-title" className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 flex items-center gap-2 mt-2 md:mt-0"><Newspaper className="text-yellow-500 w-5 h-5 md:w-6 md:h-6"/> Report Incident</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-4 md:mb-6 pb-3 md:pb-4 border-b border-slate-800">Your submission will be reviewed by our team before going live.</p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input type="text" aria-label="News title" placeholder="News Title" required className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white focus:border-yellow-500 outline-none text-sm md:text-base" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              <select aria-label="News type" className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white focus:border-yellow-500 outline-none text-sm md:text-base" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                <option value="News">General News</option>
                <option value="Critical Alert">Critical Alert</option>
                <option value="Scam Alert">Scam Alert</option>
                <option value="Urgent Update">Urgent Update</option>
              </select>
              <input type="url" aria-label="Image URL" placeholder="Image URL (Link to any relevant image)" className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white focus:border-yellow-500 outline-none md:col-span-2 text-sm md:text-base" value={formData.imageUrl} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} />
              <textarea rows="2" aria-label="Short summary" placeholder="Short Summary (visible on slider)..." required className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white focus:border-yellow-500 outline-none md:col-span-2 resize-y text-sm md:text-base" value={formData.summary} onChange={(e) => setFormData({...formData, summary: e.target.value})}></textarea>
              <textarea rows="4" aria-label="Full details" placeholder="Full Details..." required className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white focus:border-yellow-500 outline-none md:col-span-2 resize-y text-sm md:text-base" value={formData.fullDetails} onChange={(e) => setFormData({...formData, fullDetails: e.target.value})}></textarea>
              <button disabled={loading} className="md:col-span-2 w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-extrabold py-3 mt-2 md:mt-4 rounded-lg transition-all shadow-lg cursor-pointer text-sm md:text-base">
                {loading ? "Submitting..." : "Submit for Verification"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 📖 DETAIL MODAL */}
      {selectedNews && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div ref={detailDialog} role="dialog" aria-modal="true" aria-labelledby="news-detail-title" tabIndex={-1} className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.15)] overflow-y-auto max-h-[90vh] relative animate-in zoom-in-95 duration-200 [&::-webkit-scrollbar]:hidden">
            <button aria-label="Close news details" onClick={() => setSelectedNews(null)} className="absolute top-3 right-3 md:top-4 md:right-4 bg-slate-900/80 backdrop-blur text-slate-400 hover:text-white p-2 rounded-full transition-colors z-50 cursor-pointer border border-slate-700"><X size={18} className="md:w-[20px] md:h-[20px]"/></button>
            
            {selectedNews.imageUrl && (
              <div className="w-full h-48 md:h-80 overflow-hidden relative">
                <img src={selectedNews.imageUrl} alt={selectedNews.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
              </div>
            )}
            
            <div className={`p-5 md:p-10 ${selectedNews.imageUrl ? '-mt-12 md:-mt-16 relative z-10' : 'pt-10'}`}>
              <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <span className={`text-[10px] md:text-sm font-bold px-3 py-1 md:px-4 md:py-1.5 rounded-full border ${selectedNews.type.includes('Alert') || selectedNews.type.includes('Urgent') ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}`}>{selectedNews.type}</span>
                <span className="flex items-center gap-1.5 text-slate-400 text-xs md:text-sm font-medium"><Clock size={12} className="md:w-[14px] md:h-[14px]"/> {new Date(selectedNews.date).toLocaleDateString()}</span>
              </div>
              <h3 id="news-detail-title" className="text-xl md:text-4xl font-extrabold text-white mb-4 md:mb-6 leading-tight pr-6">{selectedNews.title}</h3>
              <hr className="border-slate-800 mb-4 md:mb-6" />
              <div className="prose prose-invert max-w-none"><p className="text-slate-300 text-sm md:text-lg leading-relaxed whitespace-pre-line">{selectedNews.fullDetails}</p></div>
              <div className="mt-8 md:mt-10 pt-5 md:pt-6 border-t border-slate-800 flex justify-end">
                <button onClick={() => setSelectedNews(null)} className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-extrabold px-6 md:px-8 py-2.5 md:py-3 rounded-xl transition-all cursor-pointer text-sm md:text-base w-full md:w-auto">Close News</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CyberNews;
