import { useDialog } from '../hooks/useDialog';
import { useTimeout } from '../hooks/useTimeout';
import { apiRequest } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { User, PenTool, Send, Lock, Unlock, X, ShieldCheck, LogOut, AlertCircle, ArrowLeft, Trash2, Edit3, CheckCircle } from 'lucide-react';

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [formData, setFormData] = useState({ title: '', author: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingBlogId, setEditingBlogId] = useState(null);
  const [blogToDelete, setBlogToDelete] = useState(null); 

  const [selectedBlog, setSelectedBlog] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [loginError, setLoginError] = useState(''); 

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const scheduleToast = useTimeout();
  const loginDialog = useDialog(showLoginModal, () => closeLoginModal());
  const logoutDialog = useDialog(showLogoutModal, () => setShowLogoutModal(false));
  const deleteDialog = useDialog(Boolean(blogToDelete), () => setBlogToDelete(null));

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    scheduleToast(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000); 
  };

  const fetchBlogs = async () => {
    try {
      const res = await apiRequest('/api/blogs');
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      setError("Failed to load blogs.");
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await apiRequest('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdmin(true);
        setAdminPassword(inputPassword);
        setShowLoginModal(false);
        setInputPassword('');
        setLoginError('');
        showNotification("Admin Access Granted! 🔓", "success");
      } else {
        setLoginError("Incorrect Password. Access Denied.");
      }
    } catch {
      setLoginError("Server Error. Try again later.");
    }
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginError('');
    setInputPassword('');
  };

  const confirmLogout = () => {
    setIsAdmin(false);
    setAdminPassword('');
    setShowLogoutModal(false);
    setEditingBlogId(null);
    setFormData({ title: '', author: '', content: '' });
    showNotification("Logged out successfully.", "info");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const url = editingBlogId 
      ? `/api/blogs/${editingBlogId}`
      : '/api/blogs';
    
    const method = editingBlogId ? 'PUT' : 'POST';

    try {
      const res = await apiRequest(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, adminPassword })
      });
      
      if (res.ok) {
        showNotification(editingBlogId ? "Blog Updated Successfully! ✏️" : "Blog Posted Successfully! 🎉", "success");
        setFormData({ title: '', author: '', content: '' });
        setEditingBlogId(null); 
        fetchBlogs();
      } else {
        showNotification("Action failed. Check admin status.", "error");
      }
    } catch {
      showNotification("Network Error! Please try again.", "error");
    }
    setLoading(false);
  };

  const executeDelete = async () => {
    if (!blogToDelete) return;

    try {
      const res = await apiRequest(`/api/blogs/${blogToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword })
      });

      if (res.ok) {
        showNotification("Blog Deleted Permanently! 🗑️", "success");
        setBlogToDelete(null); 
        setSelectedBlog(null); 
        fetchBlogs();
      } else {
        showNotification("Failed to delete blog.", "error");
      }
    } catch {
      showNotification("Network Error! Please try again.", "error");
    }
  };

  const handleEditClick = (blog) => {
    setFormData({ title: blog.title, author: blog.author, content: blog.content });
    setEditingBlogId(blog._id);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  return (
    // 🔥 MOBILE FIX: Paddings kam ki hain mobile ke liye (py-12 px-4 pt-20)
    <section className="bg-slate-950 py-12 md:py-20 px-4 md:px-6 min-h-screen text-white pt-20 md:pt-24 relative overflow-hidden">
      
      {/* ========================================= */}
      {/* 🔔 CUSTOM TOAST NOTIFICATION */}
      {/* 🔥 MOBILE FIX: Mobile pe center, desktop pe right */}
      {/* ========================================= */}
      {toast.show && (
        <div className={`fixed top-20 left-4 right-4 md:left-auto md:top-24 md:right-6 z-[100] flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-5 md:slide-in-from-right-8 duration-300 border backdrop-blur-md ${
          toast.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' :
          toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' :
          'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} className="md:w-5 md:h-5"/> : <AlertCircle size={20} className="md:w-5 md:h-5"/>}
          <span className="font-bold tracking-wide text-sm md:text-base">{toast.message}</span>
        </div>
      )}

      {/* ========================================= */}
      {/* VIEW 1: FULL BLOG READING MODE */}
      {/* ========================================= */}
      {selectedBlog ? (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-500">
          <button 
            onClick={() => setSelectedBlog(null)} 
            className="flex items-center gap-2 text-yellow-500 hover:text-yellow-400 font-medium mb-6 md:mb-8 bg-yellow-500/10 hover:bg-yellow-500/20 px-3 md:px-4 py-2 rounded-lg transition-all w-fit cursor-pointer text-sm md:text-base"
          >
            <ArrowLeft size={18} className="md:w-5 md:h-5"/> Back to Blogs
          </button>

          {/* 🔥 MOBILE FIX: Padding (p-5) aur heading sizes fix kiye */}
          <div className="bg-slate-900/50 p-5 md:p-12 rounded-2xl border border-slate-800 shadow-2xl relative">
            
            {isAdmin && (
               <button 
                  onClick={() => setBlogToDelete(selectedBlog._id)}
                  className="absolute top-4 right-4 md:top-8 md:right-8 text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 transition-colors p-2 rounded-lg cursor-pointer"
                  title="Delete Blog"
               >
                 <Trash2 size={18} className="md:w-5 md:h-5"/>
               </button>
            )}

            <h1 className="text-2xl md:text-5xl font-extrabold text-white mb-4 md:mb-6 leading-tight pr-10 md:pr-12">
              {selectedBlog.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm mb-6 md:mb-10 border-b border-slate-800 pb-4 md:pb-6">
              <div className="flex items-center gap-1.5 md:gap-2 bg-slate-950 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-yellow-500/30">
                <User size={14} className="text-yellow-500 md:w-4 md:h-4" /> 
                <span className="font-bold text-yellow-500 uppercase tracking-wider">{selectedBlog.author}</span>
              </div>
              <span className="text-slate-400 font-medium flex items-center gap-1">
                📅 {new Date(selectedBlog.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed text-base md:text-xl whitespace-pre-wrap opacity-95">
              {selectedBlog.content}
            </p>
          </div>
        </div>
      ) : (
        
        /* ========================================= */
        /* VIEW 2: NORMAL BLOGS LIST & ADMIN PANEL   */
        /* ========================================= */
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
          
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 md:mb-16 gap-4 md:gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-1 md:mb-2">Community <span className="text-yellow-500">Blogs</span></h2>
              <p className="text-slate-400 text-sm md:text-base">Read insights from our security experts.</p>
            </div>

            <div>
              {!isAdmin ? (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center justify-center gap-2 border border-slate-700 bg-slate-900 text-slate-400 px-4 py-2 rounded-lg hover:text-yellow-400 hover:border-yellow-400 transition-all text-xs md:text-sm group cursor-pointer w-full md:w-auto"
                >
                  <Lock size={14} className="group-hover:text-yellow-400 md:w-4 md:h-4" /> Admin Login
                </button>
              ) : (
                <button 
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-all text-xs md:text-sm cursor-pointer w-full md:w-auto"
                >
                  <LogOut size={14} className="md:w-4 md:h-4" /> Logout
                </button>
              )}
            </div>
          </div>

          {/* 🔥 MOBILE FIX: Gap kam kiya mobile pe (gap-8) */}
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            
            {/* Admin Write/Edit Form */}
            {isAdmin && (
              // 🔥 MOBILE FIX: Form mobile pe 'static' aur desktop pe 'sticky' rahega taaki mobile screen block na ho
              <div className="md:col-span-1 bg-slate-900 p-5 md:p-8 rounded-2xl border border-yellow-500/30 h-fit shadow-[0_0_20px_rgba(234,179,8,0.1)] static md:sticky top-24">
                <div className="flex items-center gap-2 mb-4 md:mb-6">
                  <div className={`p-2 rounded-lg ${editingBlogId ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                     {editingBlogId ? <Edit3 size={18} className="md:w-5 md:h-5"/> : <PenTool size={18} className="md:w-5 md:h-5"/>}
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white">
                    {editingBlogId ? "Edit Post" : "New Post"}
                  </h3>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                  <input 
                    type="text" placeholder="Title" required
                    className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white focus:border-yellow-500 outline-none transition-colors text-sm md:text-base"
                    value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                  <input 
                    type="text" placeholder="Author (CEO/Admin)" required
                    className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white focus:border-yellow-500 outline-none transition-colors text-sm md:text-base"
                    value={formData.author} onChange={(e) => setFormData({...formData, author: e.target.value})}
                  />
                  <textarea 
                    rows="8" placeholder="Share your thoughts... (Drag bottom-right corner to resize)" required
                    // 🔥 MOBILE FIX: Min-height kam ki mobile ke liye
                    className="w-full bg-slate-950 p-3 md:p-4 rounded-lg border border-slate-700 text-white focus:border-yellow-500 outline-none resize-y min-h-[150px] md:min-h-[250px] transition-colors leading-relaxed text-sm md:text-base"
                    value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
                  ></textarea>
                  
                  <div className="flex gap-2">
                    <button disabled={loading} className={`flex-1 py-2.5 md:py-3 rounded-lg font-bold md:font-extrabold flex justify-center items-center gap-2 shadow-lg transition-all cursor-pointer text-sm md:text-base ${editingBlogId ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-cyan-500/20' : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 shadow-yellow-500/20'}`}>
                      {editingBlogId ? (loading ? "Updating..." : "Update Post") : (loading ? "Posting..." : "Publish Post")}
                    </button>
                    
                    {/* Cancel Edit Button */}
                    {editingBlogId && (
                      <button 
                        type="button" 
                        onClick={() => { setEditingBlogId(null); setFormData({title: '', author: '', content: ''}); }}
                        className="px-3 md:px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors text-sm md:text-base"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Blogs List */}
            <div className={isAdmin ? "md:col-span-2" : "md:col-span-3"}>
              {error && <p role="alert" className="mb-4 text-red-400 text-sm md:text-base">{error}</p>}
              <div className="grid gap-5 md:gap-6">
                {blogs && blogs.length === 0 ? (
                  !error && <div className="text-center py-12 md:py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <p className="text-slate-500 text-sm md:text-lg">No blogs published yet.</p>
                  </div>
                ) : (
                  blogs?.map((blog) => (
                    // 🔥 MOBILE FIX: Padding (p-5) 
                    <div key={blog._id} className="bg-slate-900/80 p-5 md:p-8 rounded-xl border border-slate-800 hover:border-yellow-500/30 transition-all hover:translate-y-[-2px] group flex flex-col justify-between shadow-lg relative">
                      
                      {/* ADMIN EDIT & DELETE ACTIONS */}
                      {isAdmin && (
                        <div className="absolute top-3 right-3 md:top-4 md:right-4 flex gap-1 md:gap-2">
                          <button 
                            onClick={() => handleEditClick(blog)}
                            className="p-1.5 md:p-2 text-cyan-500 hover:bg-cyan-500/20 rounded-lg transition-colors cursor-pointer" title="Edit Blog"
                          >
                            <Edit3 size={16} className="md:w-[18px] md:h-[18px]"/>
                          </button>
                          <button 
                            onClick={() => setBlogToDelete(blog._id)} 
                            className="p-1.5 md:p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer" title="Delete Blog"
                          >
                            <Trash2 size={16} className="md:w-[18px] md:h-[18px]"/>
                          </button>
                        </div>
                      )}

                      <div>
                        <h4 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3 group-hover:text-yellow-400 transition-colors pr-14 md:pr-16 leading-tight">
                          {blog.title}
                        </h4>
                        <p className="text-slate-400 leading-relaxed text-sm md:text-base mb-4 md:mb-6">
                          {blog.content.length > 120 ? blog.content.substring(0, 120) + "..." : blog.content}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mt-auto pt-4 md:pt-5 border-t border-slate-800/80">
                        <div className="flex flex-col">
                          <span className="text-yellow-500 font-bold text-xs md:text-sm tracking-wide uppercase">By {blog.author}</span>
                          <span className="text-slate-500 text-xs md:text-sm mt-0.5">{new Date(blog.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        {/* 🔥 MOBILE FIX: Button 'w-full sm:w-auto' kar diya gaya */}
                        <button 
                          onClick={() => setSelectedBlog(blog)}
                          className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold px-4 md:px-6 py-2.5 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all transform hover:scale-105 cursor-pointer w-full sm:w-auto text-center text-sm md:text-base"
                        >
                          Read More
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALS (POPUPS) ================= */}

      {/* 1. LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div ref={loginDialog} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" tabIndex={-1} className="bg-slate-900 border border-yellow-500/50 w-full max-w-md p-6 md:p-8 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.2)] relative animate-in zoom-in-95 duration-200">
            <button aria-label="Close admin login" onClick={closeLoginModal} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"><X size={18} className="md:w-5 md:h-5"/></button>
            <div className="text-center mb-5 md:mb-6 mt-2 md:mt-0">
              <div className="bg-yellow-500/10 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border border-yellow-500/30"><ShieldCheck size={28} className="text-yellow-500 md:w-8 md:h-8" /></div>
              <h3 className="text-xl md:text-2xl font-bold text-white" id="admin-dialog-title">Admin Access</h3>
              <p className="text-slate-400 text-xs md:text-sm mt-1">Enter your secret key to continue</p>
            </div>
            <form onSubmit={handleLoginSubmit} className="space-y-3 md:space-y-4">
              <input type="password" aria-label="Admin secret key" data-dialog-initial-focus placeholder="Enter Secret Key..." className={`w-full bg-slate-950 p-3 md:p-4 rounded-xl border text-white outline-none text-center tracking-widest transition-all text-sm md:text-base ${loginError ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-slate-700 focus:border-yellow-500 focus:shadow-[0_0_10px_rgba(234,179,8,0.3)]'}`} value={inputPassword} onChange={(e) => {setInputPassword(e.target.value); setLoginError('');}} />
              {loginError && (<div className="flex items-center justify-center gap-1.5 md:gap-2 text-red-400 text-xs md:text-sm bg-red-500/10 py-2 rounded-lg animate-in fade-in slide-in-from-top-1"><AlertCircle size={14} className="md:w-4 md:h-4"/><span>{loginError}</span></div>)}
              <button className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-bold md:font-extrabold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] cursor-pointer text-sm md:text-base">Unlock Dashboard</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div ref={logoutDialog} role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" tabIndex={-1} className="bg-slate-900 border border-red-500/30 w-full max-w-sm p-5 md:p-6 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.15)] relative animate-in zoom-in-95 duration-200 text-center">
            <div className="bg-red-500/10 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border border-red-500/30"><LogOut size={24} className="text-red-400 md:w-7 md:h-7" /></div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2" id="logout-dialog-title">Sign Out?</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-5 md:mb-6">Are you sure you want to exit admin mode?</p>
            <div className="flex gap-2 md:gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-2 md:py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm md:text-base font-medium cursor-pointer">Cancel</button>
              <button onClick={confirmLogout} className="flex-1 py-2 md:py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all text-sm md:text-base font-medium cursor-pointer">Yes, Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DELETE CONFIRMATION MODAL */}
      {blogToDelete && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div ref={deleteDialog} role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" tabIndex={-1} className="bg-slate-900 border border-red-500/30 w-full max-w-sm p-5 md:p-6 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.15)] relative animate-in zoom-in-95 duration-200 text-center">
            <div className="bg-red-500/10 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border border-red-500/30">
              <Trash2 size={24} className="text-red-400 md:w-7 md:h-7" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2" id="delete-dialog-title">Delete Blog?</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-5 md:mb-6 px-2">This action cannot be undone. Are you sure you want to permanently delete this post?</p>
            <div className="flex gap-2 md:gap-3">
              <button onClick={() => setBlogToDelete(null)} className="flex-1 py-2 md:py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm md:text-base font-medium cursor-pointer">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2 md:py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all text-sm md:text-base font-medium cursor-pointer">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default Blogs;
