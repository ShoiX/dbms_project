var mysql = require('mysql');

module.exports = mysql.createConnection({
	host: "localhost",
	user: "user",
	password: "Mmdapo09!",
	database: "inventory_dbms",
	multipleStatements: true
});
