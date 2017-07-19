var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");
var log = require("./logger");

module.exports={
  getAppList: function(conn_data, global, logging){
    //Creating the promise for the Applications List
    var promise_app_list = new Promise(function(resolve, reject){

      // log.info("", log_file);
      if(logging.log_mode || logging.log_mode_full) log.info("*** Loading the Applications List ***", logging.log_file);
      // log.info("", log_file);

      if(!logging.silent_mode) console.log("*****************************************************");
      if(!logging.silent_mode) console.log("            Loading the Applications List            ");
      if(!logging.silent_mode) console.log("*****************************************************");

      if(logging.log_mode_full) log.debug("Preparing to call getDocList", logging.log_file);

      var start_time = Date.now();

      global.getDocList().then(function(documents) {
        //Setting up data and options for XML file storage

        var received_time = Date.now();
        if(!logging.silent_mode) console.log("It took "+ (received_time-start_time) +"ms to receive the info.");

        var loading_time = 0;
        if(conn_data.timer_mode)
          loading_time=received_time-start_time;

        if(logging.log_mode || logging.log_mode_full) log.info("Received applications (documents) list", logging.log_file);
        if(logging.log_mode_full) log.debug("Preparing data for DocumentsList_* XML storage", logging.log_file);
        
        var data = {
            documents,
            qsLoadingTime: loading_time
        }

        var options = {
          useCDATA: true
        }

        var xml_doc_list = js2xmlparser.parse("documentsList", data, options);

        //Storing XML with Applications List
        fs.writeFile('AppStructures/DocumentsList_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_doc_list, function(err) {
          if (err){
           if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/DocumentsList_" + conn_data.user_directory + "_" + conn_data.user_name + ".xml: " + err, logging.log_file);
           throw err;
         }
          else {
              if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/DocumentsList_" + conn_data.user_directory + "_" + conn_data.user_name + ".xml", logging.log_file);
              if(!logging.silent_mode) console.log('DocumentsList.xml file saved');
              resolve("Checkpoint: Applications List is loaded");
            }
        }); 
      });
    });

    return promise_app_list;
  }
}