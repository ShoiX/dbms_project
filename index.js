/*include node packages*/
var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var moment_tzone = require('moment-timezone');
var moment = require('moment');
var fs = require('fs');
var sessionExpress = require('express-session');
var sha256 = require('sha256');
var multer = require('multer');
var crypto = require('crypto');
var mime = require('mime');


/*config*/
var con = require('./include/connection');	//db connection

var constants = require('./include/constants');

var utils = require('./include/utils');

var app = express();

// multer configs
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, constants.LOGO_PATH);
  },
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      cb(null, raw.toString('hex') + Date.now() + '.' + mime.extension(file.mimetype));
    });
  }
});

var upload = multer({
	storage: storage,
	limits: {
		fileSize: 1024 * 1024 * 5	// 5 MB size
	}

});
/* set template engine */
app.set('view engine', 'ejs');

var jsonParser = bodyParser.json();
var urlParser = bodyParser.urlencoded({ extended: false });


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
    	res.render('home', {activate: {product: 'active'},  name: `${req.session.user.fname} ${req.session.user.lname}`});
    else
    	res.redirect('/login');
});

app.get('/clients', function(req, res){
	
	//if (req.session.user)
	if (req.session.user)
    	res.render('clients', {activate: {client: 'active'},  name: `${req.session.user.fname} ${req.session.user.lname}`});
    else
    	res.redirect('/login');
});

// orders page
app.get('/orders', function(req, res){
	if (req.session.user)
    	res.render('orders', {activate: {orders: 'active'},  name: `${req.session.user.fname} ${req.session.user.lname}`});
    else
    	res.redirect('/login');
})

// list of clients with id
app.get('/api/client-select', function(req, res){
	res.writeHead(200, {'Content-type': 'application/json'});
	con.query('SELECT client_id, client_firstname, client_lastname FROM tblclients WHERE client_status = 1', function(err, rows){
		if (err)
			throw err;
		var out = [{id: null, name: null}];
		for (var i = 0; i < rows.length; i++) {
			out.push({
				id: rows[i].client_id,
				name: `${rows[i].client_firstname} ${rows[i].client_lastname}`
			});
		}
		res.end(JSON.stringify(out));
	});
});

// list of clients for clients tab
app.get('/api/clients', function(req,res){
	res.writeHead(200, {'Content-type': 'application/json'});
	con.query("SELECT * FROM tblclients WHERE client_status = 1", function(err, rows){
		if (err)
			throw err;
		var json_data = [];
		rows.forEach(i => {
			json_data.push({
				id: i.client_id,
				name : `${i.client_firstname} ${i.client_lastname}`,
				email: i.client_email,
				mobile: i.client_mobile,
				addr: i.client_address
			});
		});
		
			res.end(JSON.stringify(json_data));
	});
});

// get product summary
app.get('/api/product-summary/:pid', jsonParser, function(req, res){
	res.writeHead(200, {'Content-type': 'application/json'});
	var id = req.params.pid;
	con.query(`SELECT
		product_name,
		product_description,
		product_price,
		product_qty,
		product_cover_image,
		SUM(tblorder_items.item_qty) AS total_qty_sold,
		SUM(tblorder_items.item_subtotal) AS total_amt_sold
		FROM tblproducts
		INNER JOIN tblorder_items ON tblproducts.product_id = tblorder_items.item_product_id
		INNER JOIN tblorders ON tblorder_items.item_order_id = tblorders.order_id AND tblorders.order_status = 1
		WHERE product_id = ${id}
		`, function(err, rows){
			if (err)
				throw err;
			var d = rows[0];
			
			var out = {
				prod_logo: constants.STATIC_LOGO_PATH+d.product_cover_image,
				name: d.product_name,
				desc: d.product_description,
				price: d.product_price,
				qty: d.product_qty,
				itemsold: d.total_qty_sold,
				amtsold: d.total_amt_sold
			};
			res.end(JSON.stringify(out));
		});
});

// get some details about the client
app.get('/api/client-details/:id', function(req, res){
	res.writeHead(200, {'Content-type': 'application/json'});
			
	var client_id = req.params.id;
	// get important details from user
	con.query(`SELECT client_firstname,
		client_lastname,
		client_id,
		client_date_added,
		SUM(tblorders.order_amount) AS amt,
		client_mobile,
		client_email,
		client_address
		FROM tblclients
		INNER JOIN tblorders
		ON tblclients.client_id = tblorders.order_client_id
		WHERE client_id = ${client_id}`, function(err, rows){
			if (err)
				throw err;
			var d = rows[0];
			var date_added =  moment(new Date(d.client_date_added)).format("MMMM D YYYY");
			var to_out = {
				fname: d.client_firstname,
				lname: d.client_lastname,
				total_order: d.amt,
				added: date_added,
				email: d.client_email,
				mobile: d.client_mobile,
				addr: d.client_address
			};
			res.end(JSON.stringify(to_out));	
		});
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

//  list of orders
app.get("/api/orders", function(req, res){
	res.writeHead(200, {'Content-type': 'application/json'});
	con.query(`SELECT tblorders.*,
		tblclients.client_firstname,
		tblclients.client_lastname,
		tblusers.user_firstname,
		tblusers.user_lastname
		FROM tblorders
		INNER JOIN tblclients ON order_client_id = tblclients.client_id
		INNER JOIN tblusers ON tblorders.order_user_id = tblusers.user_id
		WHERE order_status != 0
		ORDER BY order_id DESC`, function(err, rows){
			if (err)
				throw err;
			var out = [];
			rows.forEach(d =>{
				out.push({
					id: d.order_id,
					ref_id: utils.encode_Id(d.order_id, d.order_date),
					date: moment(d.order_date).format('MMMM D YYYY'),
					cl_name: `${d.client_firstname} ${d.client_lastname}`,
					amt: d.order_amount,
					agent: `${d.user_firstname} ${d.user_lastname}`

				});
			});
			res.end(JSON.stringify(out));
		});
});

app.get("/api/order-summary/:id", function(req, res){
	var oid  = req.params.id;
	res.writeHead(200, {'Content-type': 'application/json'});
	con.query(`SELECT order_amount,
		order_delivery_charge,
		tblproducts.product_name,
		tblorder_items.item_qty,
		tblorder_items.item_subtotal
		FROM tblorders
		INNER JOIN tblorder_items ON order_id = tblorder_items.item_order_id
		INNER JOIN tblproducts ON tblorder_items.item_product_id = tblproducts.product_id
		WHERE order_id = ${oid}`, function(err, rows){
			if (err)
				throw err;
			var out = {};
			out.amt = rows[0].order_amount;
			out.del_charge = rows[0].order_delivery_charge;
			out.items = [];
			rows.forEach(d =>{
				out.items.push({
					name: d.product_name,
					qty: d.item_qty,
					subtotal: d.item_subtotal,
					price: d.item_subtotal / d.item_qty
				});
			});
			res.end(JSON.stringify(out));
		})
})

// delete a client
app.post("/api/post/del-client", jsonParser, function(req, res){
	var cl_id = req.body.client_id;
	res.writeHead(200, {'Content-type': 'text/plain'}); 
	con.query(`UPDATE tblclients 
		SET client_status = 0
		WHERE client_id = ${cl_id}`, function(err, rows){
			if (err)
				throw err;
			res.end("Success");
		});
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

app.post("/api/post/add-prod", jsonParser, upload.single('prod_logo'), function(req, res){

	var pdata = JSON.parse(req.body.new_prod);
	
	res.writeHead(200, {'Content-type': 'text/plain'});
	// check if name already exists
	con.query(`SELECT product_id FROM tblproducts WHERE product_name = ${con.escape(pdata.name)}`, function(err, rows){
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
				${con.escape(pdata.name)},
				${pdata.line_id},
				${con.escape(pdata.desc)},
				${pdata.price},
				${pdata.qty})`;
				
			con.query(q, function(err2, rows2){
					if (err2)
						throw err2;
					// there is a prod_logo
					if (req.file){
						var in_id = rows2.insertId;
						var img_name = req.file.filename;
						// insert name to the database
						con.query(`UPDATE tblproducts
						SET product_cover_image = ${con.escape(img_name)}
						WHERE product_id = ${in_id}  `, function(er, ro){
							if (er)
								throw er;
						});
					}
					res.end("Product added Succesfully");
			});
		}

	});
	
});


// adding of new product-line
app.post("/api/post/add-order", jsonParser, function(req, res){
	
	res.writeHead(200, {'Content-type': 'text/plain'});
	if(!req.session.user){
		res.end("Error!");
		return;
	}
	var user_id = req.session.user.user_id;
	var items = req.body.orders;
	// get total order and datetime
	var total = 0;
	var date_now = moment_tzone().tz(constants.my_timezone).format(constants.datetime_format);
;
	items.forEach(i => {
    		
    		total += i.qty * i.u_price;
    	});
	
	// insert parent(orders)
	con.query(`INSERT INTO tblorders (order_amount, order_delivery_charge, order_date, order_user_id, order_client_id) VALUES (${total}, ${req.body.del_charge}, '${date_now}', ${user_id}, ${req.body.client_id})`, function(err, result){
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

//edit client
app.post('/api/post/edit-client', jsonParser, function(req, res){
	res.writeHead(200, {'Content-type': 'text/plain'});
	var d = req.body;
	con.query(`UPDATE tblclients SET 
		client_firstname = ${con.escape(d.fname)},
		client_lastname = ${con.escape(d.lname)},
		client_mobile = ${con.escape(d.mobile)},
		client_email = ${con.escape(d.email)},
		client_address = ${con.escape(d.addr)}
		WHERE client_id = ${d.id}`, function(err, rows){
			if (err)
				throw err;
			res.end("Success");
		});
});

// user-login
 app.post('/post/login', urlParser, function(req, res){
 	
 	var pass = sha256(req.body.password);

 	var uname = con.escape(req.body.username);

 	// retrieve user info
 	con.query(`SELECT * FROM tblusers where user_loginname = ${uname}`, function(err, results){
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

 // add client
 app.post('/api/post/add-client', jsonParser, function(req, res){
 	res.writeHead(200, {'Content-type': 'text/plain'});
 	
 	// check if user already exists
 	con.query(`SELECT client_id FROM tblclients WHERE client_firstname = ${con.escape(req.body.fname)} AND client_lastname = ${con.escape(req.body.lname)}`, function(err, rows){
 		if (err)
 			throw err;
 		if (rows.length > 0){
 			res.end("Client Already Exist");
 		}
 		else{
 			var date_now = moment_tzone().tz(constants.my_timezone).format(constants.datetime_format);
 			var d = req.body;
 			// insert data to the table
 			con.query(`INSERT INTO tblclients (client_firstname, client_lastname, client_mobile, client_email, client_address, client_date_added)
 				VALUES (
 				${con.escape(d.fname)},
 				${con.escape(d.lname)},
 				${con.escape(d.mobile)},
 				${con.escape(d.email)},
 				${con.escape(d.addr)},
 				"${date_now}"
 				)`, function(err, rows){
 					if (err)
 						throw err;
 					res.end("Success");
 				});
 		}
 	});
 });
 app.get('/logout', function(req, res){
 	req.session.destroy(function(err){
 		res.redirect('/');
 	});
 });

app.listen(3000);
