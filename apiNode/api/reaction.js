const express = require('express');
const jwt = require('jsonwebtoken');
const { dbConnexion } = require('../db'); // Importez votre connexion à la base de données depuis le fichier db.js
const { io } = require('../pouic_serveur.js');

const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const { LIGNE_PAR_PAGES, SECRET_KEY, uploadFile } = require('../constantes.js');
const { authenticateToken } = require('../middleware.js');


async function isInConv(token, id_conversation, parametre, func) {
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;
    const query = "select * from `user-conversation` where uniquePseudo_user=? and id_conversation=?";
    const db = await dbConnexion();
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
    db.end();
}

router.post('', [
    body('id_message').notEmpty().withMessage('id_message requis'),
    body('emoji').notEmpty().withMessage('emoji requis'),
    authenticateToken
], async (req, res) => {
    const { id_message, emoji, id_conversation } = req.body;

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;

    
    const db = await dbConnexion();

    if (id_conversation != undefined) {
        const parametre = {
            id_message,
            emoji,
            uniquePseudo,
            id_conversation,
            res
        }

        isInConv(token, id_conversation, parametre, postReaction);
    } else {
        const selectQuery = 'SELECT * FROM reactions WHERE message_id = ? AND user_uniquePseudo = ?';
        db.query(selectQuery, [id_message, uniquePseudo], (err, rows) => {
            if (err) {
                console.error('Erreur lors de la vérification de la réaction existante :', err);
                res.status(500).json({ message: 'Erreur lors de la vérification de la réaction existante' });
            } else {
                // Si la réaction existe, la supprimer
                if (rows.length > 0) {
                    const deleteQuery = 'DELETE FROM reactions WHERE message_id = ? AND user_uniquePseudo = ?';
                    db.query(deleteQuery, [id_message, uniquePseudo], (err, result) => {
                        if (err) {
                            console.error('Erreur lors de la suppression de la réaction existante :', err);
                            res.status(500).json({ message: 'Erreur lors de la suppression de la réaction existante' });
                        }
                    });
                }

                // Insérer la nouvelle réaction
                const insertQuery = 'INSERT INTO reactions (message_id, user_uniquePseudo, emoji) VALUES (?, ?, ?)';
                db.query(insertQuery, [id_message, uniquePseudo, emoji], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de l\'ajout de la réaction :', err);
                        res.status(500).json({ message: 'Erreur lors de l\'ajout de la réaction' });
                    } else {
                        const deleteQuery = 'Select * FROM user WHERE uniquePseudo = ?';
                        db.query(deleteQuery, [uniquePseudo], (err, result) => {
                            if (err) {
                                console.error('Erreur lors de l\'ajout de la réaction :', err);
                                res.status(500).json({ message: 'Erreur lors de l\'ajout de la réaction' });
                            } else {
                                res.status(201).json({ message: 'Réaction ajoutée avec succès' });
                            }
                        });

                    }
                });
            }
        });
    }
    db.end();


});

const postReaction = async function (parametre) {
    const db = await dbConnexion();
    // Vérifier si la réaction existe déjà pour cet utilisateur et ce message
    const selectQuery = 'SELECT * FROM reactions WHERE message_id = ? AND user_uniquePseudo = ?';
    db.query(selectQuery, [parametre.id_message, parametre.uniquePseudo], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la vérification de la réaction existante :', err);
            parametre.res.status(500).json({ message: 'Erreur lors de la vérification de la réaction existante' });
        } else {
            // Si la réaction existe, la supprimer
            if (rows.length > 0) {
                const deleteQuery = 'DELETE FROM reactions WHERE message_id = ? AND user_uniquePseudo = ?';
                db.query(deleteQuery, [parametre.id_message, parametre.uniquePseudo], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de la suppression de la réaction existante :', err);
                        parametre.res.status(500).json({ message: 'Erreur lors de la suppression de la réaction existante' });
                    }
                });
            }

            // Insérer la nouvelle réaction
            const insertQuery = 'INSERT INTO reactions (message_id, user_uniquePseudo, emoji) VALUES (?, ?, ?)';
            db.query(insertQuery, [parametre.id_message, parametre.uniquePseudo, parametre.emoji], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'ajout de la réaction :', err);
                    parametre.res.status(500).json({ message: 'Erreur lors de l\'ajout de la réaction' });
                } else {
                    const deleteQuery = 'Select * FROM user WHERE uniquePseudo = ?';
                    db.query(deleteQuery, [parametre.uniquePseudo], (err, result) => {
                        if (err) {
                            console.error('Erreur lors de l\'ajout de la réaction :', err);
                            parametre.res.status(500).json({ message: 'Erreur lors de l\'ajout de la réaction' });
                        } else {
                            io.to(`conversation:${parametre.id_conversation}`).emit('newReaction', { 'id_message': parametre.id_message, 'emoji': parametre.emoji, 'user': JSON.stringify(result[0]) });
                            parametre.res.status(201).json({ message: 'Réaction ajoutée avec succès' });
                        }
                    });

                }
            });
        }
    });
    db.end();
}

router.get('', [
    query('message_id').notEmpty().withMessage('message_id requis'),
    query('page').notEmpty().withMessage('page requis'),
    authenticateToken
], async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({ error: error.array() });
    }
    var { message_id, page } = req.query;
    var nbr_ligne = page * LIGNE_PAR_PAGES;

    const query = 'call getReaction(?,?,?);';
    const db = await dbConnexion();
    db.query(query, [message_id, LIGNE_PAR_PAGES, nbr_ligne], (err, result) => {
        if (err) {
            console.error('Erreur lors de la creation du message:', err);
            res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la creation du message' }));
        } else {
            res.status(201).send(JSON.stringify(result[0]));
        }
    });
    db.end();
});

router.delete('', [
    body('id_message').notEmpty().withMessage('id_message requis'),
    authenticateToken
], async (req, res) => {
    const { id_message } = req.body;

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;

    const db = await dbConnexion();

    const selectQuery = 'delete from reactions where message_id=? and user_uniquePseudo=?';
    db.query(selectQuery, [id_message, uniquePseudo], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la vérification de la réaction existante :', err);
            res.status(500).json({ message: 'Erreur lors de la vérification de la réaction existante' });
        } else {
            res.status(201).json({ message: 'Réaction supprimé avec succès' });
        }
    });
    db.end();


});
module.exports = router;