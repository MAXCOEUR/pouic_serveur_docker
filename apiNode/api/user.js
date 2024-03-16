const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db'); // Importez votre connexion à la base de données depuis le fichier db.js

const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const { LIGNE_PAR_PAGES, SECRET_KEY, uploadUserAvatar } = require('../constantes.js');
const { authenticateToken } = require('../middleware.js');

// Créer un utilisateur
router.post('', [
  body('email').notEmpty().withMessage('Email requis'),
  body('uniquePseudo').notEmpty().withMessage('UniquePseudo requis'),
  body('pseudo').notEmpty().withMessage('Pseudo requis'),
  body('passWord').notEmpty().withMessage('PassWord requis')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Envoyer une réponse avec les erreurs
    return res.status(400).json({ errors: errors.array() });
  }

  var { email, uniquePseudo, pseudo, passWord, extension, bio } = req.body;


  try {


    const hashedPassword = await bcrypt.hash(passWord, 10);

    const newUser = {
      email,
      uniquePseudo,
      pseudo,
      passWord: hashedPassword,
      extension,
      bio
    };

    const query = 'INSERT INTO user SET ?';
    db.query(query, newUser, (err, result) => {
      if (err) {
        console.error('Erreur lors de la création de l\'utilisateur:', err);

        if (err.code === 'ER_DUP_ENTRY') {
          if (err.sqlMessage.includes('email_UNIQUE')) {
            res.status(400).send({ message: 'Cette adresse e-mail est déjà utilisée.' });
          } else if (err.sqlMessage.includes('PRIMARY')) {
            res.status(400).send({ message: 'le @ est déjà utilisée.' });
          } else {
            res.status(400).send({ message: 'Erreur lors de la création de l\'utilisateur.' });
          }
        } else {
          res.status(500).send({ message: 'Erreur lors de la création de l\'utilisateur.' });
        }
      } else {
        res.status(201).send(JSON.stringify(newUser));
      }
    });
  } catch (error) {
    console.error('Erreur lors du hachage du mot de passe:', error);
    res.status(500).send(JSON.stringify({ message: 'Erreur lors de la création de l\'utilisateur' }));
  }
});
router.post('/upload', uploadUserAvatar.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).send(JSON.stringify({ 'message': 'Aucun fichier téléchargé.' }));
  }
  return res.status(200).send(JSON.stringify({ 'message': 'Image téléchargée avec succès.' }));
});

router.get('/unread', [
  authenticateToken
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Envoyer une réponse avec les erreurs
    return res.status(400).json({ errors: errors.array() });
  }
  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const myUniquePseudo = decodedToken.uniquePseudo;

  const query = "select sum(unread) unread from `user-conversation` uc left join ( 	SELECT m.id_conversation, COUNT(m.id) - IFNULL(COUNT(r.id_message), 0) AS unread     FROM messages m     LEFT JOIN `message-read` r ON m.id = r.id_message     AND r.uniquePseudo_user = ?     GROUP BY m.id_conversation)cc on uc.id_conversation=cc.id_conversation where uc.uniquePseudo_user=? group by uc.uniquePseudo_user;";
  db.query(query, [myUniquePseudo, myUniquePseudo], (err, result) => {
    if (err) {
      console.error('Erreur lors de la recherche du nombre de message non lu :', err);
      res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la recherche du nombre de message non lu' }));
    } else {
      res.status(200).send(JSON.stringify(result[0]));
    }
  });

});

router.get('', [
  query('search').exists().withMessage('search requis'),
  query('page').notEmpty().withMessage('page requis'),
  authenticateToken
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Envoyer une réponse avec les erreurs
    return res.status(400).json({ errors: errors.array() });
  }
  var { search, page } = req.query;

  var nbr_ligne = page * LIGNE_PAR_PAGES;
  search = "%" + search + "%";

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const myUniquePseudo = decodedToken.uniquePseudo;

  const query = "SELECT u.*, CASE WHEN EXISTS (SELECT 1 FROM amis WHERE (demandeur = ? AND receveur = u.uniquePseudo) OR (demandeur = u.uniquePseudo AND receveur = ?)) THEN 1 ELSE 0 END AS sont_amis FROM user u WHERE u.uniquePseudo LIKE ? LIMIT ? OFFSET ?;";
  db.query(query, [myUniquePseudo, myUniquePseudo, search, LIGNE_PAR_PAGES, nbr_ligne], (err, result) => {
    if (err) {
      console.error('Erreur lors de la recherche de l\'utilisateur:', err);
      res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la recherche de l\'utilisateur' }));
    } else {
      // Convertir les données binaires de l'Avatar en base64

      res.status(201).send(JSON.stringify(result));
    }
  });
});

// Vérifier la connexion de l'utilisateur
router.post('/login', [
  body('emailOrPseudo').notEmpty().withMessage('emailOrPseudo requis'),
  body('passWord').notEmpty().withMessage('passWord requis')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Envoyer une réponse avec les erreurs
    return res.status(400).json({ errors: errors.array() });
  }
  const { emailOrPseudo, passWord } = req.body;

  try {
    const query = 'SELECT * FROM user WHERE email = ? OR uniquePseudo = ?';
    db.query(query, [emailOrPseudo, emailOrPseudo], async (err, results) => {
      if (err) {
        console.error('Erreur lors de la vérification de la connexion:', err);
        res.status(500).send(JSON.stringify({ message: 'Erreur lors de la vérification de la connexion' }));
      } else if (results.length === 0) {
        res.status(401).send(JSON.stringify({ message: 'Email ou @ non trouvé' }));
      } else {
        var user = results[0];
        const passwordMatch = await bcrypt.compare(passWord, user.passWord);

        if (passwordMatch) {
          const token = jwt.sign({ uniquePseudo: user.uniquePseudo, email: user.email }, SECRET_KEY, { expiresIn: '24h' });

          const responseObj = {
            user,
            token
          };

          const jsonResponse = JSON.stringify(responseObj);

          res.status(200).send(jsonResponse);
        } else {
          res.status(401).send(JSON.stringify({ message: 'Mot de passe incorrect' }));
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la connexion:', error);
    res.status(500).send('Erreur lors de la vérification de la connexion');
  }
});
router.post('/login/token', [
  authenticateToken
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Envoyer une réponse avec les erreurs
    return res.status(400).json({ errors: errors.array() });
  }
  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const uniquePseudo = decodedToken.uniquePseudo;

  const query = 'SELECT * FROM user WHERE uniquePseudo = ?';
  db.query(query, [uniquePseudo], async (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de la connexion:', err);
      res.status(500).send(JSON.stringify({ message: 'Erreur lors de la vérification de la connexion' }));
    } else if (results.length === 0) {
      res.status(401).send(JSON.stringify({ message: 'Email ou @ non trouvé' }));
    } else {
      var user = results[0];

      const token = jwt.sign({ uniquePseudo: user.uniquePseudo, email: user.email }, SECRET_KEY, { expiresIn: '24h' });

      const responseObj = {
        user,
        token
      };

      const jsonResponse = JSON.stringify(responseObj);

      res.status(200).send(jsonResponse);
    }
  });

});

router.put('', [
  body('email').notEmpty().withMessage('Email requis'),
  body('uniquePseudo').notEmpty().withMessage('UniquePseudo requis'),
  body('pseudo').notEmpty().withMessage('Pseudo requis'),
  authenticateToken
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Envoyer une réponse avec les erreurs
    return res.status(400).json({ errors: errors.array() });
  }

  var { email, uniquePseudo, pseudo, extension, bio } = req.body;

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const uniquePseudo_old = decodedToken.uniquePseudo;


  var querySelect = 'SELECT * FROM user WHERE uniquePseudo = ?';
  db.query(querySelect, [uniquePseudo_old], async (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de la connexion:', err);
      res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la vérification de la connexion' }));
    } else if (results.length === 0) {
      res.status(401).send(JSON.stringify({ 'message': 'Utilisateur non trouvé' }));
    } else {
      try {

        const newUser = {
          email,
          uniquePseudo,
          pseudo,
          extension,
          bio
        };

        var queryUpdate = 'UPDATE user SET ? where uniquePseudo = ?';
        db.query(queryUpdate, [newUser, uniquePseudo_old], (err, result) => {
          if (err) {
            console.error('Erreur lors de la création de l\'utilisateur:', err);

            if (err.code === 'ER_DUP_ENTRY') {
              if (err.sqlMessage.includes('email_UNIQUE')) {
                res.status(400).send({ message: 'Cette adresse e-mail est déjà utilisée.' });
              } else if (err.sqlMessage.includes('PRIMARY')) {
                res.status(400).send({ message: 'le @ est déjà utilisée.' });
              } else {
                res.status(400).send({ message: 'Erreur lors de la création de l\'utilisateur.' });
              }
            } else {
              res.status(500).send({ message: 'Erreur lors de la création de l\'utilisateur.' });
            }
          } else {
            res.status(201).send(JSON.stringify(newUser));
          }
        });
      } catch (error) {
        console.error(error);
        res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la modification de l\'utilisateur' }));
      }
    }
  });


});
router.put('/mdp', [
  body('oldMdp').notEmpty().withMessage('oldMdp requis'),
  body('newMdp').notEmpty().withMessage('newMdp requis'),
  authenticateToken
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Envoyer une réponse avec les erreurs
    return res.status(400).json({ errors: errors.array() });
  }
  var { oldMdp, newMdp } = req.body;
  const tokenHeader = req.headers.authorization;
  const token = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const uniquePseudo = decodedToken.uniquePseudo;

  const query = 'SELECT * FROM user WHERE uniquePseudo = ?';
  db.query(query, [uniquePseudo], async (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de la connexion:', err);
      res.status(500).send(JSON.stringify({ message: 'Erreur lors de la vérification de la connexion' }));
    } else if (results.length === 0) {
      res.status(401).send(JSON.stringify({ message: 'Email ou @ non trouvé' }));
    } else {
      var user = results[0];
      const passwordMatch = await bcrypt.compare(oldMdp, user.passWord);
      if (passwordMatch) {

        const hashedPassword = await bcrypt.hash(newMdp, 10);
        user.passWord=hashedPassword;
        
        const query = 'update user set passWord=? WHERE uniquePseudo = ?';
        db.query(query, [hashedPassword,uniquePseudo], async (err, results) => {
          if (err) {
            console.error('Erreur lors de la vérification de la connexion:', err);
            res.status(500).send(JSON.stringify({ message: 'Erreur lors de la vérification de la connexion' }));
          } else {
            res.status(201).send(JSON.stringify(user));
          }
        });
      }
      else{
        res.status(500).send(JSON.stringify({ message: 'Erreur lors de la vérification du ancien mdp' }));
      }
    }
  });
}
)
router.put('/tokenNotification', [
  authenticateToken
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Envoyer une réponse avec les erreurs
    return res.status(400).json({ errors: errors.array() });
  }
  var { token } = req.body;
  const tokenHeader = req.headers.authorization;
  const tokenUser = tokenHeader.split(' ')[1];
  const decodedToken = jwt.verify(tokenUser, SECRET_KEY);
  const uniquePseudo = decodedToken.uniquePseudo;

  const query = 'update user set tokenFireBase=? WHERE uniquePseudo = ?';
  db.query(query, [token,uniquePseudo], async (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de la connexion:', err);
      res.status(500).send(JSON.stringify({ message: 'Erreur lors de la vérification de la connexion' }));
    } else if (results.length === 0) {
      res.status(401).send(JSON.stringify({ message: 'Email ou @ non trouvé' }));
    } else {
      res.status(201).send(JSON.stringify({ message: 'token modifier' }));
    }
  });
}
)

module.exports = router;
