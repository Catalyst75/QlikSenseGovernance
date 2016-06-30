var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");

module.exports={
  getAppTbls: function(conn_data, global, cookies, single_app){
    //Creating the promise for the Applications Tables
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.
    var promise_app_tables = new Promise(function(resolve){

      console.log();
      console.log("*****************************************************");
      console.log("               Loading the Tables List               ");
      console.log("*****************************************************");

      //Loading a list of all the available documents
      if(single_app)
        getAppTables([conn_data.single_app_id]); 
      else{
        global.getDocList().then(function(documents) {
          var available_docs = [];
          documents.forEach(function(document_entry){
            available_docs.push(document_entry.qDocId);
          });
  
          console.log("Processing each document")
          getAppTables(available_docs);        
        })
      }
      //Loading tables from all the documents, one at the time
      function getAppTables(document_list){
        var first_app = document_list.shift();
        console.log();
        console.log("Application: "+first_app);

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

        //Scoped connection for the document
        qsocks.Connect(config_app).then(function(global) {
          global.openDoc(config_app.appname).then(function(app) {
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
            app.getTablesAndKeys(params.qWindowSize,params.qNullSize,params.qCellHeight,params.qSyntheticMode,params.qIncludeSysVars)
            .then(function(key_tables){
              //Setting up data and options for XML file storage
              var data = {
                key_tables
              };

              return data;
            })
            .then(function(data){
              var options = {
                useCDATA: true
              };

              //Storing XML with Tables info
              var xml_doc_key_tables = js2xmlparser("documentsKeyTables", data, options);
              fs.writeFile('AppStructures/'+config_app.appname+'_KeyTables_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_doc_key_tables, function(err) {
                if (err) throw err;
                console.log(' - '+config_app.appname+'_KeyTables_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                console.log();
                console.log(" Updating the remaining list");
                console.log(" Remaining applications: "+document_list.length);
                //Checking if all documents were processed
                if(document_list.length>0){
                  getAppTables(document_list);
                }
                else{
                    resolve("Checkpoint: Applications Tables are loaded");
                  }
              });
            })
          })
        })
      }// getAppTables
    });//promise
    return promise_app_tables;
  }//get app tables
}//module exports