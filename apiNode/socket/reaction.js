const { db } = require('../db');
const { authenticateTokenSocket } = require('../middleware');
const jwt = require('jsonwebtoken');
const { SECRET_KEY, uploadFile} = require('../constantes.js');

const {sendNotif}= require("../FireBaseNotification.js");

module.exports = {
    handleConnection: (socket,io) => {

        socket.on('setReaction', (data) => {
            handlesetReaction(socket, data,io);
        });
        socket.on('deleteReaction', (data) => {
            handledeleteReaction(socket, data,io);
        });
    },
};

async function handlesetReaction(socket,data,io){
    try {
        const isAuthenticated = await authenticateTokenSocket(data.token);
        if (!isAuthenticated) {
            console.error('Erreur : token invalide');
            return;
        }

        const decodedToken = jwt.verify(data.token, SECRET_KEY);
        const uniquePseudo = decodedToken.uniquePseudo;

        const query = 'call setReaction(?,?,?);';
        db.query(query, [data.messgaeId,uniquePseudo, data.reaction], (err, result) => {
            if (err) {
                console.error('Erreur lors de la création de la reaction:', err);
            } else {
                let message = result[0][0];
                io.to(`conversation:${data.conversationId}`).emit('recevoirReaction', {message});
                sendAllNotif(data.conversationId,message)

            }
        });
    } catch (error) {
        console.error('Erreur lors de la vérification du token :', error.message);
    }
}
async function handledeleteReaction(socket,data,io){
    try {
        const isAuthenticated = await authenticateTokenSocket(data.token);
        if (!isAuthenticated) {
            console.error('Erreur : token invalide');
            return;
        }

        const decodedToken = jwt.verify(data.token, SECRET_KEY);
        const uniquePseudo = decodedToken.uniquePseudo;

        const query = 'DELETE FROM `discution`.`reactions` WHERE (`user_uniquePseudo` = ?) and (`message_id` = ?);';
        db.query(query, [uniquePseudo,data.messgaeId], (err, result) => {
            if (err) {
                console.error('Erreur lors de la création de la reaction:', err);
            } else {
                let messgaeId = data.messgaeId;
                io.to(`conversation:${data.conversationId}`).emit('recevoirdeleteReaction', {uniquePseudo,messgaeId});
            }
        });
    } catch (error) {
        console.error('Erreur lors de la vérification du token :', error.message);
    }
}

function sendAllNotif(conversationId,message){
    const query = "select c.name,u.tokenFireBase from user u join `user-conversation` uc on u.uniquePseudo=uc.uniquePseudo_user join conversation c on uc.id_conversation=c.id where uc.id_conversation=?;";
    db.query(query, [conversationId], (err, result) => {
      if (err) {
        console.error('Erreur lors de la recherche du nombre de message non lu :', err);
      } else {
        for(const usersToken of result){
          if(usersToken.tokenFireBase!=null){
            sendNotif(usersToken.name,message.pseudo+" a réagi "+message.emoji,usersToken.tokenFireBase)
          }
        }
      }
    });
    
  }