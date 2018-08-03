/*include node packages*/
var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');

var fs = require('fs');

/*config*/
var app = express();

var jsonParser = bodyParser.json();
var con = require('./include/connection');	//db connection

// set static files directory
app.use('/lib', express.static(__dirname + '/view/lib/'));

app.get('/api/product-lines', function(req, res){
	con.query('SELECT * FROM `tblproductlines` ORDER BY `line_id` ASC', function(err, rows){
    	if (err)
    		throw err;
    	var json_data = [];
    	rows.forEach(items => {
    		json_data.push({id: items.line_id, name: items.line_name})
    	});
    	
    	res.writeHead(200, {'Content-type': 'application/json'});
		res.end(JSON.stringify(json_data));
    	
    });
});

app.get('/api/products', function(req, res){
	
	// get the data to be posted
	var prod_id = con.escape(req.query.prod_id);
	con.query(`SELECT * FROM tblproducts WHERE product_line_id = ${prod_id} AND product_status = 1`, function(err, rows){
		
		var json_data = [];
		rows.forEach(items=>{
			json_data.push({
				prod_id: items.product_id,
				name: items.product_name,
				desc: items.product_description,
				price: items.product_price,
				qty: items.product_qty
			})
		});
		
		res.writeHead(200, {'Content-type': 'application/json'});
		res.end(JSON.stringify(json_data));

	})
});

app.post("/api/post/add-prod-line", jsonParser, function(req, res){
	var name = con.escape(req.body.name);
	res.writeHead(200, {'Content-type': 'text/plain'});
	// check if item already exist
	con.query("SELECT line_id FROM tblproductlines WHERE line_name = " + name, function(err, rows){
		if (rows.length > 0){
			res.end("Product-line Already Exists");
		}
		else
		{
			con.query("INSERT INTO tblproductlines (line_name) VALUES ("+name+")", function(err2, rows2){
				if (err2){
					throw err2;
				}

				res.end("Success");

			});
		}
	});
	
});

app.post("/api/post/add-prod", jsonParser, function(req, res){

	var pdata = req.body;
	
	res.writeHead(200, {'Content-type': 'text/plain'});
	// check if name already exists
	con.query("SELECT product_id FROM tblproducts WHERE product_name = '"+pdata.name+"'", function(err, rows){
		if (err)
			throw err;
		if (rows.length > 0)
		{
			res.end("Product Already Exist");
		}
		else
		{
			var q = `INSERT INTO tblproducts (product_name, 
				product_line_id,
				product_description,
				product_price,
				product_qty) VALUES (
				'${pdata.name}',
				${pdata.line_id},
				'${pdata.desc}',
				${pdata.price},
				${pdata.qty})`;
				console.log(q);
			con.query(q, function(err2, rows2){
					if (err2)
						throw err2;
					res.end("Product Added Successfully");
			});
		}

	});
	
});
app.get('/', function(req, res){


    var html = fs.readFileSync(__dirname +'/view/test.html', 'utf8');
    	res.writeHead(200, {'Content-type': 'text/html'});
    	res.end(html);
});

app.listen(3000);
