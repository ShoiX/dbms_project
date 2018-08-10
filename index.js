/*include node packages*/
var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var moment = require('moment-timezone')
var fs = require('fs');
var sessionExpress = require('express-session');
var sha256 = require('sha256');

/*config*/
var app = express();

/* set template engine */
app.set('view engine', 'ejs');

var jsonParser = bodyParser.json();
var urlParser = bodyParser.urlencoded({ extended: false });

var con = require('./include/connection');	//db connection

var constants = require('./include/constants');

// set static files directory
app.use('/lib', express.static(__dirname + '/views/lib/'));

// use session middleware
app.use(sessionExpress({
	secret: constants.SESSION_SECRET,
	saveUninitialized: false,
	resave: false
}));

app.get('/login', function(req, res){
	
	if (req.session.user){
		
		res.redirect('/');
	}
	else{
		
		res.render('login', {errors: req.session.login_error});
		
		if (req.session.login_error){
			req.session.destroy(function(err){});
		}
	}
});

app.get('/', function(req, res){
	
	
	if (req.session.user)
    	res.render('test', {prod: 'active',});
    else
    	res.redirect('/login');
});

app.get('/api/product-lines', function(req, res){
	con.query('SELECT * FROM `tblproductlines` WHERE line_status = 1 ORDER BY `line_id` ASC', function(err, rows){
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

// get list of products based on line_id
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

// adding of new product-line
app.post("/api/post/add-prod-line", jsonParser, function(req, res){
	var name = con.escape(req.body.name);
	res.writeHead(200, {'Content-type': 'text/plain'});
	// check if item already exist
	con.query("SELECT line_id FROM tblproductlines WHERE line_status = 1 AND line_name = " + name, function(err, rows){
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
				
			con.query(q, function(err2, rows2){
					if (err2)
						throw err2;
					res.end("Product Added Successfully");
			});
		}

	});
	
});


// adding of new product-line
app.post("/api/post/add-order", jsonParser, function(req, res){
	
	res.writeHead(200, {'Content-type': 'text/plain'});
	var items = req.body.orders;
	// get total order and datetime
	var total = 0;
	var date_now = moment().tz(constants.my_timezone).format(constants.datetime_format);
;
	items.forEach(i => {
    		
    		total += i.qty * i.u_price;
    	});
	
	// insert parent(orders)
	con.query(`INSERT INTO tblorders (order_amount, order_delivery_charge, order_date) VALUES (${total}, ${req.body.del_charge}, '${date_now}')`, function(err, result){
		if (err)
			throw err;
		
		// insert child(order_items)
		var prnt_id = (result.insertId);
		for (var i = 0; i < items.length; i++) {
			con.query(`INSERT INTO tblorder_items (item_order_id, item_product_id, item_qty, item_subtotal) VALUES(${prnt_id}, ${items[i].id}, ${items[i].qty}, ${items[i].qty * items[i].u_price})`, function(err2, results2){
				if (err2)
					throw err2;
				res.end("SUCCESS");
			});
		}
	});
});

// user-login
 app.post('/post/login', urlParser, function(req, res){
 	
 	var pass = sha256(req.body.password);

 	var uname = req.body.username;

 	// retrieve user info
 	con.query(`SELECT * FROM tblusers where user_loginname = '${uname}'`, function(err, results){
 		if (err)
 			throw err;
 		
 		if (results.length == 0 || pass != results[0].user_password){
 			req.session.login_error = "Account does not exist";
 			res.redirect('/login');
 		}
 		else{
 			var user = results[0];
 			// set session variables
 			req.session.user = {user_id: user.user_id, fname: user.user_firstname, lname: user.user_lastname};
 			res.redirect('/');
 		}
 	});

 });
 app.get('/logout', function(req, res){
 	req.session.destroy(function(err){
 		res.redirect('/');
 	});
 });

app.listen(3000);
