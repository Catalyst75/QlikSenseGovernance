var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");

module.exports={
  getAppList: function(conn_data, global){
    //Creating the promise for the Applications List
    var promise_app_list = new Promise(function(resolve, reject){

      //console.log(conn_data);

      console.log("*****************************************************");
      console.log("            Loading the Applications List            ");
      console.log("*****************************************************");

      var start_time = Date.now();

      global.getDocList().then(function(documents) {
        //Setting up data and options for XML file storage

        var received_time = Date.now();
        console.log("It took "+ (received_time-start_time) +"ms to receive the info.");
        var loading_time = 0;
        if(conn_data.timer_mode)
          loading_time=received_time-start_time;
        
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
          if (err) throw err;
          console.log('DocumentsList.xml file saved');
          resolve("Checkpoint: Applications List is loaded");
        }); 
      });
    });

    return promise_app_list;
  }
}