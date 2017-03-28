var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");
var log = require("./logger");

module.exports={
  getAppTbls: function(conn_data, global, cookies, single_app, logging){
    //Creating the promise for the Applications Tables
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.
    var promise_app_tables = new Promise(function(resolve){

      if(logging.log_mode || logging.log_mode_full) log.info("*** Loading the Tables List ***", logging.log_file);

      if(!logging.silent_mode) console.log();
      if(!logging.silent_mode) console.log("*****************************************************");
      if(!logging.silent_mode) console.log("               Loading the Tables List               ");
      if(!logging.silent_mode) console.log("*****************************************************");

      if(!conn_data.no_data){
        //Loading a list of all the available documents

        if(logging.log_mode_full) log.debug("Preparing to call getDocList", logging.log_file);

        global.getDocList().then(function(documents) {

          if(logging.log_mode_full) log.debug("Received response from getDocList", logging.log_file); 

          var available_docs = [];
          documents.forEach(function(document_entry){
            available_docs.push(document_entry.qDocId);
          });
          
          if(!logging.silent_mode) console.log("Processing each document");
          if(single_app){
            if(!logging.silent_mode) console.log("Verifying user can access");

            if(logging.log_mode_full) log.debug("Single App mode - verifying user access", logging.log_file); 

            var access_app = false;
            available_docs.forEach(function(application){
              if(application == conn_data.single_app_id)
                access_app = true;
            });

            if(access_app){
                if(logging.log_mode || logging.log_mode_full) log.info("Single App mode - User has access to this application", logging.log_file); 
                getAppTables([conn_data.single_app_id]);
              }else{
              if(logging.log_mode || logging.log_mode_full) log.info("Single App mode - User has no access to this application", logging.log_file); 
              resolve("Checkpoint: User has no access to this application");
            }
          }else{
            if(available_docs.length>0){
                if(logging.log_mode || logging.log_mode_full) log.info("Processing each application", logging.log_file); 
                getAppTables(available_docs); 
              }else{
              if(logging.log_mode || logging.log_mode_full) log.info("The user has no available documents", logging.log_file); 
              resolve("Checkpoint: The user has no available documents");
            }
          }     
        })

        //Loading tables from all the documents, one at the time
        function getAppTables(document_list){
          var first_app = document_list.shift();
          if(!logging.silent_mode) console.log();
          if(!logging.silent_mode) console.log("Application: "+first_app);

          if(logging.log_mode || logging.log_mode_full) log.info("Loading tables for application " + first_app, logging.log_file); 

          //Configurations to open the first document (based on mindspank's https://github.com/mindspank/qsocks examples)
          var o = 'http://'+conn_data.origin;

          var config_app = {
            host: conn_data.server_address,
            isSecure: true,
            origin: o,
            rejectUnauthorized: false,
            appname: first_app,
            headers: {
              "Content-Type": "application/json",
              "Cookie": cookies[0]
            }
          }

          if(logging.log_mode_full) log.debug("Preparing to call Connect", logging.log_file);

          //Scoped connection for the document
          qsocks.Connect(config_app).then(function(global) {

            if(logging.log_mode_full) log.debug("Connected to engine", logging.log_file);
            if(logging.log_mode_full) log.debug("Preparing to call openDoc", logging.log_file);

            var start_time = Date.now();
            global.openDoc(config_app.appname,"","","",conn_data.no_data).then(function(app) {
              var openDoc_time = Date.now();
              if(!logging.silent_mode) console.log("It took "+ (openDoc_time-start_time) +"ms to open the app.");

              if(logging.log_mode_full) log.debug("Received response from openDoc", logging.log_file);

              var params = {
                "qWindowSize": {
                  "qcx": 0,
                  "qcy": 0
                },
                "qNullSize": {
                  "qcx": 0,
                  "qcy": 0
                },
                "qCellHeight": 0,
                "qSyntheticMode": false,
                "qIncludeSysVars": false
              }

              //Requesting the tables of the document
              if(logging.log_mode_full) log.debug("Preparing to call getTablesAndKeys", logging.log_file);

              app.getTablesAndKeys(params.qWindowSize,params.qNullSize,params.qCellHeight,params.qSyntheticMode,params.qIncludeSysVars)
              .then(function(key_tables){
                var tables_time = Date.now();
                if(!logging.silent_mode) console.log("It took "+ (tables_time-openDoc_time) +"ms to receive the tables info.");

                var open_doc_loading_time = 0;
                var loading_time = 0;

                if(conn_data.timer_mode){
                  open_doc_loading_time=openDoc_time-start_time;
                  loading_time=tables_time-openDoc_time;
                }

                if(logging.log_mode || logging.log_mode_full) log.info("Received Tables List", logging.log_file);
                if(logging.log_mode_full) log.debug("Preparing data for *_KeyTables_* XML file storage", logging.log_file);

                //Setting up data and options for XML file storage
                var data = {
                  key_tables,
                  qsOpenDocTime: open_doc_loading_time,
                  qsLoadingTimeTable: loading_time
                };

                return data;
              })
              .then(function(data){
                var options = {
                  useCDATA: true
                };

                //Storing XML with Tables info
                var xml_doc_key_tables = js2xmlparser.parse("documentsKeyTables", data, options);
                fs.writeFile("AppStructures/"+config_app.appname+"_KeyTables_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", xml_doc_key_tables, function(err) {
                  if (err) {
                    if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/" + config_app.appname + "_KeyTables_" + conn_data.user_directory + "_" + conn_data.user_name + ".xml: " + err, logging.log_file);
                    throw err;
                  }else{
                    if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/"+config_app.appname+"_KeyTables_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", logging.log_file);

                    if(!logging.silent_mode) console.log(" - "+config_app.appname+"_KeyTables_"+conn_data.user_directory + "_" + conn_data.user_name+".xml file saved");
                    if(!logging.silent_mode) console.log();
                    if(!logging.silent_mode) console.log(" Updating the remaining list");
                    if(!logging.silent_mode) console.log(" Remaining applications: "+document_list.length);
                  }
                  //Checking if all documents were processed
                  if(document_list.length>0){
                    if(logging.log_mode || logging.log_mode_full) log.info(document_list.length + " remaining applications. Updating remaining list.", logging.log_file);
                    getAppTables(document_list);
                  }else{
                      if(logging.log_mode || logging.log_mode_full) log.info("Applications Tables are loaded", logging.log_file);
                      resolve("Checkpoint: Applications Tables are loaded");
                    }
                });
              })
            })
          })
        }// getAppTables
      }else{
        if(logging.log_mode || logging.log_mode_full) log.info("No data mode -  skipping tables", logging.log_file);
        resolve("No data mode: skipping tables.");
      }  
    });//promise
    return promise_app_tables;
  }//get app tables
}//module exports