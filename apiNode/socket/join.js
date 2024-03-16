// socketEvents.js
const { db } = require('../db'); // Importez db depuis le fichier correspondant

module.exports = {
    handleConnection: (socket) => {
        console.log('Client connecté :', socket.id);

        socket.on('joinConversations', (data) => {
            handleJoinConversations(socket, data);
        });

        socket.on('joinConversation', (data) => {
            handleJoinConversation(socket, data);
        });

        socket.on('leaveConversation', (data) => {
            handleLeaveConversation(socket, data);
        });

        socket.on('leaveConversations', (data) => {
            handleLeaveConversations(socket, data);
        });
    },
};

function handleJoinConversations(socket, data) {
    console.log('joinConversations :', data.uniquePseudo);
    socket.join(`user:${data.uniquePseudo}`);
    const query = 'select c.id from conversation c join `user-conversation` uc on c.id=uc.id_conversation Where uc.uniquePseudo_user=?';
    db.query(query, [data.uniquePseudo], (err, result) => {
        if (err) {
            console.error('Erreur lors de la création du message:', err);
        } else {
            for (let i = 0; i < result.length; i++) {
                socket.join(`conversation:${result[i].id}`);
            }
        }
    });
}

function handleJoinConversation(socket, data) {
    console.log('joinConversation :', data.idConversation);
    socket.join(`conversation:${data.idConversation}`);
}

function handleLeaveConversation(socket, data) {
    console.log('leaveConversation :', data.idConversation);
    socket.leave(`conversation:${data.idConversation}`);
}

function handleLeaveConversations(socket, data) {
    console.log('leaveConversation :', data.uniquePseudo);
    socket.leave(`user:${data.uniquePseudo}`);
    const query = 'select c.id from conversation c join `user-conversation` uc on c.id=uc.id_conversation Where uc.uniquePseudo_user=?';
    db.query(query, [data.uniquePseudo], (err, result) => {
        if (err) {
            console.error('Erreur lors de la création du message:', err);
        } else {
            for (let i = 0; i < result.length; i++) {
                socket.leave(`conversation:${result[i].id}`);
            }
        }
    });
}