const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const SocketIo = require('socket.io');

const join = require('./socket/join.js');
const message = require('./socket/message.js');
const reaction = require('./socket/reaction.js');
var path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = SocketIo(server, {
  maxHttpBufferSize: 1e8
});

io.on('connection', (socket) => {
  console.log('Client connecté :', socket.id);

  join.handleConnection(socket);

  message.handleConnection(socket,io);
  reaction.handleConnection(socket,io);

  socket.on('disconnect', () => {
    console.log('Client déconnecté :', socket.id);
  });
});

module.exports={io};

const userRoutes = require('./api/user.js'); // Importez les routes utilisateur depuis le fichier user.js
const conversationRoutes = require('./api/conversation.js');
const messageRoutes = require('./api/message.js');
const amisRoutes = require('./api/amis.js');
const reactionRoutes = require('./api/reaction.js');
const postRoutes = require('./api/post.js');
const pouirealRoutes = require('./api/pouireal.js');

app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));



app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Autoriser toutes les origines
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Autoriser les méthodes
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Autoriser les en-têtes
  next();
});
app.use('/uploads', express.static('uploads'));
app.use('/uploads', (req, res, next) => {
  const imagePath = path.join(__dirname, 'uploads', req.url); // Chemin de l'image demandée
  if (fs.existsSync(imagePath)) {
    const oneYearInSeconds = 5*60; // 5 minutes
    res.set('Cache-Control', `public, max-age=${oneYearInSeconds}`);
  }
  next();
});

app.use('/api', (req, res, next) => {
  res.header('Content-Type', 'application/json; charset=utf-8');
  next();
});


app.use('/api/user/', userRoutes);
app.use('/api/conv/', conversationRoutes);
app.use('/api/message/', messageRoutes);
app.use('/api/amis/', amisRoutes);
app.use('/api/reaction/', reactionRoutes);
app.use('/api/post/',postRoutes);
app.use('/api/pouireal/',pouirealRoutes)




const PORT = (process.env.API_PORT != undefined)?process.env.API_PORT:3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
