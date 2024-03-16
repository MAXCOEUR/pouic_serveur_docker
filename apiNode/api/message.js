const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../db'); // Importez votre connexion à la base de données depuis le fichier db.js
const { io } = require('../pouic_serveur.js');
const fs = require('fs');

const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const { LIGNE_PAR_PAGES, SECRET_KEY, uploadFile } = require('../constantes.js');
const { authenticateToken } = require('../middleware.js');
const { json } = require('body-parser');
var path = require('path');


function isInConv(token, id_conversation, parametre, func) {
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;
    const query = "select * from `user-conversation` where uniquePseudo_user=? and id_conversation=?";
    db.query(query, [uniquePseudo, id_conversation], (err, result) => {
        if (err) {
            console.error('Erreur lors  :', err);
            return false;
        } else {
            if (result.length === 0) {
                console.log('l utilisateur n est pas dans la conversation');
                parametre.res.status(500).send(JSON.stringify({ 'message': 'l utilisateur n est pas dans la conversation' }));
            } else {
                func(parametre);
            }
        }
    });
}

function isSenderMessage(token, id_message, parametre, func) {
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;
    const query = "select * from messages where id=? and uniquePseudo_sender=?";
    db.query(query, [id_message, uniquePseudo], (err, result) => {
        if (err) {
            console.error('Erreur lors  :', err);
            return false;
        } else {
            if (result.length === 0) {
                console.log('l utilisateur n est pas le sender du message');
                parametre.res.status(500).send(JSON.stringify({ 'message': 'l utilisateur n est pas le sender du message' }));
            } else {
                func(parametre);
            }
        }
    });
}

router.get('', [
    query('id_conversation').notEmpty().withMessage('id_conversation requis'),
    query('id_lastMessage').notEmpty().withMessage('id_lastMessage requis'),
    authenticateToken
], async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({ error: error.array() });
    }
    var { id_conversation, id_lastMessage } = req.query;

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;

    if (id_lastMessage == 0) {
        const parametre = {
            id_conversation,
            uniquePseudo,
            res
        }

        isInConv(token, id_conversation, parametre, getLastMessage);
    } else {
        const parametre = {
            id_conversation,
            id_lastMessage,
            uniquePseudo,
            res
        }

        isInConv(token, id_conversation, parametre, getMessage);
    }

});
const getMessage = function (parametre) {
    const query = 'call getMessage(?,?,?,?);';
    db.query(query, [parametre.uniquePseudo, parametre.id_conversation, parametre.id_lastMessage, LIGNE_PAR_PAGES], (err, result) => {
        if (err) {
            console.error('Erreur lors de la recuperation des message:', err);
            parametre.res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la recuperation des message' }));
        } else {
            parametre.res.status(201).send(JSON.stringify(result[0]));
        }
    });
}
const getLastMessage = function (parametre) {
    const query = 'call getMessageLast(?,?,?);';
    db.query(query, [parametre.uniquePseudo, parametre.id_conversation, LIGNE_PAR_PAGES], (err, result) => {
        if (err) {
            console.error('Erreur lors de la recuperation des message:', err);
            parametre.res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la recuperation des message' }));
        } else {
            parametre.res.status(201).send(JSON.stringify(result[0]));
        }
    });
}

router.post('', [
    body('id_conversation').notEmpty().withMessage('id_conversation requis'),
    body('message').notEmpty().withMessage('message requis'),
    authenticateToken
], async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({ error: error.array() });
    }
    var { id_conversation, message,id_parent } = req.body;

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;

    const parametre = {
        id_conversation,
        message,
        uniquePseudo,
        id_parent,
        res
    }

    isInConv(token, id_conversation, parametre, postMessage);
});
const postMessage = function (parametre) {
    const query = 'call CreateMessage(?,?,?,?);';
    db.query(query, [parametre.uniquePseudo, parametre.id_conversation, parametre.message, parametre.id_parent], (err, result) => {
        if (err) {
            console.error('Erreur lors de la creation du message:', err);
            parametre.res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la creation du message' }));
        } else {
            parametre.res.status(201).send(JSON.stringify(result[0][0]));
        }
    });
}
router.post('/upload', uploadFile.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send(JSON.stringify({ 'message': 'Aucun fichier téléchargé.' }));
    }
    console.log("fin televersement fichier du message : " + req.body.id_message);
    io.to(`conversation:${req.body.id_conversation}`).emit('EndFile', { 'id_message': parseInt(req.body.id_message), 'name': req.body.namereal, 'fieldname': req.body.fieldname });
    return res.status(200).send(JSON.stringify({ 'message': 'Image téléchargée avec succès.' }));
});


router.delete('', [
    query('id_message').notEmpty().withMessage('id_message requis'),
    authenticateToken
], async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({ error: error.array() });
    }
    var { id_message } = req.query;

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(' ')[1];

    const parametre = {
        id_message,
        res
    }

    isSenderMessage(token, id_message, parametre, deleteMessage);
});
const deleteMessage = function (parametre) {

    const query1 = 'select id_conversation from messages where id=?;';
    db.query(query1, [parametre.id_message], (err, result) => {
        let id_message = parseInt(parametre.id_message);
        if (err) {
            console.error('Erreur lors de la suppression du message:', err);
            parametre.res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la suppression du message' }));
        } else {
            let id_conversation = result[0]["id_conversation"];
            //io.to(`conversation:${id_conversation}`).emit('deleteMessage', { id_message, id_conversation });
            const query = 'select * from file where id_message=?';
            db.query(query, [parametre.id_message], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la suppression des fichier associer au message:', err);
                    parametre.res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la suppression des fichier associer au messgae:' }));
                } else {
                    for (let i = 0; i < result.length; i++) {
                        const row = result[i];
                        const linkFile = row.linkFile;
                        
                        
                        const filePath = path.join(__dirname, '../uploads', 'messages', linkFile);

                        // Vérifiez si le fichier existe avant de tenter de le supprimer
                        if (fs.existsSync(filePath)) {
                            // Supprimez le fichier
                            fs.unlinkSync(filePath);
                            console.log('Fichier supprimé :', filePath);
                        } else {
                            console.log('Le fichier n\'existe pas :', filePath);
                        }
                    }
                    
                    const query = 'delete from messages where id=?;';
                    db.query(query, [parametre.id_message], (err, result) => {
                        if (err) {
                            console.error('Erreur lors de la suppression du message:', err);
                            parametre.res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la suppression du message' }));
                        } else {
                            
                            io.to(`conversation:${id_conversation}`).emit('deleteMessage', { id_message, id_conversation });
                            parametre.res.status(201).json({message:"Successfully Registered"});
                        }
                    });

                }
            });
        }
    });


}


router.put('', [
    query('id_message').notEmpty().withMessage('id_message requis'),
    body('message').notEmpty().withMessage('message requis'),
    authenticateToken
], async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({ error: error.array() });
    }
    var { id_message } = req.query;
    var { message } = req.body;

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(' ')[1];

    const parametre = {
        id_message,
        message,
        res
    }

    isSenderMessage(token, id_message, parametre, putMessage);
});
const putMessage = function (parametre) {
    const newMes = {
        message: parametre.message
    }
    const query1 = 'select id_conversation from messages where id=?;';
    db.query(query1, [parametre.id_message], (err, result) => {
        if (err) {
            console.error('Erreur lors de la suppression du message:', err);
            parametre.res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la suppression du message' }));
        } else {
            let id_conversation = result[0]["id_conversation"];
            let message = parametre.message;
            let id_message = parametre.id_message;
            const query = 'UPDATE messages SET ? where id = ?;';
            db.query(query, [newMes, parametre.id_message], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la modification du message:', err);
                    parametre.res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la modification du message' }));
                } else {
                    io.to(`conversation:${id_conversation}`).emit('editMessage', { id_message, id_conversation, 'message': message });
                    parametre.res.status(201).send(JSON.stringify(result));
                }
            });
        }
    });
}

module.exports = router;