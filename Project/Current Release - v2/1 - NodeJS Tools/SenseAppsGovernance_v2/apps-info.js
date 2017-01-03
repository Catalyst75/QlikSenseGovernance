var https = require('https');
var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var Promise = require("promise");
var js2xmlparser = require('js2xmlparser');
var os = require('os');

var appList = require('./lib/app-list');
var connList = require('./lib/app-connections');
var appTables = require('./lib/app-tables');
var appScripts = require('./lib/app-script');
var libDimensions = require('./lib/app-library-dimensions');
var libMeasures = require('./lib/app-library-measures');
var libObjects = require('./lib/app-library-masterobjects');
var appBookmarks = require('./lib/app-bookmarks');
var appSheets = require('./lib/app-sheets');
var appStories = require('./lib/app-stories');

var cmd_args = process.argv;
var using_defaults = true;
var server_address = 'localhost';
var server_certificate = __dirname + '\\client.pfx';
var pem_client_key_certificate = __dirname + '\\client_key.pem';
var pem_client_certificate = __dirname + '\\client.pem';
var pem_root_certificate = __dirname + '\\root.pem';
var user_directory = '';
var user_name = '';
var origin = 'localhost';
var single_app = false;
var single_user = false;
var single_app_id = '';
var users_list = [];
var no_data = false;
var timer_mode = false;

var start_time = new Date();

cmd_args.forEach(function(val,index){
	if(index!=0 && index!=1){
		switch(val){
			case '-h': 
				helper();
				break;
			case '-a':
				if(cmd_args[index+1]){
						server_address = cmd_args[index+1];
						using_defaults=false;
					}
				else{
					console.log("Please check the server address argument. Type '-h' for help.");
					process.exit();
				}
				break;
			case '-c':
				if(cmd_args[index+1]){
					server_certificate = cmd_args[index+1];
					using_defaults=false;
				}
				else{
					console.log("Please check the server certificate file path argument. Type '-h' for help.");
					process.exit();
				}
				break;
			case '-ud':
				if(cmd_args[index+1])
					user_directory = cmd_args[index+1];
				else{
					console.log("Please check the user directory argument. Type '-h' for help.");
					process.exit();
				}
				break;
			case '-un':
				if(cmd_args[index+1])
					user_name = cmd_args[index+1];
				else{
					console.log("Please check the user name argument. Type '-h' for help.");
					process.exit();
				}
				break;
			case '-o':
				if(cmd_args[index+1]){
					origin = cmd_args[index+1];
					using_defaults=false;
				}
				else{
					console.log("Please check the origin address argument. Type '-h' for help.");
					process.exit();
				}
				break;
			case '-s':
				if(cmd_args[index+1]){
					single_app_id = cmd_args[index+1];
					single_app=true;
				}
				else{
					console.log("Please check the application id argument. Type '-h' for help.");
					process.exit();
				}
				break;
			case '-su':
					single_user=true;
				break;
			case '-nd':
					no_data=true;
				break;	
			case '-t':
					timer_mode=true;
				break;	
			default:
				if (cmd_args[index-1]!='-h'&&cmd_args[index-1]!='-a'&&cmd_args[index-1]!='-c'&&cmd_args[index-1]!='-ud'&&cmd_args[index-1]!='-un'&&cmd_args[index-1]!='-o'&&cmd_args[index-1]!='-s'&&cmd_args[index-1]!='-su'&&cmd_args[index-1]!='-nd'&&cmd_args[index-1]!='-t')
				console.log("'"+val+"' is not a valid command. Type '-h' for help.");
				break;
		}
	}
})

//check for root admin specification to be different than null
if(user_directory=='' || user_name==''){
	console.log("Root admin is not correctly specified. Type '-h' for help.");
	process.exit();
}

console.log();
console.log("--- Loading the Applications Information for your environment ---");

//default configs warning
if(using_defaults){
	console.log();
	console.log("Warning: besides user identification, you are using all");
	console.log("         the default configurations.");
}

//Loading apps users ownership
var get_app_owners = {
   hostname: server_address,
   port: 4242,
   path: '/qrs/app/full?xrfkey=abcdefghijklmnop',
   method: 'GET',
   headers: {
      'x-qlik-xrfkey' : 'abcdefghijklmnop',
      'X-Qlik-User' : 'UserDirectory= ' + user_directory + '; UserId= '+ user_name +' '
   },
   key: fs.readFileSync(pem_client_key_certificate),
   cert: fs.readFileSync(pem_client_certificate),
   ca: fs.readFileSync(pem_root_certificate)
};

https.get(get_app_owners, function(res) {
   var message_body = '';
   res.on("data", function(chunk) {
   		message_body +=chunk;
   });
   res.on("end",function(){
   	var doc_owners = JSON.parse(message_body);
   	var data = { doc_owners };
   	var options = { useCDATA: true };

   	//creating an array with apps for script parser
 	var available_docs = [];
	doc_owners.forEach(function(document_entry){
		available_docs.push(document_entry.id);
	});
	fs.writeFileSync('ScriptParsingTool/ApplicationsList.json',JSON.stringify(available_docs,null,2));


   	var xml_doc_owners_list = js2xmlparser.parse("documentsList_Owners", data, options);

    //Storing XML with Applications List
    fs.writeFile('AppStructures/DocumentsList_Owners.xml', xml_doc_owners_list, function(err) {
      if (err) throw err;
    }); 
   });
   }).on('error', function(e) {
      console.log("Got error: " + e.message);
});

users_list.push({userDirectory: user_directory.toUpperCase(), userId: user_name});

if(!single_user)
{ //loading a list of all users to get their personal developments
	var get_ulist_options = {
	   hostname: server_address,
	   port: 4242,
	   path: '/qrs/user?xrfkey=abcdefghijklmnop',
	   method: 'GET',
	   headers: {
	      'x-qlik-xrfkey' : 'abcdefghijklmnop',
	      'X-Qlik-User' : 'UserDirectory= ' + user_directory + '; UserId= '+ user_name +' '
	   },
	   key: fs.readFileSync(pem_client_key_certificate),
	   cert: fs.readFileSync(pem_client_certificate),
	   ca: fs.readFileSync(pem_root_certificate)
	};

	https.get(get_ulist_options, function(res) {
	   res.on("data", function(chunk) {
	      var jsonified = JSON.parse(chunk);
	      for (var i = 0; i < jsonified.length; i++){
	         if(jsonified[i].userDirectory != 'INTERNAL' && !(jsonified[i].userDirectory.toUpperCase() == user_directory.toUpperCase() && jsonified[i].userId.toUpperCase() == user_name.toUpperCase())){
	            users_list.push({userDirectory: jsonified[i].userDirectory, userId: jsonified[i].userId});
	         }
	      }
	      appsInfo(users_list);

	   });
	   }).on('error', function(e) {
	      console.log("Got error: " + e.message);
	});
}
else {
	appsInfo(users_list);
}

//Load apps infos 
function appsInfo(users_list){
	// console.log("Users to load: ", users_list);
	console.log("Loading information as user: " + users_list[0].userDirectory + "\\" + users_list[0].userId);
	
	//setting up the connection (based on mindspank's https://github.com/mindspank/qsocks examples)
	var connection_data = {
		server_address : server_address,
		server_certificate : server_certificate,
		user_directory : users_list[0].userDirectory,
		user_name : users_list[0].userId,
		origin : origin,
		single_app_id: single_app_id,
		no_data: no_data,
		timer_mode: timer_mode
	}

	//Request defaults
	var r = request.defaults({
		rejectUnauthorized: false,
		host: connection_data.server_address,
		pfx: fs.readFileSync(connection_data.server_certificate)
	})

	//Authenticating the user
	var b = JSON.stringify({
		"UserDirectory": connection_data.user_directory,
		"UserId": connection_data.user_name,
		"Attributes": []
	});

	var u = 'https://'+connection_data.server_address+':4243/qps/ticket?xrfkey=abcdefghijklmnop';

	r.post({
		uri: u,
		body: b,
		headers: {
		  'x-qlik-xrfkey': 'abcdefghijklmnop',
		  'content-type': 'application/json'
		}
	},
	function(err, res, body) {

		var hub = 'https://'+connection_data.server_address+'/hub/?qlikTicket=';
	    var ticket = JSON.parse(body)['Ticket'];

	    r.get(hub + ticket, function(error, response, body) {

			var cookies = response.headers['set-cookie'];
			var o = 'http://'+connection_data.origin;

			var config = {
				host: connection_data.server_address,
				isSecure: true,
				origin: o,
				rejectUnauthorized: false,
				headers: {
				  "Content-Type": "application/json",
				  "Cookie": cookies[0]
				}
			}

			//  Connect to qsocks/qix engine
	        qsocks.Connect(config).then(function(global) {
	        	// console.log(global);

	        	run(connection_data, single_app);

				function run(connection_data, single_app){
					appList.getAppList(connection_data, global).then(function(apl_msg){
						console.log(apl_msg);
						connList.getAppConnections(connection_data, global).then(function(cn_msg){
							console.log(cn_msg);
							appTables.getAppTbls(connection_data, global, cookies, single_app).then(function(tbl_msg){
								console.log(tbl_msg);
								appScripts.getAppScrpts(connection_data, global, cookies, single_app).then(function(scrpt_msg){
									console.log(scrpt_msg);
									libDimensions.getLibDimensions(connection_data, global, cookies, single_app).then(function(libDim_msg){
										console.log(libDim_msg);
										libMeasures.getLibMeasures(connection_data, global, cookies, single_app).then(function(libMsr_msg){
											console.log(libMsr_msg);
											libObjects.getLibObjects(connection_data, global, cookies, single_app).then(function(libObj_msg){
												console.log(libObj_msg);
												appBookmarks.getBookmarks(connection_data, global, cookies, single_app).then(function(bmk_msg){
													console.log(bmk_msg);
													appSheets.getSheets(connection_data, global, cookies, single_app).then(function(sht_msg){
														console.log(sht_msg);
														appStories.getAppStories(connection_data, global, cookies, single_app).then(function(str_msg){
															console.log(str_msg);
															console.log("Success: Finished loading all the data for your user " + users_list[0].userDirectory + "\\" + users_list[0].userId);
															users_list.shift();
															if(users_list.length==0){
																var end_time = new Date();
																var site_accessed_inf = {
																	hostname: (server_address=='localhost') ? os.hostname(): server_address,
																	user_directory: user_directory,
																	user_name: user_name, 
																	timer_flag: timer_mode,
																	single_user: single_user,
																	no_data: no_data,
																	start_timestamp: start_time.getFullYear()+'-'
																		   			+start_time.getMonth(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'-'
																		   			+start_time.getDate(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'T'
																		   			+start_time.getHours(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
																		   			+start_time.getMinutes(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
																		   			+start_time.getSeconds(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'.'
																		   			+start_time.getMilliseconds(000).toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping:false})+'Z',
																	end_timestamp: end_time.getFullYear()+'-'
																		   			+end_time.getMonth(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'-'
																		   			+end_time.getDate(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'T'
																		   			+end_time.getHours(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
																		   			+end_time.getMinutes(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+':'
																		   			+end_time.getSeconds(00).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})+'.'
																		   			+end_time.getMilliseconds(000).toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping:false})+'Z'
																}

																var options = { useCDATA: true };

																var xml_run_options = js2xmlparser.parse("run_options", site_accessed_inf, options);

														        //Storing XML run options
														        fs.writeFileSync('AppStructures/RunOptions.xml', xml_run_options);

														        console.log();
														        console.log("--- Finished loading the Applications Information for your environment! ---");
														        console.log();
														        console.log("You may now attempt to parse your applications script logs");
														        console.log("using the included 'ScriptParsingTool'.")

																process.exit();
														 	}else
																appsInfo(users_list);
														});//app stories
													});//app sheets
												});//app bookmarks
											});//lib objects
										});//lib measures
									});//lib dimensions
								});//app scripts
							});//app tables
						});// connections
					}); //app list
				}// run 
	        })//qsocks connect (global)
	    });// r.get
	});// r
}//appsInfo()




/***************************
	Command Line Helper
***************************/
function helper(){
	console.log();
	console.log("******************************************************");
	console.log("    Welcome to the Applications Information Loader    ");
	console.log("           for your Qlik Server Environment           ");
	console.log("******************************************************");
	console.log("              Configuration instructions              ");
	console.log();
	console.log("This tool requires the following information.");
	console.log();
	console.log("* Qlik Sense Server")
	console.log("  -a: Qlik Sense Server address.")
	console.log("      Default if unspecified: 'localhost'")
	console.log();
	console.log("  -c: Qlik Sense Server certificate location (at the ");
	console.log("      moment it was only tested with blank password");
	console.log("      certificates). If the path has spaces, indicate it");
	console.log("      using double quotes.");
	console.log("      Default if unspecified: file 'client.pfx' at root");
	console.log("      folder of this tool")
	console.log();
	console.log();
	console.log("* Root Admin")
	console.log(" -ud: User Directory of the Qlik Sense Server Root Admin");
	console.log("       to call the server API functions");
	console.log("       This is mandatory.")
	console.log();
	console.log(" -un: User Name of the Qlik Sense Server Root Admin to");
	console.log("       call the server API functions");
	console.log("       This is mandatory.")
	console.log();
	console.log();
	console.log("* Origin address for the request (this computer)")	
	console.log("  -o: This is optional. Default value is 'localhost'. ");
	console.log("      The origin specified needs an entry in the Whitelist");
	console.log("      for the virtual proxy to allow websocket communication.");
	console.log();
	console.log();
	console.log("* Additional Options")	
	console.log("  -s: Single application mode.");
	console.log("      Load information of only one application given it's ID.");
	console.log("      Applications list and connections are still fully loaded.");
	console.log();
	console.log(" -su: Single user mode.");
	console.log("      Load information of only for the user specified as Root Admin.");
	console.log();
	console.log(" -nd: No data mode.");
	console.log("      Load information without loading the data of the applications.");
	console.log("      Warning: this mode cannot get file size and tables information.");
	console.log("      Recommended use for refreshing application metadata only, i.e.");
	console.log("      library items, users objects, sheets and stories, etc.");
	console.log();
	console.log("  -t: Timer mode on.");
	console.log("      Stores timings for each components load. This features helps to");
	console.log("      understand calculation times for all executed server(s) requests.");
	console.log("      Warning: only use this feature right after an engine start or restart");
	console.log("      to load accurate timings instead of timings based on cached results.");
	console.log();
	console.log("  -h: Launches this helper.");
	process.exit();
}