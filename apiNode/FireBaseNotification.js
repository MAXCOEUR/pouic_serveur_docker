var firebase = require("firebase-admin");

var serviceAccount = require("./pouic-327c3-firebase-adminsdk-exo4a-86a8d1bae2.json");

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
        vibrate: 'true'
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

module.exports={sendNotif};