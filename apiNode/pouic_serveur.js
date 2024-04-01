const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const SocketIo = require("socket.io");
const moment = require('moment-timezone');
const { dbConnexion } = require("./db");
const { sendNotif } = require("./FireBaseNotification");

const join = require("./socket/join.js");
const message = require("./socket/message.js");
const reaction = require("./socket/reaction.js");
var path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = SocketIo(server, {
  maxHttpBufferSize: 1e8,
});

io.on("connection", (socket) => {
  console.log("Client connecté :", socket.id);

  join.handleConnection(socket);

  message.handleConnection(socket, io);
  reaction.handleConnection(socket, io);

  socket.on("disconnect", () => {
    console.log("Client déconnecté :", socket.id);
  });
});

module.exports = { io };

const userRoutes = require("./api/user.js"); // Importez les routes utilisateur depuis le fichier user.js
const conversationRoutes = require("./api/conversation.js");
const messageRoutes = require("./api/message.js");
const amisRoutes = require("./api/amis.js");
const reactionRoutes = require("./api/reaction.js");
const postRoutes = require("./api/post.js");
const pouirealRoutes = require("./api/pouireal.js");

app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "20mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Autoriser toutes les origines
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE"); // Autoriser les méthodes
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Autoriser les en-têtes
  next();
});
app.use("/uploads", express.static("uploads"));
app.use("/uploads", (req, res, next) => {
  const imagePath = path.join(__dirname, "uploads", req.url); // Chemin de l'image demandée
  if (fs.existsSync(imagePath)) {
    const oneYearInSeconds = 5 * 60; // 5 minutes
    res.set("Cache-Control", `public, max-age=${oneYearInSeconds}`);
  }
  next();
});

app.use("/api", (req, res, next) => {
  res.header("Content-Type", "application/json; charset=utf-8");
  next();
});

app.use("/api/user/", userRoutes);
app.use("/api/conv/", conversationRoutes);
app.use("/api/message/", messageRoutes);
app.use("/api/amis/", amisRoutes);
app.use("/api/reaction/", reactionRoutes);
app.use("/api/post/", postRoutes);
app.use("/api/pouireal/", pouirealRoutes);

const PORT = process.env.API_PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
  getLastDate();
});


function getLastDate(){
  const query = "SELECT * FROM timePouireal WHERE id = (SELECT MAX(id) FROM timePouireal);";
  const db = dbConnexion();
  db.query(query, [], (err, result) => {
    if (err) {
      console.error("Erreur lors de la date du pouireal:", err);
      reject(err);
    } else {
      var date
      if(result.length==1){
        date = new Date(result[0]["date"]);
      }
      else{
        date = new Date(0);
      }

      var dateNow = moment().tz('Europe/Paris').toDate();

      if (date < dateNow) {
        let heureAleatoire;
        let delai;

        // Génération d'une date pour le lendemain
        const dateLendemain = new Date(dateNow);
        dateLendemain.setHours(0); 
        dateLendemain.setMinutes(0); 
        dateLendemain.setSeconds(0); 
        dateLendemain.setDate(dateLendemain.getDate() + 1);
        
        // Génération d'une heure aléatoire entre 6h et 0h du matin
        const minuteAleatoire = 21600 + Math.floor(Math.random() * 64800);
        heureAleatoire = new Date(dateLendemain);
        heureAleatoire.setHours(Math.floor(minuteAleatoire / 3600)); 
        heureAleatoire.setMinutes(Math.floor((minuteAleatoire % 3600) / 60)); 
        heureAleatoire.setSeconds(minuteAleatoire % 60); 

        // Calcul du délai jusqu'à cette heure aléatoire
        delai = heureAleatoire.getTime() - dateNow.getTime();
    
        const query = "insert into timePouireal (date) values (?);";
        const db2 = dbConnexion();
        db2.query(query, [heureAleatoire], (err, result) => {
          if (err) {
            console.error("Erreur lors de la date du pouireal:", err);
            reject(err);
          } else {
            setTimeout(notificationPouireal, delai);
          }
          db2.end();
        });
    }
    else{
      delai = date.getTime() - dateNow.getTime();
      console.log("seconde ",delai / 1000);
      console.log("minute ",delai / (1000 * 60));
      setTimeout(notificationPouireal, delai);
    }
    }
    db.end();
  });
}

function notificationPouireal() {
  console.log("notificationPouireal");
  const query = "select * from user";
  const db = dbConnexion();
  db.query(query, [], (err, result) => {
    if (err) {
      console.error('Erreur lors de la recherche du nombre de message non lu :', err);
    } else {
      for(const usersToken of result){
        if(usersToken.tokenFireBase!=null){
          sendNotif("c'est l'heure du pouireal","😁😁 c'est l'heure du pouireal 🔔🔔",usersToken.tokenFireBase)
        }
      }
    }
    db.end();
  });
  getLastDate();
}
