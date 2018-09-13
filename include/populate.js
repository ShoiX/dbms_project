var constants = require('./constants');
var moment_tzone = require('moment-timezone');
var moment = require('moment');
var utils = require('./utils');
module.exports = function(workbook, year, con, user = 'Jerryco  Alaba'){
		
	return new Promise(function(resolve){
		
		const date = moment_tzone().tz(constants.my_timezone).format(constants.datetime_format2);
		const qfrom = `'${year}-01-01 0:0:1'`;
		const qto = `'${year}-12-31 23:59:59'`;
		const DateFilter = `order_date BETWEEN ${qfrom} AND ${qto}`;
		const sheet1 = workbook.sheet(0);
		const sheet2 = workbook.sheet(1);
		const sheet3 = workbook.sheet(2);

		// create new promise
		const query1 = new Promise(function(Inresolve){
			// set header
			con.query('SELECT comp_name FROM tblsettings', function(err, row){

				if (err)
					throw err;
				//comp name
				sheet1.cell('E1').value(row[0].comp_name);
				sheet2.cell('C1').value(row[0].comp_name);
				sheet3.cell('C1').value(row[0].comp_name);

				//date
				sheet1.cell('E3').value(date);
				sheet2.cell('C3').value(date);
				sheet3.cell('C3').value(date);

				// user
				sheet1.cell('E4').value(user);
				sheet2.cell('C4').value(user);
				sheet3.cell('C4').value(user);

				// TITLE
				sheet1.cell('F6').value(`${year} SALES REPORT`);
				sheet2.cell('D6').value(`INVENTORY REPORT`);
				sheet3.cell('D6').value(`${year} SALES REPORT SUMMARY`);
				Inresolve();

			});
		});
		const query2 = query1.then(function(){
			// generate order report
			const start = 9;	// starting row to populate
			const sql = `SELECT tblorders.*,
				tblclients.client_firstname,
				tblclients.client_lastname,
				tblusers.user_firstname,
				tblusers.user_lastname
				FROM tblorders
				LEFT JOIN tblclients ON order_client_id = tblclients.client_id
				LEFT JOIN tblusers ON tblorders.order_user_id = tblusers.user_id
				WHERE order_status = ${constants.ORDER.APPROVE} AND 
				${DateFilter}
				ORDER BY order_date DESC`;
			con.query(sql, function(err, rows){
				let sales = 0;
				for (var i = 0; i < rows.length; i++){
					const cur = i+start;
					
					sheet1.cell(`D${cur}`).value(moment(rows[i].order_date).format(constants.datetime_format3));
					sheet1.cell(`E${cur}`).value(moment(rows[i].order_update_date).format(constants.datetime_format3));
					sheet1.cell(`F${cur}`).value(utils.encode_Id(rows[i].order_id, rows[i].order_date));
					sheet1.cell(`G${cur}`).value(`${rows[i].client_firstname} ${rows[i].client_lastname}`);
					sheet1.cell(`H${cur}`).value(rows[i].order_amount);
					sales += rows[i].order_amount;
					sheet1.cell(`I${cur}`).value(`${rows[i].user_firstname} ${rows[i].user_lastname}`);
						
				}
				sheet1.cell('I3').value(sales);
				return;
				
			});
			
		});
		const query3 = query2.then(function(){
			const sql1 = `SELECT *, tblproductlines.line_name, 
			COALESCE(SUM(tblorder_items.item_subtotal),0) AS amtt 
			FROM tblproducts 
			LEFT JOIN tblproductlines ON product_line_id = tblproductlines.line_id 
			LEFT JOIN tblorder_items ON product_id = tblorder_items.item_product_id 
			LEFT JOIN tblorders ON tblorder_items.item_order_id = tblorders.order_id AND tblorders.order_status = ${constants.ORDER.APPROVE}  AND tblorders.${DateFilter}
			GROUP BY product_id 
			ORDER BY tblproductlines.line_name`;
			console.log(sql1)
			con.query(sql1, (err,rows2)=>{
				console.log(rows2);
				const start = 9;
				for (var i = 0; i < rows2.length; i++){
					let curr = i+start;
					//sheet2.cell(`A${curr}`).value(rows[i].line_name);
					sheet2.cell(`B${curr}`).value(rows2[i].product_id);
					sheet2.cell(`C${curr}`).value(rows2[i].product_name);
					sheet2.cell(`D${curr}`).value(rows2[i].product_description);
					sheet2.cell(`E${curr}`).value(rows2[i].product_price);
					sheet2.cell(`F${curr}`).value(rows2[i].product_qty);
					sheet2.cell(`G${curr}`).value(rows2[i].amtt);
				}
					
			});
			
		});
		const query4 = query3.then(function(){
			const sql3 = `SELECT MONTH(order_date) AS mon, SUM(order_amount) AS sum_order 
			FROM tblorders 
			WHERE order_status = ${constants.ORDER.APPROVE} AND ${DateFilter}
			GROUP BY MONTH(order_date)`;
			console.log(sql3);
			con.query(sql3, (err3, rows3)=>{
				console.log(rows3);
				const start = 10;
				for (var i = 0; i < rows3.length; i++){
					let row = rows3[i];
					sheet3.cell(`C${start+row.mon}`).value(row.sum_order);
				}
				resolve(workbook);
			});
			
		});
		
	});
	
}