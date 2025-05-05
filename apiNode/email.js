var nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: "8c3908001@smtp-brevo.com",
      pass: "nyOb01LpATkJ5mZW",
    },
  });

function sendEmail(to, subject, html) {
  var mailOptions = {
    from: "pouic-logiciel@outlook.fr",
    to: to,
    subject: subject,
    html: html,
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error Email sent: " + error);
      throw error;
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

function createMailResetMdp(uniquePseudo, newMdp) {
    const emailHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nouveau Mot de Passe</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto; /* Centre le contenu horizontalement */
                    padding: 40px;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    color: #b50c8b; /* Couleur principale de l'application */
                    text-align: center; /* Centre le titre */
                }
                p {
                    color: #666;
                    margin-bottom: 20px;
                }
                .new-password {
                    background-color: #b50c8b; /* Couleur principale de l'application */
                    color: #fff;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Nouveau Mot de Passe</h1>
                <p>Bonjour ${uniquePseudo},</p>
                <p>Votre mot de passe a été réinitialisé avec succès.</p>
                <p>Votre nouveau mot de passe est : <span class="new-password">${newMdp}</span></p>
                <p>Il est recommandé de changer votre mot de passe dès que possible pour des raisons de sécurité.</p>
            </div>
        </body>
        </html>
    `;
    return emailHTML;
}



module.exports = { sendEmail,createMailResetMdp };
