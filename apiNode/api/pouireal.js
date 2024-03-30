const express = require("express");
const jwt = require("jsonwebtoken");
const { dbConnexion } = require("../db"); // Importez votre connexion à la base de données depuis le fichier db.js
const { io } = require("../pouic_serveur.js");
const fs = require("fs");

const router = express.Router();
const { query, body, validationResult } = require("express-validator");
const {
  LIGNE_PAR_PAGES,
  SECRET_KEY,
  uploadPouireal,
} = require("../constantes.js");
const { authenticateToken } = require("../middleware.js");
const { json } = require("body-parser");
var path = require("path");

async function isSenderPouireal(token, id_pouireal, parametre, func) {
  const decodedToken = jwt.verify(token, SECRET_KEY);
  const uniquePseudo = decodedToken.uniquePseudo;
  const query =
    "select count(*) from pouireal where id=? and uniquePseudo_sender=?";
  const db = dbConnexion();
  db.query(query, [id_pouireal, uniquePseudo], (err, result) => {
    if (err) {
      console.error("Erreur lors  :", err);
      return false;
    } else {
      if (result.length === 0) {
        console.log("l utilisateur n est pas le sender du pouireal");
        parametre.res
          .status(500)
          .send(
            JSON.stringify({
              message: "l utilisateur n est pas le sender du pouireal",
            })
          );
      } else {
        func(parametre);
      }
    }
    db.end();
  });
}
async function isPostedPouireal(uniquePseudo) {
    return new Promise((resolve, reject) => {
        const query = "SELECT * FROM timePouireal WHERE id = (SELECT MAX(id) FROM timePouireal);";
        const db = dbConnexion();
        db.query(query, [], (err, result) => {
            if (err) {
                console.error('Erreur lors de la date du pouireal:', err);
                reject(err);
            } else {
                const date = new Date(result[0]["date"]);
                const query = "SELECT id FROM pouireal WHERE uniquePseudo_sender = ? AND date >= ?;";
                const db2 = dbConnexion();
                db2.query(query, [uniquePseudo, date], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de la date du pouireal:', err);
                        reject(err);
                    } else {
                        resolve(result.length > 0);
                    }
                    db2.end();
                });
            }
            db.end();
        });
    });
}
async function getDateMoinsUn() {
  return new Promise((resolve, reject) => {
      const query = "SELECT * FROM timePouireal t order by 1 desc limit 2;";
      const db = dbConnexion();
      db.query(query, [], (err, result) => {
          if (err) {
              console.error('Erreur lors de la date du pouireal:', err);
              reject(err);
          } else {
           try {
              resolve(new Date(result[1]["date"]));
           } catch (error) {
            resolve(new Date(0));
           }
              
          }
          db.end();
      });
  });
}

router.get('/isPosted', [
    authenticateToken
], async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({ error: error.array() });
    }

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;

    var isPosted = await isPostedPouireal(uniquePseudo);

    if (isPosted) {
        return res.status(200).json({ message: "is posted" });
    }else{
        return res.status(400).json({ message: "don't posted" });
    }

});

router.get('', [
    query('id_lastPouireal').notEmpty().withMessage('id_lastPouireal requis'),
    authenticateToken
], async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({ error: error.array() });
    }
    var { id_lastPouireal } = req.query;

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;

    const parametre = {
        id_lastPouireal,
        uniquePseudo,
        res
    }
    getPouireal(parametre);

});



const getPouireal = async function (parametre) {
    var isPosted = await isPostedPouireal(parametre.uniquePseudo);

    var dateMoinUn = await getDateMoinsUn();
    const query = `
        SELECT *
        FROM pouireal
        NATURAL JOIN user
        where pouireal.date > ? and
        pouireal.id > ?
        AND pouireal.uniquePseudo_sender IN (
            SELECT DISTINCT u.uniquePseudo
            FROM user u
            JOIN amis a ON (u.uniquePseudo = a.demandeur AND a.receveur = ?)
                        OR (u.uniquePseudo = a.receveur AND a.demandeur = ?)
            UNION
            SELECT uniquePseudo FROM user WHERE uniquePseudo = ?
        )
        GROUP BY pouireal.id 
        ORDER BY pouireal.id ASC
        LIMIT ?;
    `;
    const db = dbConnexion();
    db.query(query, [dateMoinUn, parametre.id_lastPouireal, parametre.uniquePseudo, parametre.uniquePseudo, parametre.uniquePseudo,LIGNE_PAR_PAGES], (err, result) => {
        if (err) {
            console.error('Erreur lors de la recuperation des message:', err);
            parametre.res.status(500).send(JSON.stringify({ 'message': 'Erreur lors de la recuperation des message' }));
        } else {
            if(!isPosted){
                result.forEach(element => {
                    element["linkPicture1"]=null;
                    element["linkPicture2"]=null;
                    element["description"]=null;
                });
            }
            parametre.res.status(200).send(JSON.stringify({"result" :result}));
        }
        db.end();
    });
}

router.post(
  "",
  [
    body("description").notEmpty().withMessage("description requis"),
    body("date").notEmpty().withMessage("date requis"),
    authenticateToken,
  ],
  async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(400).json({ error: error.array() });
    }
    var { description, date } = req.body;

    const dateObject = new Date(date);

    if (isNaN(dateObject.getTime())) {
      return res.status(400).json({ error: "Date invalide" });
    }

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const uniquePseudo = decodedToken.uniquePseudo;

    var isPosted = await isPostedPouireal(uniquePseudo);

    if(isPosted){
        res.status(400).send({'message':"vous avez deja un pouireal"});
    }
    else{
        const parametre = {
            description,
            dateObject,
            uniquePseudo,
            res,
        };
        postPost(parametre);
    }
  }
);
const postPost = async function (parametre) {
  const query = "call CreatePouireal(?,?,?)";
  const db = dbConnexion();
  db.query(
    query,
    [parametre.uniquePseudo, parametre.description, parametre.dateObject],
    (err, result) => {
      if (err) {
        console.error("Erreur lors de la creation du message:", err);
        parametre.res
          .status(500)
          .send(
            JSON.stringify({ message: "Erreur lors de la creation du message" })
          );
      } else {
        parametre.res.status(201).send(JSON.stringify({"result" :result[0][0]}));
      }
      db.end();
    }
  );
};
router.post(
  "/upload",
  [
    uploadPouireal.single("file"),
    body("nbr_picture").notEmpty().withMessage("nbr_picture requis"),
    body("id_pouireal").notEmpty().withMessage("id_pouireal requis"),
    authenticateToken,
  ],
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .send(JSON.stringify({ message: "Aucun fichier téléchargé." }));
    }

    let id_pouireal = req.query.id_pouireal;

    const query = "SELECT * FROM pouireal natural join user where id=?;";
    const db = dbConnexion();
    db.query(
        query,
        [id_pouireal],
        (err, result) => {
        if (err) {
            db.end();
            console.error("Erreur lors de la creation du message:", err);
            return res.status(500).send(
                JSON.stringify({ message: "Erreur lors de la creation du message" })
            );
        } else {
            db.end();
            return res.status(201).send(JSON.stringify({"result" :result[0]}));
        }
        }
    );

  }
);

router.delete(
  "",
  [
    query("id_pouireal").notEmpty().withMessage("id_pouireal requis"),
    authenticateToken,
  ],
  async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(400).json({ error: error.array() });
    }
    var { id_pouireal } = req.query;

    const tokenHeader = req.headers.authorization;
    const token = tokenHeader.split(" ")[1];

    const parametre = {
      id_pouireal,
      res,
    };

    isSenderPouireal(token, id_pouireal, parametre, deletePouireal);
  }
);
const deletePouireal = async function (parametre) {
  const query1 =
    "SELECT * FROM pouireal natural join user where pouireal.id=?;";
  const db = dbConnexion();
  db.query(query1, [parametre.id_pouireal], (err, result) => {
    if (err) {
      console.error("Erreur lors de la suppression du message:", err);
      parametre.res
        .status(500)
        .send(
          JSON.stringify({
            message: "Erreur lors de la suppression du message",
          })
        );
    } else {
        try {
            if (result[0]["linkPicture1"]!= null){
                const linkPicture = path.join(__dirname,"../uploads","pouireal",result[0]["linkPicture1"]);
                if (fs.existsSync(linkPicture)) {
                    fs.unlinkSync(linkPicture);
                    console.log("Fichier supprimé :", linkPicture);
                  } else {
                    console.log("Le fichier n'existe pas :", linkPicture);
                  }
            }
            if (result[0]["linkPicture2"]!= null){
                const linkPicture = path.join(__dirname,"../uploads","pouireal",result[0]["linkPicture2"]);
                if (fs.existsSync(linkPicture)) {
                    fs.unlinkSync(linkPicture);
                    console.log("Fichier supprimé :", linkPicture);
                  } else {
                    console.log("Le fichier n'existe pas :", linkPicture);
                  }
            }
            const query = "delete from pouireal where id=?;";
            const db3 = dbConnexion();
            db3.query(query, [parametre.id_pouireal], (err, result) => {
                if (err) {
                console.error("Erreur lors de la suppression du message:", err);
                parametre.res
                    .status(500)
                    .send(
                    JSON.stringify({
                        message: "Erreur lors de la suppression du message",
                    })
                    );
                } else {
                parametre.res.status(200).send(JSON.stringify({
                    id_pouireal: parametre.id_pouireal,
                }));
                }
                db3.end();
            });   
        } catch (error) {
            parametre.res
            .status(500)
            .send(
              JSON.stringify({
                message: "le pouireal n'existe pas ",error,
              })
            );
        }
    }
    db.end();
  });
};

router.post(
    "/reaction",
    [
      body("pouireal_id").notEmpty().withMessage("pouireal_id requis"),
      body("emoji").notEmpty().withMessage("emoji requis"),
      authenticateToken,
    ],
    async (req, res) => {
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({ error: error.array() });
        }
        var { pouireal_id, emoji } = req.body;
    
        const tokenHeader = req.headers.authorization;
        const token = tokenHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, SECRET_KEY);
        const uniquePseudo = decodedToken.uniquePseudo;
    

        const parametre = {
            pouireal_id,
            emoji,
            uniquePseudo,
            res,
        };
        postReaction(parametre);
      
    }
  );
  const postReaction = async function (parametre) {
    const query = "call pouic.setReaction_pouireal(?, ?, ?);";
    const db = dbConnexion();
    db.query(
      query,
      [parametre.pouireal_id, parametre.uniquePseudo, parametre.emoji],
      (err, result) => {
        if (err) {
          console.error("Erreur lors de la creation de la reaction:", err);
          parametre.res
            .status(500)
            .send(
              JSON.stringify({ message: "Erreur lors de la creation de la reaction" })
            );
        } else {
          parametre.res.status(201).send(JSON.stringify({"result":result[0]}));
        }
        db.end();
      }
    );
  };

  router.get(
    "/reaction",
    [
        query("pouireal_id").notEmpty().withMessage("pouireal_id requis"),
        authenticateToken,
    ],
    async (req, res) => {
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({ error: error.array() });
        }
        var { pouireal_id } = req.query;
    
        const tokenHeader = req.headers.authorization;
        const token = tokenHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, SECRET_KEY);
        const uniquePseudo = decodedToken.uniquePseudo;
    

        const parametre = {
            pouireal_id,
            uniquePseudo,
            res,
        };
        getReaction(parametre);
      
    }
  );
  const getReaction = async function (parametre) {
    const query = ` SELECT r.pouireal_id,r.emoji, user.*
                    FROM reactions_pouireal r
                    INNER JOIN user ON r.user_uniquePseudo = user.uniquePseudo
                    WHERE r.pouireal_id = ?;`;
    const db = dbConnexion();
    db.query(
      query,
      [parametre.pouireal_id],
      (err, result) => {
        if (err) {
          console.error("Erreur lors de la recuperation de la reaction:", err);
          parametre.res
            .status(500)
            .send(
              JSON.stringify({ message: "Erreur lors de la recuperation de la reaction" })
            );
        } else {
          parametre.res.status(200).send(JSON.stringify({"result":result}));
        }
        db.end();
      }
    );
  };
router.post(
    "/message",
    [
      body("pouireal_id").notEmpty().withMessage("pouireal_id requis"),
      body("message").notEmpty().withMessage("message requis"),
      authenticateToken,
    ],
    async (req, res) => {
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({ error: error.array() });
        }
        var { pouireal_id, message } = req.body;
    
        const tokenHeader = req.headers.authorization;
        const token = tokenHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, SECRET_KEY);
        const uniquePseudo = decodedToken.uniquePseudo;
    

        const parametre = {
            pouireal_id,
            message,
            uniquePseudo,
            res,
        };
        postMessage(parametre);
      
    }
  );
  const postMessage = async function (parametre) {
    const query = ` INSERT INTO messages_pouireal
                    (uniquePseudo_sender,
                    Message,
                    id_pouireal)
                    VALUES
                    (?,
                    ? ,
                    ?);`;
    const db = dbConnexion();
    db.query(
      query,
      [parametre.uniquePseudo, parametre.message, parametre.pouireal_id],
      (err, result) => {
        if (err) {
          console.error("Erreur lors de la creation du messages:", err);
          parametre.res
            .status(400)
            .send(
              JSON.stringify({ message: "Erreur lors de la creation du messages" })
            );
        } else {
            parametre.res.status(201).send({message:"succes"});
        }
        db.end();
      }
    );
  };
  router.get(
    "/message",
    [
        query("pouireal_id").notEmpty().withMessage("pouireal_id requis"),
        authenticateToken,
    ],
    async (req, res) => {
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({ error: error.array() });
        }
        var { pouireal_id } = req.query;
    
        const tokenHeader = req.headers.authorization;
        const token = tokenHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, SECRET_KEY);
        const uniquePseudo = decodedToken.uniquePseudo;
    

        const parametre = {
            pouireal_id,
            uniquePseudo,
            res,
        };
        getMessage(parametre);
      
    }
  );
  const getMessage = async function (parametre) {
    const query = `select * from messages_pouireal m join user u on m.uniquePseudo_sender=u.uniquePseudo where m.id_pouireal=?;`;
    const db = dbConnexion();
    db.query(
      query,
      [parametre.pouireal_id],
      (err, result) => {
        if (err) {
          console.error("Erreur lors de la recuperatuon des messages:", err);
          parametre.res
            .status(400)
            .send(
              JSON.stringify({ message: "Erreur lors de la recuperatuon des messages" })
            );
        } else {
          parametre.res.status(200).send(JSON.stringify({"result":result}));
        }
        db.end();
      }
    );
  };
  router.delete(
    "/message",
    [
        query("message_pouireal_id").notEmpty().withMessage("message_pouireal_id requis"),
        authenticateToken,
    ],
    async (req, res) => {
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({ error: error.array() });
        }
        var { message_pouireal_id } = req.query;
    
        const tokenHeader = req.headers.authorization;
        const token = tokenHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, SECRET_KEY);
        const uniquePseudo = decodedToken.uniquePseudo;
    

        const parametre = {
            message_pouireal_id,
            uniquePseudo,
            res,
        };
        deleteMessage(parametre);
      
    }
  );
  const deleteMessage = async function (parametre) {
    const query = `delete from messages_pouireal where id=? and uniquePseudo_sender=?;`;
    const db = dbConnexion();
    db.query(
      query,
      [parametre.message_pouireal_id,parametre.uniquePseudo],
      (err, result) => {
        if (err) {
          console.error("Erreur lors de la suppresion du message:", err);
          parametre.res
            .status(400)
            .send(
              JSON.stringify({ message: "Erreur lors de la suppresion du message" })
            );
        } else {
            if(result.affectedRows==1){
                parametre.res.status(200).send({"id_delete":parametre.message_pouireal_id});
            }
            else{
                parametre.res.status(400).send({message:"echec le message n'est pas a vous ou n'existe pas"});
            }
          
        }
        db.end();
      }
    );
  };
module.exports = router;
