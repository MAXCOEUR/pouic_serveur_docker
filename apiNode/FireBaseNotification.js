var firebase = require("firebase-admin");

var serviceAccount = require("./pouic-327c3-firebase-adminsdk-exo4a-86a8d1bae2.json");

const { dbConnexion } = require("./db");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount)
});

function sendNotif(title,body,token) {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
      }
    }
  };

  firebase
    .messaging()
    .send(message)
    .then((response) => {
      console.log('Notification envoyée avec succès :', response);
    })
    .catch((error) => {
      console.error('Erreur lors de l\'envoi de la notification :', error);
    });
}
async function sendNotifAllFirends(uniquePsodo, title, message) {
  const query =
    "SELECT tokenFireBase FROM (SELECT DISTINCT u.* FROM user u JOIN amis a ON u.uniquePseudo = a.demandeur AND a.receveur = ? UNION SELECT DISTINCT u.* FROM user u JOIN amis a ON u.uniquePseudo = a.receveur AND a.demandeur = ? ) AS subquery;";
  const db = dbConnexion();
  db.query(query, [uniquePsodo, uniquePsodo], (err, result) => {
    if (err) {
      console.error(
        "Erreur lors de la recherche du nombre de message non lu :",
        err
      );
    } else {
      for (const usersToken of result) {
        if (usersToken != null) {
          sendNotif(title, message, usersToken.tokenFireBase);
        }
      }
    }
    db.end();
  });
}
async function sendNotifReactionPouireal(idPouireal, title, message) {
  const query =
    "select u.tokenFireBase from pouireal p join user u on p.uniquePseudo_sender=u.uniquePseudo where p.id=?;";
  const db = dbConnexion();
  db.query(query, [idPouireal], (err, result) => {
    if (err) {
      console.error(
        "Erreur lors de la recherche du nombre de message non lu :",
        err
      );
    } else {
      for (const usersToken of result) {
        if (usersToken != null) {
          sendNotif(title, message, usersToken.tokenFireBase);
        }
      }
    }
    db.end();
  });
}
async function sendNotifReactionPouic(idPouic, title, message) {
  const query =
    "select u.tokenFireBase from messages m join user u on m.uniquePseudo_sender=u.uniquePseudo where m.id=?;";
  const db = dbConnexion();
  db.query(query, [idPouic], (err, result) => {
    if (err) {
      console.error(
        "Erreur lors de la recherche du nombre de message non lu :",
        err
      );
    } else {
      for (const usersToken of result) {
        if (usersToken != null) {
          sendNotif(title, message, usersToken.tokenFireBase);
        }
      }
    }
    db.end();
  });
}

module.exports={sendNotifAllFirends,sendNotif,sendNotifReactionPouireal,sendNotifReactionPouic};