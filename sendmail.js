var mailer = require('./include/mail.js');
mailer.options.subject = 'Hello wow!';
mailer.options.attachments = [
	{
		path: 'x.pdf'
	}
]
mailer.sendMail(function(err, info){
	if (err)
		throw err;
	console.log(info);
});