const multer = require('multer');
const path = require('path');
const { dbConnexion } = require('./db');
const fs = require('fs');

const LIGNE_PAR_PAGES = 25;
const SECRET_KEY = 'b1717167dd1920d2ef95d8ae8de426a0adc0d8dca3551437862a2c3310b9e53a';

const storageUserAvatar = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/AvatarUser');
  },
  filename: function (req, file, cb) {
    const userId = req.body.uniquePseudo;
    const fileName = userId + path.extname(file.originalname);

    // Supprimer les anciens fichiers avec le même nom de base
    const filesToDelete = ['.png', '.gif', '.jpeg', '.jpg']
      .map(ext => path.join('uploads/AvatarUser', userId + ext))
      .filter(file => fs.existsSync(file));

    // Supprimer les fichiers
    filesToDelete.forEach(file => {
      fs.unlinkSync(file);
    });

    cb(null, fileName);
  }
});

const storageConversationImage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/ImageConversation');
  },
  filename: function (req, file, cb) {
    const userId = req.body.uniquePseudo;
    const fileName = userId + path.extname(file.originalname);

    // Supprimer les anciens fichiers avec le même nom de base
    const filesToDelete = ['.png', '.gif', '.jpeg', '.jpg']
      .map(ext => path.join('uploads/ImageConversation', userId + ext))
      .filter(file => fs.existsSync(file));

    // Supprimer les fichiers
    filesToDelete.forEach(file => {
      fs.unlinkSync(file);
    });

    cb(null, fileName);
  }
});
const storageFile = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/messages');
  },
  filename: async function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const nameFile = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);

    req.body.fieldname = nameFile;
    req.body.namereal = file.originalname;

    let id_message = req.body.id_message;
    let name = req.body.name;

    const query = "INSERT INTO `file` (`id_message`, `linkFile`,`name`) VALUES (?, ?,?);";
    const db = await dbConnexion();
    db.query(query, [id_message, nameFile, name], (err, result) => {
      if (err) {
        console.error('Erreur lors de la creation du message:', err);
      } else {
      }
    });

    cb(null, nameFile);
  }
});

const storagePouireal = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/pouireal');
  },
  filename: async function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const nameFile = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);

    let id_pouireal = req.body.id_pouireal;
    let nbr_picture = req.body.nbr_picture;

    const query = (nbr_picture=='1')?"update pouireal set pouireal.linkPicture1=? where id=?;":"update pouireal set pouireal.linkPicture2=? where id=?;";
    const db = dbConnexion();
    db.query(query, [nameFile, id_pouireal], (err, result) => {
      if (err) {
        console.error('Erreur lors de la creation du message:', err);
      } else {
      }
    });

    cb(null, nameFile);
  }
});

const uploadUserAvatar = multer({ storage: storageUserAvatar });
const uploadConversationImage = multer({ storage: storageConversationImage });
const uploadFile = multer({ storage: storageFile });
const uploadPouireal = multer({ storage: storagePouireal });

module.exports = { LIGNE_PAR_PAGES, SECRET_KEY, uploadUserAvatar, uploadConversationImage, uploadFile, uploadPouireal};