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


//sendNotif("cIkCevzeQ0uSOxMzJha4z8:APA91bF359CZ_ajHElFuC6Nd-6Gl9UC-GR2hM5WxurluFORhHthd_2LfQkcFt8m2AFJqXOcebnY2aEVavxCttwLH75SXRJHRH4zE-Y7XrVk7BP86OWMPtSjhwr9TMnvAVG_yjkWMXzo3")

module.exports={sendNotif};