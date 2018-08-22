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
var ejs =  require('ejs');


/*config*/
var con = require('./include/connection');	//db connection

var constants = require('./include/constants');

var utils = require('./include/utils');

var app = express();

// route config
var apiroutes = require('./routes/apiroutes');

app.use('/api', apiroutes);

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

app.get('/dashboard', function(req, res){
	res.render('dashboard', {activate: {dashboard: 'active'},  name: `${req.session.user.fname} ${req.session.user.lname}`});
});
app.get('/clients', function(req, res){
	
	//if (req.session.user)
	if (req.session.user)
    	res.render('clients', {activate: {client: 'active'},  name: `${req.session.user.fname} ${req.session.user.lname}`});
    else
    	res.redirect('/login');
});
app.get('/settings', function(req, res){
	
	//if (req.session.user)
	if (req.session.user)
    	res.render('settings', {activate: {settings: 'active'},  name: `${req.session.user.fname} ${req.session.user.lname}`});
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

// get storage status
app.get('/api/storage-status', (req, res)=>{
	con.query('SELECT comp_warehouse_size, SUM(tblproducts.product_qty)AS numa FROM tblsettings INNER JOIN tblproducts WHERE tblproducts.product_status = 1 GROUP BY comp_warehouse_size ', function(err, row){
		if (err)
			throw err;
		res.json({size: row[0].comp_warehouse_size,
			qty: row[0].numa})
	})
})

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

// get all company info
app.get('/api/get-info', function(req, res){
	con.query('SELECT * FROM tblsettings LIMIT 1', function(err, rows){
		var row = rows[0];
		var out = {
			name: row.comp_name,
			addr: row.comp_address,
			mobile: row.comp_number,
			email: row.comp_email,
			size: row.comp_warehouse_size
		};
		res.json(out);
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
		INNER JOIN tblorders ON tblorder_items.item_order_id = tblorders.order_id AND tblorders.order_status = ${constants.ORDER.APPROVE}
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
		ON tblclients.client_id = tblorders.order_client_id AND tblorders.order_status = ${constants.ORDER.APPROVE}
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


// get all product-lines
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
				qty: items.product_qty,
				logo: items.product_cover_image
			})
		});
		
		res.writeHead(200, {'Content-type': 'application/json'});
		res.end(JSON.stringify(json_data));

	})
});

// purchase order
app.get('/api/po/:id', function(req, res){
	/*ejs.renderFile('views/POtemplate.ejs', {}, 'utf-8', function(err, contents){
		console.log(contents);
		res.send(contents);
	});*/

	var cid = req.params.id;
	// get company details first 
	con.query(`SELECT tblusers.user_firstname,
		 tblusers.user_lastname,
		 tblclients.client_firstname,
		 tblclients.client_lastname,
		 tblclients.client_mobile,
		 tblclients.client_address,
		 tblclients.client_email,
		 tblsettings.*,
		 order_delivery_charge,
		 order_amount,
		 order_date
		 FROM tblorders 
		 INNER JOIN tblusers ON order_user_id = tblusers.user_id 
		 INNER JOIN tblclients ON order_client_id = tblclients.client_id
		 INNER JOIN tblsettings WHERE order_id = ${cid} LIMIT 1`, function(err, rows){
		 	if (err)
		 		throw err;
		 	rows[0].ref_no = utils.encode_Id(cid,rows[0].order_date);
		 	rows[0].dgenerated = moment_tzone().tz(constants.my_timezone).format(constants.datetime_format2);
		 	

		 	//get each ordered item
		 	con.query(`SELECT 
				tblproducts.product_name, 
				tblproducts.product_description, 
				item_qty, item_subtotal 
				FROM tblorder_items
				INNER JOIN tblproducts ON item_product_id = tblproducts.product_id 
				WHERE item_order_id = ${cid}`, function(er, rs){
					
					res.render('POtemplate', {comp: rows[0], data: rs});
				});
		 })
	
});

//  list of orders
app.get("/api/orders/:type", function(req, res){
	

	var type = req.params.type;
	var stat = {
		pending: [constants.ORDER.PENDING, 'order_id'],
		approved: [constants.ORDER.APPROVE, 'order_update_date'],
		dropped: [constants.ORDER.DROP, 'order_update_date']
	};
	
	if(!stat[type])
		res.end("Error");
	con.query(`SELECT tblorders.*,
	tblclients.client_firstname,
	tblclients.client_lastname,
	tblusers.user_firstname,
	tblusers.user_lastname
	FROM tblorders
	INNER JOIN tblclients ON order_client_id = tblclients.client_id
	INNER JOIN tblusers ON tblorders.order_user_id = tblusers.user_id
	WHERE order_status = ${stat[type][0]}
	ORDER BY ${stat[type][1]} DESC`, function(err, rows){
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
		res.json(out);
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

/* POST routes */
// update Company Profile
app.post('/api/post/update-settings', jsonParser, function(req, res){
	console.log(req.body);
	var input = req.body.data;
	con.query(`UPDATE tblsettings 
		SET comp_name = ${con.escape(input.name)},
		comp_address =${con.escape(input.addr)},
		comp_number = ${con.escape(input.mobile)},
		comp_email = ${con.escape(input.email)},
		comp_warehouse_size = ${con.escape(input.size)}`, function(err){
		 	if (err)
				throw err;
			res.end("Success");
		});
});

 
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

// editing of product-line
app.post("/api/post/edit-prod-line", jsonParser, function(req, res){
	var eid = req.body.id;
	var ename = con.escape(req.body.name);
	// check if there is an existing name
	con.query(`SELECT line_id
		FROM tblproductlines
		WHERE line_name = ${ename} AND line_id != ${eid} AND line_status = 1`, function(err, rows){
			if(err)
				throw err;
			if (rows.length > 0){
				res.send("Line Name Already Exists");
			}
			// update
			else{
				con.query(`UPDATE tblproductlines SET line_name = ${ename}
					WHERE line_id = ${eid}`, function(er){
						if (er)
							throw er;
						res.send("Success");
					});
			}
		})
});

// deletion of Product
app.post("/api/post/del-product", jsonParser, function(req, res){
	// update products field
	var pid = req.body.id;
	con.query(`UPDATE tblproducts 
		SET product_status = 0
		WHERE product_id = ${pid}`, function(err){
			if (err)
				throw err;
			res.send("Success");
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

app.post("/api/post/edit-prod", jsonParser, upload.single('prod_logo'), function(req, res){

	var pdata = JSON.parse(req.body.edit_prod);
	// check if name already exists
	con.query(`SELECT product_id FROM tblproducts WHERE product_name = ${con.escape(pdata.name)} AND product_id  != ${pdata.prod_id} AND product_status = 1`, (err, rows)=>{
		if (err)
			throw err;
		if (rows.length > 0)
			res.send("Product Already exists");
		else{
			// update table
			con.query(`UPDATE tblproducts
				SET product_name = ${con.escape(pdata.name)},
				product_description = ${con.escape(pdata.desc)},
				product_price = ${con.escape(pdata.price)},
				product_qty = ${con.escape(pdata.qty)}
				WHERE product_id  = ${pdata.prod_id}`, function(er){
					if (er)
						throw er;

					// check if there is a photo
					if (req.file){
						var img_name = req.file.filename;
						if (pdata.logo != 'no_content.png'){
							// delete existing photo in the server
							fs.unlink(constants.LOGO_PATH+pdata.logo, function(xer){});
						}

						// update name in the database
						con.query(`UPDATE tblproducts
							SET product_cover_image = ${con.escape(img_name)}
							WHERE product_id = ${pdata.prod_id}`, function(){});
					}
					res.send("Success");				
				});
		}
	})
	
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
			});
			
		}
		utils.subtractOrder(prnt_id, con, function(){
			res.end("Success");
		});
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

 app.post('/api/post/approve-order', jsonParser, function(req, res){
 	var oid = req.body.id;
 	var type = req.body.type;
 	var setter = {
 		approve: [constants.ORDER.APPROVE, 'Approved'],
 		drop: [constants.ORDER.DROP, 'Dropped']
 	};
 	if(!setter[type]){
 		res.end("Error");
 		return;
 	}
 	var now = moment_tzone().tz(constants.my_timezone).format(constants.datetime_format);
 	// update database
 	con.query(`UPDATE tblorders SET order_status = ${setter[type][0]},
 		order_update_date = '${now}'
 	 WHERE order_id = ${oid}`, function(err){
 		if (err)
 			throw err;

 		// update product qunatity upon rejection
 		if (type == 'drop'){
	 		utils.returnOrder(oid, con, function(){
	 			res.send("Order Succesfully "+setter[type][1]);
	 		});
	 	}
 		else
 			res.send("Order Succesfully "+setter[type][1]);
 	});
 	
 });


 // add new user who can login
 app.post('/api/post/add-user', jsonParser, function(req, res){
 	// user must be logged in..
 	/*if (!req.session.user){
 		res.end("Error");
 		return;
 	}*/
 	var data = req.body.data;

 	// check if username already exists
 	con.query(`SELECT user_id FROM tblusers
 		WHERE user_loginname = ${con.escape(data.uname)}`, function(err, rows){
 			if (err)
 				throw err;
 			if (rows.length > 0)
 				res.end("Username alredy exists");
 			else{
 				var sql = `INSERT INTO tblusers
 					(user_firstname,
 					user_lastname,
 					user_number,
 					user_email,
 					user_loginname,
 					user_password)
 					VALUES
 					(${con.escape(data.fname)},
 					${con.escape(data.lname)},
 					${con.escape(data.mobile)},
 					${con.escape(data.email)},
 						${con.escape(data.uname)},
 					${con.escape(sha256(data.pword))})`;
 					console.log(sql);
 				con.query(sql, function(er){
 						if (er)
 							throw er;
 						res.end("User successfully added");
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
