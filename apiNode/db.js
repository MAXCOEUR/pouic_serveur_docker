const mysql = require('mysql2');

const host = process.env.MYSQL_HOST || "127.0.0.1";
const user = process.env.MYSQL_USER != undefined||"root";
const password = process.env.MYSQL_PASSWORD != undefined||"root";
const database = process.env.MYSQL_DATABASE != undefined||"pouic";
const port = process.env.MYSQL_PORT != undefined||3306;

function dbConnexion() {
  try {
    const connection = mysql.createConnection({
      host: host,
      user: user,
      password: password,
      database: database,
      port: port
    });
    return connection;
  } catch (error) {
    throw error;
  }
}



module.exports = {dbConnexion};
