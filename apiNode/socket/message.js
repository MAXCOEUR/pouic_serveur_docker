const { dbConnexion } = require('../db');
const { authenticateTokenSocket } = require('../middleware');
const jwt = require('jsonwebtoken');
const { SECRET_KEY, uploadFile} = require('../constantes.js');

const {sendNotif}= require("../FireBaseNotification.js");

module.exports = {
    handleConnection: (socket,io) => {

        socket.on('envoyerMessage', (data) => {
            handleMessage(socket, data,io);
        });

        socket.on('luAllMessage', (data) => {
            handleLuAllMessage(socket, data);
        });

        socket.on('luMessage', (data) => {
            handleLuMessage(socket, data);
        });
        socket.on('updateMessageNonLu', (data) => {
            handleupdateMessageNonLu(socket, data,io);
        });
    },
};
async function handleMessage(socket, data,io) {
    try {
        const isAuthenticated = await authenticateTokenSocket(data.token);
        if (!isAuthenticated) {
            console.error('Erreur : token invalide');
            return;
        }

        const decodedToken = jwt.verify(data.token, SECRET_KEY);
        const uniquePseudo = decodedToken.uniquePseudo;

        const query = 'call CreateMessage(?,?,?,?);';
        const db = dbConnexion();
        db.query(query, [uniquePseudo, data.conversationId, data.messageText,data.id_parent], (err, result) => {
            if (err) {
                console.error('Erreur lors de la création du message:', err);
            } else {
                let message = result[0][0];
                io.to(`conversation:${data.conversationId}`).emit('recevoirMessage', {message});
                sendAllNotif(data.conversationId,message)
            }
            db.end();
        });
    } catch (error) {
        console.error('Erreur lors de la vérification du token :', error.message);
    }
};
async function handleLuAllMessage(socket, data) {
    const decodedToken = jwt.verify(data.token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;
  
    const query = 'CALL MarkAllUnreadMessagesAsRead(?, ?);';
    const db = dbConnexion();
    db.query(query, [data.conversationId, uniquePseudo], (err, result) => {
      if (err) {
        console.error('Erreur lors de la creation du message:', err);
      } else {
        console.log("luAllMessage "+uniquePseudo+" : "+data.conversationId);
      }
      db.end();
    });
}
async function handleLuMessage(socket, data) {
    const decodedToken = jwt.verify(data.token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;
  
    const query = 'insert into `message-read` (id_message,uniquePseudo_user) values(?,?);';
    const db = dbConnexion();
    db.query(query, [data.messageId, uniquePseudo], (err, result) => {
      if (err) {
        console.error('Erreur lors de la creation du message:', err);
      } else {
        console.log("luAllMessage "+uniquePseudo+" : "+data.messageId);
      }
      db.end();
    });
}
async function handleupdateMessageNonLu(socket,data,io){
    const decodedToken = jwt.verify(data.token, SECRET_KEY);
    const myUniquePseudo = decodedToken.uniquePseudo;
    const query = "select sum(unread) unread from `user-conversation` uc left join ( 	SELECT m.id_conversation, COUNT(m.id) - IFNULL(COUNT(r.id_message), 0) AS unread     FROM messages m     LEFT JOIN `message-read` r ON m.id = r.id_message     AND r.uniquePseudo_user = ?     GROUP BY m.id_conversation)cc on uc.id_conversation=cc.id_conversation where uc.uniquePseudo_user=? group by uc.uniquePseudo_user;";
    const db = dbConnexion();
    db.query(query, [myUniquePseudo, myUniquePseudo], (err, result) => {
    if (err) {
      console.error('Erreur lors de la recherche du nombre de message non lu :', err);
    } else {
        let unread 
        if(result.length==0){
          unread=0;
        }else{
          unread = parseInt(result[0].unread);
        }
        io.to(`user:${myUniquePseudo}`).emit('updateMessageNonLu', {unread});
    }
    db.end();
  });
}

async function sendAllNotif(conversationId,message){
  const query = "select c.name,u.tokenFireBase from user u join `user-conversation` uc on u.uniquePseudo=uc.uniquePseudo_user join conversation c on uc.id_conversation=c.id where uc.id_conversation=?;";
  const db = dbConnexion();
  db.query(query, [conversationId], (err, result) => {
    if (err) {
      console.error('Erreur lors de la recherche du nombre de message non lu :', err);
    } else {
      for(const usersToken of result){
        if(usersToken.tokenFireBase!=null){
          sendNotif(usersToken.name,message.pseudo+": "+message.Message,usersToken.tokenFireBase)
        }
      }
    }
    db.end();
  });
  
}