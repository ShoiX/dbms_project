var express = require('express');

var app = express();
app.get('/', function(req, res){
	res.status(404);
	res.json({a:1, b:2});
//	console.log(res);
});
app.listen(3000);
