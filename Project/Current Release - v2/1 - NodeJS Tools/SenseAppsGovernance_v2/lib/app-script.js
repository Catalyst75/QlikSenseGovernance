var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");

module.exports={
  getAppScrpts: function(conn_data, global, cookies, single_app){
    //Creating the promise for the Applications Scripts
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.
    var promise_app_scripts = new Promise(function(resolve){

      console.log();
      console.log("*****************************************************");
      console.log("               Loading the Scripts Infos             ");
      console.log("*****************************************************");

        global.getDocList().then(function(documents) {
          var available_docs = [];
          documents.forEach(function(document_entry){
            available_docs.push(document_entry.qDocId);
          });
          
          console.log("Processing each document")
          if(single_app){
            console.log("verifying user can access");
            var access_app = false;
            available_docs.forEach(function(application){
              if(application == conn_data.single_app_id)
                access_app = true;
            });
            if(access_app)
              getAppScript([conn_data.single_app_id]);
            else
              resolve("Checkpoint: User has no access to this applications") 
          }else{
            if(available_docs.length>0)
              getAppScript(available_docs);  
            else
              resolve("Checkpoint: The user has no available documents")
          }     
        })

        //Loading tables from all the documents, one at the time
        function getAppScript(document_list){
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
            var start_time = Date.now();
            global.openDoc(config_app.appname,"","","",conn_data.no_data).then(function(app) {
              var openDoc_time = Date.now();
              console.log("It took "+ (openDoc_time-start_time) +"ms to open the app.");

              //requesting the script of the document
              app.getScript().then( scrpt =>{
                var script_time = Date.now();
                  console.log("It took "+ (script_time-openDoc_time) +"ms to receive the script info.");

                  var open_doc_loading_time = 0;
                  var loading_time = 0;

                  if(conn_data.timer_mode){
                    open_doc_loading_time=openDoc_time-start_time;
                    loading_time=script_time-openDoc_time;
                }

                var script_lines = [];
                script_lines = scrpt.split('\n');
                
                var connect_statements = [];
                script_lines.forEach(function (line, index){
                  var new_line = line.replace('\t','').replace('\r','');
                  if(new_line.search('LIB CONNECT TO ')>-1){
                    connect_statements.push({ statement: new_line, 
                                              library: new_line.replace('LIB CONNECT TO ','').replace('"','').replace('[','').replace(']','').replace(';',''),
                                              script_line: index+1});
                  }
                });

                var data = { script : scrpt, connect_statements : connect_statements };
                var options = { useCDATA : true };

                //Storing XML with script info
                var xml_doc_script = js2xmlparser.parse("documentScript", data, options);

                fs.writeFileSync('AppStructures/'+config_app.appname+'_ScriptInfo_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml',xml_doc_script);

                console.log(' - '+config_app.appname+'_ScriptInfo_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                console.log();
                console.log(" Updating the remaining list");
                console.log(" Remaining applications: "+document_list.length);

                // Checking if all documents were processed
                if(document_list.length>0){
                  getAppScript(document_list);
                }
                else{
                    resolve("Checkpoint: Applications Scripts are loaded");
                  }
              });
            })
          })
        }// getAppScrpts
    });//promise
    return promise_app_scripts;
  }//get app scripts
}//module exports