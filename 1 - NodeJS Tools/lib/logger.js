var fs = require('fs');
var os = require('os');

var log_pah = './Logs/';

module.exports={
// Log Levels
// 0 - Error: stores error on file and terminates execution
// 1 - Warning: stores error on file but does not terminate execution
// 2 - Info: Information as indicated in console.log()
// 3 - Debug: Detail information not indicated in console.log()

	error: function(message, file){
		var start_time = new Date();
		log_time = 	start_time.getFullYear()+'-'
					+start_time.getMonth(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'-'
					+start_time.getDate(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'T'
					+start_time.getHours(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
					+start_time.getMinutes(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
					+start_time.getSeconds(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'.'
					+start_time.getMilliseconds(000).toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping:false})+'Z';
		fs.writeFile(log_pah+file, log_time
									+'\tERROR\t'
									+message+ os.EOL, {flag : 'a+'}, (error) =>{
			process.exit();
		});
	},//error
	warning: function(message, file){
		var start_time = new Date();
		log_time = 	start_time.getFullYear()+'-'
					+start_time.getMonth(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'-'
					+start_time.getDate(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'T'
					+start_time.getHours(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
					+start_time.getMinutes(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
					+start_time.getSeconds(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'.'
					+start_time.getMilliseconds(000).toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping:false})+'Z';
		fs.writeFileSync(log_pah+file,log_time
									+'\tWARNING\t'
									+message+ os.EOL, {flag : 'a+'});
	},//warning
	info: function(message, file){
		var start_time = new Date();
		log_time = 	start_time.getFullYear()+'-'
					+start_time.getMonth(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'-'
					+start_time.getDate(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'T'
					+start_time.getHours(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
					+start_time.getMinutes(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
					+start_time.getSeconds(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'.'
					+start_time.getMilliseconds(000).toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping:false})+'Z';
		fs.writeFileSync(log_pah+file,log_time
									+'\tINFO\t'
									+message+ os.EOL, {flag : 'a+'});
	},//info
	debug: function(message, file){
		var start_time = new Date();
		log_time = 	start_time.getFullYear()+'-'
					+start_time.getMonth(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'-'
					+start_time.getDate(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'T'
					+start_time.getHours(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
					+start_time.getMinutes(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
					+start_time.getSeconds(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'.'
					+start_time.getMilliseconds(000).toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping:false})+'Z';
		fs.writeFileSync(log_pah+file, log_time
									+'\tDEBUG\t'
									+message+ os.EOL, {flag : 'a+'});
	},//debug
	header: function(file){
		fs.writeFileSync(log_pah+file, 'Timestamp\tSeverity\tMessage'+ os.EOL, {flag : 'a+'});
	}//header
}