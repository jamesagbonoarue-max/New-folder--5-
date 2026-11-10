const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

const envConfig = dotenv.config();
for (const [key, value] of Object.entries(envConfig.parsed || {})) {
  if (!process.env[key]) process.env[key] = value;
}

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const newsRoutes = require('./routes/newsRoutes');
const eventRoutes = require('./routes/eventRoutes');
const clubRoutes = require('./routes/clubRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://school-blog-app.vercel.app',
  'https://new-folder-5-olcz.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean).map((origin) => origin.replace(/\/+$/, ''));

const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const requested = new URL(origin);
    return allowedOrigins.some((configuredOrigin) => {
      const configured = new URL(configuredOrigin);
      const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
      return requested.protocol === configured.protocol &&
        requested.hostname === configured.hostname &&
        requested.port === configured.port;
    });
  } catch {
    return false;
  }
};

app.use(cors({
  origin(origin, callback) {
    console.log('[backend-cors]', { origin, allowedOrigins, allowed: !origin ? 'no-origin' : isAllowedOrigin(origin) });
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'De Genius Talents International School API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/uploads', uploadRoutes);

app.use((err, req, res, next) => {
  console.error('[backend-error]', {
    method: req.method,
    url: req.originalUrl,
    status: err.statusCode || (err.name === 'MulterError' ? 400 : 500),
    message: err.message,
    stack: err.stack,
  });
  const status = err.statusCode || (err.name === 'MulterError' ? 400 : 500);
  res.status(status).json({ message: status === 500 ? 'Something went wrong on the server.' : err.message });
});

connectDB().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}).catch((error) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
