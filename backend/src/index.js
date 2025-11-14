require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const logsRouter = require('./routes/logs');
const alertsRouter = require('./routes/alerts');
const usersRouter = require('./routes/users');
const dashboardRouter = require('./routes/dashboard');
const searchRouter = require('./routes/search');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

connectDB();

app.set('io', io);

app.use('/api/logs', logsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/users', usersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/search', searchRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});