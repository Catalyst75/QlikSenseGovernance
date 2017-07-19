var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");
var log = require("./logger");

module.exports={
  getAppConnections: function(conn_data, global, logging){
    //Creating the promise for the Connections List
    //Root admin privileges should allow him to access to all available connections. Otherwise check your environment's security rules for the designed user.
    var promise_conn_list = new Promise(function(resolve){

      if(logging.log_mode || logging.log_mode_full) log.info("*** Loading the Connections List ***", logging.log_file);

      if(!logging.silent_mode) console.log();
      if(!logging.silent_mode) console.log("*****************************************************");
      if(!logging.silent_mode) console.log("             Loading the Connections List            ");
      if(!logging.silent_mode) console.log("*****************************************************");

      if(logging.log_mode_full) log.debug("Preparing to call getDocList", logging.log_file);

      var start_time = Date.now();

      //Opening the first document in the available documents
      global.getDocList().then(function(documents) {
        
        if(logging.log_mode_full) log.debug("Received response from getDocList", logging.log_file);  
        
        return documents[0].qDocId;       
      }).then(function(documentId){
        //Asking for the available connections of the document
        
        if(logging.log_mode_full) log.debug("Preparing to call openDoc with no data", logging.log_file);

        global.openDoc(documentId,"","","",conn_data.no_data).then(function(app){

          if(logging.log_mode_full) log.debug("Received response from openDoc", logging.log_file);  
          if(logging.log_mode_full) log.debug("Preparing to call getConnections", logging.log_file);

          app.getConnections().then(function(document_connections){
            var received_time = Date.now();
            if(!logging.silent_mode) console.log("It took "+ (received_time-start_time) +"ms to receive the info.");

            var loading_time = 0;
            if(conn_data.timer_mode)
              loading_time=received_time-start_time;

            if(logging.log_mode || logging.log_mode_full) log.info("Received connections list", logging.log_file);
            if(logging.log_mode_full) log.debug("Preparing data for DocumentsConnections_* XML storage", logging.log_file);

            //Setting up data and options for XML file storage
            var data = {
              document_connections,
              qsLoadingTime: loading_time
            };

            var options = {
              useCDATA: true
            }

            var xml_doc_connections = js2xmlparser.parse("documentsConnections", data, options);

            //Storing XML with Connections List
            fs.writeFile('AppStructures/DocumentsConnections_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_doc_connections, function(err) {
              if (err){ 
                if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/DocumentsConnections_" + conn_data.user_directory + "_" + conn_data.user_name + ".xml: " + err, logging.log_file);
                throw err;
              }
              else{
                if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/DocumentsConnections_" + conn_data.user_directory + "_" + conn_data.user_name + ".xml", logging.log_file);
                if(!logging.silent_mode) console.log('DocumentsConnections.xml file saved');
                resolve("Checkpoint: Connections List is loaded");
              }
            });
          });
        })
      })
    }); //promise

    return promise_conn_list;
  }
}