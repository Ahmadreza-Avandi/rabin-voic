const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const aiRoutes = require('./routes/ai');
const ttsRoutes = require('./routes/tts');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/tts', ttsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'دستیار رابین آماده است' });
});

app.listen(PORT, () => {
  console.log(`🤖 دستیار رابین در پورت ${PORT} در حال اجرا است`);
});