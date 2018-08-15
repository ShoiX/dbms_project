module.exports = {
	encode_Id: function (id, date){
		var d = new Date(date)
		var prefix = d.getFullYear();
		return prefix+"-"+pad(id, 5);
	}, 
	subtractOrder: function(oid, con, cb){
		// retrieve prod_id and qty from orders
		con.query(`SELECT item_product_id AS pid, item_qty AS qty
			FROM tblorder_items
			WHERE item_order_id = ${oid}`, function(err, rows){
				rows.forEach(d =>{
					// update product quantity
					con.query(`UPDATE tblproducts
						SET product_qty = product_qty - ${d.qty}
						WHERE product_id = ${d.pid}`, function(err2){
							if (err2)
								throw err2;
						});
				});
			});
		cb();	
	}
}

function pad (str, max) {
  str = str.toString();
  return str.length < max ? pad("0" + str, max) : str;
}