var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");

module.exports={
  getAppList: function(conn_data, global){
    //Creating the promise for the Applications List
    var promise_app_list = new Promise(function(resolve, reject){

      console.log("*****************************************************");
      console.log("            Loading the Applications List            ");
      console.log("*****************************************************");
      global.getDocList().then(function(documents) {
        //Setting up data and options for XML file storage
        var data = {
            documents
        }

        var options = {
          useCDATA: true
        }

        var xml_doc_list = js2xmlparser("documentsList", data, options);

        //Storing XML with Applications List
        fs.writeFile('AppStructures/DocumentsList.xml', xml_doc_list, function(err) {
          if (err) throw err;
          console.log('DocumentsList.xml file saved');
          resolve("Checkpoint: Applications List is loaded");
        }); 
      });
    });

    return promise_app_list;
  }
}