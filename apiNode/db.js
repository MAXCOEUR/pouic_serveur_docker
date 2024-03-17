const mysql = require('mysql2');

const host = (process.env.MYSQL_HOST != undefined)?process.env.MYSQL_HOST:"127.0.0.1";
const user = (process.env.MYSQL_USER != undefined)?process.env.MYSQL_USER:"root";
const password = (process.env.MYSQL_PASSWORD != undefined)?process.env.MYSQL_PASSWORD:"root";
const database = (process.env.MYSQL_DATABASE != undefined)?process.env.MYSQL_DATABASE:"pouic";
const port = (process.env.MYSQL_PORT != undefined)?process.env.MYSQL_PORT:3306;

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
