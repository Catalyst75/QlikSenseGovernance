var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");

module.exports={
  getAppConnections: function(conn_data, global){
    //Creating the promise for the Connections List
    //Root admin privileges should allow him to access to all available connections. Otherwise check your environment's security rules for the designed user.
    var promise_conn_list = new Promise(function(resolve){

      console.log();
      console.log("*****************************************************");
      console.log("             Loading the Connections List            ");
      console.log("*****************************************************");

      //Opening the first document in the available documents
      global.getDocList().then(function(documents) {
        return documents[0].qDocId;       
      }).then(function(documentId){
        //Asking for the available connections of the document
        global.openDoc(documentId,"","","",conn_data.no_data).then(function(app){
          app.getProperties().then(function(reply) {
            app.getConnections().then(function(document_connections){
              //Setting up data and options for XML file storage
              var data = {
                document_connections
              };

              var options = {
                useCDATA: true
              }

              var xml_doc_connections = js2xmlparser("documentsConnections", data, options);

              //Storing XML with Connections List
              fs.writeFile('AppStructures/DocumentsConnections_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_doc_connections, function(err) {
                if (err) throw err;
                console.log('DocumentsConnections.xml file saved');
                resolve("Checkpoint: Connections List is loaded");
              });
            });
          })
        })
      })
    }); //promise

    return promise_conn_list;
  }
}