module.exports = {
	encode_Id: function (id, date){
		var d = new Date(date)
		var prefix = d.getFullYear();
		return prefix+"-"+pad(id, 5);
	}
}

function pad (str, max) {
  str = str.toString();
  return str.length < max ? pad("0" + str, max) : str;
}