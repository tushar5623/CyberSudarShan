require('dotenv').config(); // Secret file padhne ke liye
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Emergency = require('./models/Emergency');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection (Secure Tarika)
// Ye process.env.MONGO_URI automatically .env file se URL uthayega
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Cloud Database Connected Successfully!"))
  .catch(err => console.log("❌ Database Connection Error:", err));

// Schema (Data Structure)
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

// API Route
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const newContact = new Contact({ name, email, message });
    await newContact.save();
    res.status(201).json({ message: "Data Saved to Cloud!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save data" });
  }
});

// ==========================================
// 🔐 USER AUTHENTICATION SCHEMA & ROUTES
// ==========================================
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// --- 1. SIGN UP (New User) ---
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: "Email already registered!" });

        // Hash Password (Security First!)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save new user
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ success: true, message: "Account created successfully!", user: { name: newUser.name, email: newUser.email } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- 2. LOGIN (Existing User) ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials!" });

        res.status(200).json({ success: true, message: "Login successful!", user: { name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// EMERGENCY POST ROUTE
app.post('/api/emergency', async (req, res) => {
    try {
        const { name, email, mobile, problem } = req.body;
        
        const newEmergency = new Emergency({
            name, email, mobile, problem
        });

        await newEmergency.save();
        res.status(201).json({ message: "Emergency reported successfully! We will contact you soon." });
    } catch (error) {
        console.error("Emergency Error:", error);
        res.status(500).json({ message: "Server Error! Please try again." });
    }
});



// --- BLOG SECTION START ---

// 1. Blog Schema (Blog kaisa dikhega)
const blogSchema = new mongoose.Schema({
  title: String,
  author: String,
  content: String,
  date: { type: Date, default: Date.now }
});

const Blog = mongoose.model('Blog', blogSchema);

// Route 2: Post a New Blog (SECURE VERSION 🔒)
app.post('/api/blogs', async (req, res) => {
  try {
    const { title, author, content, adminPassword } = req.body; // Password bhi receive karo

    // SECURITY CHECK 🛡️
    if (adminPassword !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: "Invalid Admin Password! ❌" });
    }

    const newBlog = new Blog({ title, author, content });
    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (error) {
    res.status(500).json({ error: "Failed to post blog" });
  }
});

// 3. API: Saare Blogs laane ke liye (Read)
app.get('/api/blogs', async (req, res) => {
  try {
    // Sabse naya blog sabse upar dikhega (sort -1)
    const blogs = await Blog.find().sort({ date: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});
// ==========================================
// 📝 EDIT (UPDATE) A BLOG
// ==========================================
app.put('/api/blogs/:id', async (req, res) => {
    try {
        const { adminPassword, title, author, content } = req.body;
        
        // Check Admin Password
        if (adminPassword !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ success: false, message: "Unauthorized Hacker! 🚨" });
        }

        const updatedBlog = await Blog.findByIdAndUpdate(
            req.params.id, 
            { title, author, content }, 
            { new: true } // Ye naya updated data return karega
        );

        if (!updatedBlog) return res.status(404).json({ success: false, message: "Blog not found" });
        res.status(200).json({ success: true, message: "Blog updated successfully!" });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ==========================================
// 🗑️ DELETE A BLOG
// ==========================================
app.delete('/api/blogs/:id', async (req, res) => {
    try {
        const { adminPassword } = req.body; // Delete request me bhi password bhejenge
        
        // Check Admin Password
        if (adminPassword !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ success: false, message: "Unauthorized Hacker! 🚨" });
        }

        const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
        
        if (!deletedBlog) return res.status(404).json({ success: false, message: "Blog not found" });
        res.status(200).json({ success: true, message: "Blog deleted successfully!" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Route 5: Verify Admin Password
app.post('/api/verify-admin', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_SECRET) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});
// DATA BREACH API ROUTE (Smart Version 🧠)
app.get('/api/breach/:email', async (req, res) => {
    try {
        const userEmail = req.params.email;
        const response = await fetch(`https://api.xposedornot.com/v1/check-email/${userEmail}`);
        
        // Agar seedha 404 aaye, toh 100% safe
        if (response.status === 404) {
            return res.status(200).json({ safe: true });
        } 
        
        const data = await response.json();
      
        // Data me se breaches ki list nikalna
        let breachesArray = [];
        if (data.breaches && Array.isArray(data.breaches)) {
            breachesArray = data.breaches.flat();
        }

        // 🚨 ASLI LOGIC: Agar list mein ek bhi naam hai, tabhi Unsafe maano!
        if (breachesArray.length > 0) {
            return res.status(200).json({ safe: false, breaches: breachesArray });
        } else {
            // Agar list khaali aayi hai, toh matlab email SAFE hai
            return res.status(200).json({ safe: true });
        }

    } catch (error) {
        console.error("Breach API Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
});
// --- BLOG SECTION END ---
// ==========================================
// 📰 CYBER NEWS SCHEMA & MODEL
// ==========================================
const newsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    summary: { type: String, required: true },
    fullDetails: { type: String, required: true },
    type: { type: String, required: true },
    imageUrl: { type: String },
    status: { type: String, default: 'pending' }, // 🔥 NAYA FIELD: By default 'pending' rahega
    date: { type: Date, default: Date.now }
});

const News = mongoose.model('News', newsSchema);

// --- 1. GET APPROVED NEWS (For Public) ---
app.get('/api/news', async (req, res) => {
    try {
        // Sirf wahi news dikhegi jo 'approved' hai
        const news = await News.find({ status: 'approved' }).sort({ date: -1 }); 
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching news" });
    }
});

// --- 2. GET ALL NEWS (For Admin - Includes Pending) ---
app.post('/api/news/admin', async (req, res) => {
    try {
        if (req.body.adminPassword !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ success: false, message: "Unauthorized!" });
        }
        const news = await News.find().sort({ date: -1 }); // Admin ko sab dikhega
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- 3. POST NEW NEWS (Public & Admin) ---
app.post('/api/news', async (req, res) => {
    try {
        const { adminPassword, title, summary, fullDetails, type, imageUrl } = req.body;
        
        // Agar admin ne daala hai toh direct 'approved', warna 'pending'
        let status = 'pending';
        if (adminPassword === process.env.ADMIN_SECRET) {
            status = 'approved'; 
        }

        const newNews = new News({ title, summary, fullDetails, type, imageUrl, status });
        await newNews.save();
        res.status(201).json({ success: true, message: status === 'approved' ? "News Live!" : "Sent for verification!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- 4. APPROVE NEWS (Admin Only) ---
app.put('/api/news/approve/:id', async (req, res) => {
    try {
        if (req.body.adminPassword !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ success: false, message: "Unauthorized!" });
        }
        await News.findByIdAndUpdate(req.params.id, { status: 'approved' });
        res.status(200).json({ success: true, message: "News Approved & Live!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- 5. DELETE NEWS (Admin Only) ---
app.delete('/api/news/:id', async (req, res) => {
    try {
        if (req.body.adminPassword !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ success: false, message: "Unauthorized!" });
        }
        await News.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "News deleted!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
// ==========================================
// 💬 COMMUNITY CHAT SCHEMA & ROUTES
// ==========================================
const chatSchema = new mongoose.Schema({
    sender: { type: String, required: true, default: "Anonymous" },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

// --- GET CHAT MESSAGES (Pichle 100 messages fetch karega) ---
app.get('/api/chat', async (req, res) => {
    try {
        // Sort by timestamp ascending (purane pehle, naye neeche)
        const messages = await Chat.find().sort({ timestamp: 1 }).limit(100); 
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching chats" });
    }
});

// --- POST NEW MESSAGE ---
app.post('/api/chat', async (req, res) => {
    try {
        const { sender, message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: "Message is required" });

        const newChat = new Chat({ 
            sender: sender || "Anonymous User", 
            message 
        });
        await newChat.save();
        res.status(201).json({ success: true, message: "Message sent!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
