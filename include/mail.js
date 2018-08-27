var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
        user: 'shoixshoix@gmail.com',
        pass: 'Mmdapo09!'
    }
});


const defaultOptions = {
  from: 'shoixshoix@gmail.com', // sender address
  to: 'jerrycoalaba@gmail.com', // list of receivers
  subject: 'Subject of your email', // Subject line
  html: '<p>Your html here</p>'// plain text body
};

var mailOptions = defaultOptions;

module.exports.options = mailOptions;
module.exports.sendMail = function(cb){
    transporter.sendMail(mailOptions, function (err, info) {
        cb(err, info);
        var mailOptions = defaultOptions;
    });
}

