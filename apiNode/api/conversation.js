const express = require('express');
const jwt = require('jsonwebtoken');
const { dbConnexion } = require('../db'); // Importez votre connexion à la base de données depuis le fichier db.js
const {io} = require('../pouic_serveur.js');

const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const { LIGNE_PAR_PAGES, SECRET_KEY, uploadConversationImage } = require('../constantes.js');
const { authenticateToken } = require('../middleware.js');


async function isAdmin(token, id_conversation, parametre, func) {
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const uniquePseudo = decodedToken.uniquePseudo;
  const query = "select * from conversation where uniquePseudo_admin = ? and id=?";
  const db = await dbConnexion();
  db.query(query, [uniquePseudo, id_conversation], (err, result) => {
    if (err) {
      console.error('Erreur lors  :', err);
      return false;
    } else {
      if (result.length === 0) {
        console.log('l utilisateur n est pas administrateur de la conversation');
        parametre.res.status(500).send(JSON.stringify({'message':'l utilisateur n est pas administrateur de la conversation'}));
      } else {
        func(parametre);
      }
    }
  });
  db.end();
}


router.get('', [
  query('search').exists().withMessage('search requis'),
  query('page').notEmpty().withMessage('page requis'),
  authenticateToken
], async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  var { search, page } = req.query;
  var nbr_ligne = page * LIGNE_PAR_PAGES;
  search = (search == undefined) ? "" : search;

  search = "%" + search + "%";

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const uniquePseudo = decodedToken.uniquePseudo;

  const query = "select c.*,COALESCE(cc.unRead, 0) AS unRead "+
    "from (SELECT c.*, MAX(m.date) AS date_dernier_message "+
      "FROM conversation c "+
  	  "LEFT JOIN messages m ON c.id = m.id_conversation "+
    	"GROUP BY 1 ) c "+
    "join `user-conversation` uc on c.id=uc.id_conversation "+
    "left join ( "+
	    "SELECT m.id_conversation, COUNT(m.id) - IFNULL(COUNT(r.id_message), 0) AS unread "+
	    "FROM messages m "+
	    "LEFT JOIN `message-read` r ON m.id = r.id_message AND r.uniquePseudo_user = ? "+
	    "GROUP BY m.id_conversation )cc on c.id=cc.id_conversation "+
    "Where name like ? and uc.uniquePseudo_user=? "+
    "ORDER BY c.date_dernier_message DESC "+
    "LIMIT ? "+
    "OFFSET ?;";
    const db = await dbConnexion();
    db.query(query, [uniquePseudo, search, uniquePseudo, LIGNE_PAR_PAGES, nbr_ligne], (err, result) => {
    if (err) {
      console.error('Erreur lors de la recherche de la conversation :', err);
      res.status(500).send(JSON.stringify({'message':'Erreur lors de la recherche de la conversation'}));
    } else {
      res.status(201).send(JSON.stringify(result));
    }
  });
  db.end();
});

router.get('/user', [
  query('id_conversation').exists().withMessage('id_conversation requis'),
  query('search').exists().withMessage('search requis'),
  query('page').exists().withMessage('page requis'),
  authenticateToken
], async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  var { id_conversation, page, search } = req.query;
  var nbr_ligne = page * LIGNE_PAR_PAGES;
  search = (search == undefined) ? "" : search;

  search = "%" + search + "%";

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const uniquePseudo = decodedToken.uniquePseudo;

  const parametre = {
    id_conversation,
    search,
    nbr_ligne,
    uniquePseudo,
    res
  }
  getConvUser(parametre);
});
const getConvUser = async function (parametre) {
  const query = 'select u.*,CASE WHEN EXISTS (SELECT 1 FROM amis WHERE (demandeur = ? AND receveur = u.uniquePseudo) OR (demandeur = u.uniquePseudo AND receveur = ?)) THEN 1 ELSE 0 END AS sont_amis from `user-conversation` uc join user u on uc.uniquePseudo_user=u.uniquePseudo where uc.id_conversation=? and u.uniquePseudo like ? LIMIT ? OFFSET ?;';
  
  const db = await dbConnexion();
  db.query(query, [parametre.uniquePseudo, parametre.uniquePseudo, parametre.id_conversation, parametre.search, LIGNE_PAR_PAGES, parametre.nbr_ligne], (err, result) => {
    if (err) {
      console.error('Erreur lors de la création de la conversation:', err);
      parametre.res.status(500).send(JSON.stringify({'message':'Erreur lors de la création de la conversation'}));
    } else {
      parametre.res.status(201).send(JSON.stringify(result));
    }
  });
  db.end();
}
router.get('/user/short', [
  query('id_conversation').exists().withMessage('id_conversation requis'),
  authenticateToken
], async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  var { id_conversation } = req.query;

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const parametre = {
    id_conversation,
    res
  }

  isAdmin(token, id_conversation, parametre, getConvUserShort);
});
const getConvUserShort = async function (parametre) {
  const query = 'select uc.uniquePseudo_user from `user-conversation` uc where uc.id_conversation=?;';
  const db = await dbConnexion();
  db.query(query, [parametre.id_conversation], (err, result) => {
    if (err) {
      console.error('Erreur lors de la création de la conversation:', err);
      parametre.res.status(500).send(JSON.stringify({'message':'Erreur lors de la création de la conversation'}));
    } else {
      parametre.res.status(201).send(JSON.stringify(result));
    }
  });
  db.end();
}
// Créer une conversation
router.post('', [
  body('name').notEmpty().withMessage('name requis'),
  authenticateToken
], async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  var { name,extension } = req.body;

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const uniquePseudo = decodedToken.uniquePseudo;

  const query = 'CALL CreateConversation(?,?,?);';
  const db = await dbConnexion();
  db.query(query, new Array(uniquePseudo, name,extension), (err, result) => {
    if (err) {
      console.error('Erreur lors de la création de la conversation:', err);
      res.status(500).send(JSON.stringify({'message':'Erreur lors de la création de la conversation'}));
    } else {
      res.status(201).send(JSON.stringify(result[0][0]));
    }
  });
  db.end();
});
router.post('/upload', uploadConversationImage.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).send(JSON.stringify({'message':'Aucun fichier téléchargé.'}));
  }
  return res.status(200).send(JSON.stringify({'message':'Image téléchargée avec succès.'}));
});

//add user in conversation
router.post('/user', [
  body('uniquePseudo').notEmpty().withMessage('uniquePseudo requis'),
  body('id_conversation').notEmpty().withMessage('id_conversation requis'),
  authenticateToken
], async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  const { uniquePseudo, id_conversation } = req.body;

  const parametre = {
    uniquePseudo,
    id_conversation,
    res
  }

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];

  isAdmin(token, id_conversation, parametre, addUser);
});
const addUser = async function (parametre) {
  const query = 'INSERT INTO `user-conversation` (uniquePseudo_user, id_conversation) VALUES (?, ?);';
  const db = await dbConnexion();
  db.query(query, [parametre.uniquePseudo, parametre.id_conversation], (err, result) => {
    if (err) {
      console.error('Erreur lors de la création de la conversation:', err);
      parametre.res.status(500).send(JSON.stringify({'message':'Erreur lors de la création de la conversation'}));
    } else {
      const query = 'select * from conversation where id=?';
      db.query(query, [parametre.id_conversation], (err, result) => {
        if (err) {
          console.error('Erreur lors de la création de la conversation:', err);
          parametre.res.status(500).send(JSON.stringify({'message':'Erreur lors de la création de la conversation'}));
        } else{
          var conversation=result[0];
          io.to(`user:${parametre.uniquePseudo}`).emit('newConversation', {conversation});
          parametre.res.status(201).send(JSON.stringify(result));
        }
      });
      
    }
  });
  db.end();
}
router.delete('/user', [
  query('uniquePseudo').notEmpty().withMessage('uniquePseudo requis'),
  query('id_conversation').notEmpty().withMessage('id_conversation requis'),
  authenticateToken
], async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  const { uniquePseudo, id_conversation } = req.query;

  const parametre = {
    uniquePseudo,
    id_conversation,
    res
  }

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];

  isAdmin(token, id_conversation, parametre, deleteUser);


});
router.delete('/user/me', [
  query('id_conversation').notEmpty().withMessage('id_conversation requis'),
  authenticateToken
], async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  const { id_conversation } = req.query;

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const uniquePseudo = decodedToken.uniquePseudo;

  const parametre = {
    uniquePseudo,
    id_conversation,
    res
  }

  deleteUser(parametre);

});
const deleteUser = async function (parametre) {
  const query = 'delete from `user-conversation` where id_conversation=? and uniquePseudo_user=?;';
  const db = await dbConnexion();
  db.query(query, [parametre.id_conversation, parametre.uniquePseudo], (err, result) => {
    if (err) {
      console.error('Erreur lors de la suppression du user:', err);
      parametre.res.status(500).send(JSON.stringify({'message':'Erreur lors de la suppression du user'}));
    } else {
      let id_conversation = parametre.id_conversation;
      io.to(`user:${parametre.uniquePseudo}`).emit('deleteConversation', {id_conversation});
      parametre.res.status(201).send(JSON.stringify(result));
    }
  });
  db.end();
}
router.delete('', [
  query('id_conversation').notEmpty().withMessage('id_conversation requis'),
  authenticateToken
], async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  const { id_conversation } = req.query;
  const parametre = {
    id_conversation,
    res
  }

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];

  isAdmin(token, id_conversation, parametre, deleteConversation);


});
const deleteConversation = async function (parametre) {
  const query = 'delete from `conversation` where id=?;';
  const db = await dbConnexion();
  db.query(query, [parametre.id_conversation], (err, result) => {
    if (err) {
      console.error('Erreur lors de la suppression de la conv:', err);
      parametre.res.status(500).send(JSON.stringify({'message':'Erreur lors de la suppression de la conv'}));
    } else {
      parametre.res.status(201).send(JSON.stringify(result));
    }
  });
  db.end();
}

router.put('', [
  query('id_conversation').notEmpty().withMessage('id de la conversation est requis'),
  body('name').notEmpty().withMessage('name requis'),
  body('uniquePseudo_admin').notEmpty().withMessage('uniquePseudo_admin requis'),
  authenticateToken
], async (req, res) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array() });
  }
  const { id_conversation } = req.query
  var { name, uniquePseudo_admin,extension } = req.body;


  const parametre = {
    id_conversation,
    name,
    uniquePseudo_admin,
    extension,
    res
  }

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];

  isAdmin(token, id_conversation, parametre, putConversation);
});

const putConversation = async function (parametre) {


  const newConv = {
    name: parametre.name,
    uniquePseudo_admin: parametre.uniquePseudo_admin,
    extension:parametre.extension
  };

  var queryUpdate = 'UPDATE conversation SET ? where id = ?';
  const db = await dbConnexion();
  db.query(queryUpdate, [newConv, parametre.id_conversation], (err, result) => {
    if (err) {
      console.error('Erreur lors de la mise a jour de la conv:', err);
      parametre.res.status(500).send(JSON.stringify({'message':'Erreur lors de la mise a jour de la conv'}));
    } else {
      parametre.res.status(201).send(JSON.stringify(result));
    }
  });
  db.end();
}

module.exports = router;
