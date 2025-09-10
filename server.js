const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// static fayllar uchun (frontend)
app.use(express.static(path.join(__dirname, "frontend"))); 

// ====== MongoDB ulash ======
const connectDB = async () => {
  try {
    // MongoDB Atlas connection string
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.log("⚠️ MONGODB_URI environment variable topilmadi");
      console.log("🚀 Server MongoDB bozmda ishlayapti (test rejimi)");
      return;
    }
    
    console.log("🔗 MongoDB ga ulanishga harakat qilinmoqda...");
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    
    console.log("✅ MongoDB muvaffaqiyatli ulandi:", conn.connection.host);
    console.log("📊 Database:", conn.connection.name);
  } catch (err) {
    console.error("❌ MongoDB ulanishida xato:", err.message);
    console.log("⚠️ Server MongoDB bo'ymoganda ishlaydi (test rejimi)");
    console.log("📝 Environment variables:");
    console.log("   - NODE_ENV:", process.env.NODE_ENV);
    console.log("   - MONGODB_URI:", process.env.MONGODB_URI ? "Mavjud" : "Yo'q");
  }
};

connectDB();

// ====== Schema & Model ======
const OrderSchema = new mongoose.Schema({
  ism: String,
  yosh: Number,
  tugilgan_sana: Date,
  telefon: String,
  tabriklovchilar: String,
  asosiy: String,
  murojaat: String,
  qoshiq: String,
  buyurtmachi_telefon: String,
  createdAt: { type: Date, default: Date.now }
});

const MediaSchema = new mongoose.Schema({
  text: String,
  audioUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model("Order", OrderSchema);
const Media = mongoose.model("Media", MediaSchema);

// ====== API marshrutlar ======

// --- BUYURTMALAR ---
app.get("/api/orders", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Orders olishda xato:", err.message);
    res.json([]);
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log("📝 MongoDB ulanmagan, buyurtma console da ko'rsatiladi:");
      console.log(req.body);
      return res.json({ message: "✅ Buyurtma qabul qilindi (test rejimi)", order: req.body });
    }
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.json({ message: "✅ Buyurtma qabul qilindi", order: newOrder });
  } catch (err) {
    console.error("Buyurtma saqlashda xato:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "🗑️ Buyurtma o‘chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MEDIA ---
app.get("/api/media", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const medias = await Media.find().sort({ createdAt: -1 });
    console.log("📋 Media so'raldi:", medias.length, "ta");
    res.json(medias);
  } catch (err) {
    console.error("❌ Media olishda xato:", err.message);
    res.json([]);
  }
});

app.post("/api/media", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log("📺 MongoDB ulanmagan, media console da ko'rsatiladi:");
      console.log({ text: req.body.text ? 'Mavjud' : 'Yo\'q', audio: req.body.audioUrl ? 'Mavjud' : 'Yo\'q' });
      return res.json({ message: "✅ Media qo'shildi (test rejimi)", media: req.body });
    }
    console.log("📺 Yangi media keldi:", { text: req.body.text ? 'Mavjud' : 'Yo\'q', audio: req.body.audioUrl ? 'Mavjud' : 'Yo\'q' });
    const newMedia = new Media(req.body);
    await newMedia.save();
    console.log("✅ Media saqlandi:", newMedia._id);
    res.json({ message: "✅ Media qo'shildi", media: newMedia });
  } catch (err) {
    console.error("❌ Media saqlashda xato:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/media/:id", async (req, res) => {
  try {
    await Media.findByIdAndDelete(req.params.id);
    console.log("🗑️ Media o'chirildi:", req.params.id);
    res.json({ message: "🗑️ Media o'chirildi" });
  } catch (err) {
    console.error("❌ Media o'chirishda xato:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/media/:id", async (req, res) => {
  try {
    const updatedMedia = await Media.findByIdAndUpdate(req.params.id, req.body, { new: true });
    console.log("✏️ Media yangilandi:", req.params.id);
    res.json({ message: "✏️ Media yangilandi", media: updatedMedia });
  } catch (err) {
    console.error("❌ Media yangilashda xato:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- default route ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// --- health check ---
app.get("/health", (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    mongodb: mongoStatus,
    message: mongoStatus === 'connected' ? 'Database connected' : 'Running without database (test mode)'
  });
});

// --- serverni ishga tushirish ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server http://localhost:${PORT} da ishlayapti`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Port: ${PORT}`);
});


