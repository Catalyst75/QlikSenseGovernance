var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");

module.exports={
  getLibObjects: function(conn_data, global, cookies, single_app){
    var promise_lib_obj = new Promise(function(resolve){
    //Creating the promise for the Applications Library Master Objects
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.      

      console.log();
      console.log("*****************************************************");
      console.log("       Loading the Library Master Objects List       ");
      console.log("*****************************************************");

      //Loading a list of all the available documents
      if(single_app)
        getAppLibraryMasterObjects([conn_data.single_app_id]);
      else{
        global.getDocList().then(function(documents) {
          var available_docs = [];
          documents.forEach(function(document_entry){
            available_docs.push(document_entry.qDocId);
          });

          console.log("Processing each document");
          getAppLibraryMasterObjects(available_docs); 
        })
      }
      
      //Loading library master objects from all the documents, one at the time
      function getAppLibraryMasterObjects(document_list){
        console.log();
        console.log("──────────────────────────────────────");
        var first_app = document_list.shift();
        console.log(first_app);
        console.log("──────────────────────────────────────");

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
            //Checking for the document's contents and focusing on the master objects
            app.getAllInfos().then(function(appInfos){
              var masterobjects_list = [];
              appInfos.qInfos.forEach(function(document_infos){
                if(document_infos.qType=='masterobject'){
                  masterobjects_list.push(document_infos.qId)
                }
              })
              console.log(" Loading master objects details:");

              //Verifying if the document has library master objects
              if(masterobjects_list.length>0)
                getMasterObjectsDetails(masterobjects_list);
              else if(masterobjects_list.length==0 && document_list.length>0){
                console.log();
                console.log(" Loaded all master objects. Jumping to next application.");
                console.log(" Remaining applications: " + document_list.length);
                getAppLibraryMasterObjects(document_list);
              }
              else if(masterobjects_list.length==0 && document_list.length==0){ //checking if all master objects and documents were processed
                console.log("──────────────────────────────────────");
                resolve("Checkpoint: Applications Library Master Objects are loaded");
              }
              else{
                console.log("──────────────────────────────────────");
                console.log ("Shouldn't be here, something went wrong...");
                process.exit();
              }

              //Loading the library master objects of the document, one library master object at the time
              function getMasterObjectsDetails(masterobjects_list){
                var first_masterobject = masterobjects_list.shift();
                console.log();
                console.log(" Master object id: "+first_masterobject);

                app.getObject(first_masterobject).then(function(obj){
                  //Loading the master object's layout properties
                  obj.getLayout().then(function(obj_layout){
                    // console.log(obj_layout);
                    obj_layout = {
                      qInfo: obj_layout.qInfo,
                      qMeta: obj_layout.qMeta,
                      qHyperCube: obj_layout.qHyperCube,
                      title: obj_layout.title,
                      visualization: obj_layout.visualization,
                      subtitle: obj_layout.subtitle,
                      footnote: obj_layout.footnote
                    }
                    // console.log("New obj layout:");
                    // console.log(obj_layout);
                    return obj_layout;
                  })
                  .then(function(obj_layout){
                    obj.getEffectiveProperties().then(function(obj_eff_props){
                      obj_eff_props = {
                        qInfo: obj_eff_props.qInfo,
                        qMetaDef: obj_eff_props.qMetaDef,
                        qHyperCubeDef: obj_eff_props.qHyperCubeDef
                      }
                      //Loading the master object's effective properties
                      var obj_props = {obj_layout,obj_eff_props}
                      return obj_props;
                    })
                    .then(function(data){
                      //Setting up options for XML file storage
                      var options = {
                        useCDATA: true
                      };

                      //Storing XML with the master object's data
                      var xml_library_masterobjects = js2xmlparser("libraryMasterObjects", data, options);
                      fs.writeFile('AppStructures/'+config_app.appname+'_LibraryMasterObjects_'+first_masterobject+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_library_masterobjects, function(err) {
                        if (err) throw err;
                        console.log('   '+config_app.appname+'_LibraryMasterObjects_'+first_masterobject+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                        console.log();
                        console.log("   Updating the remaining master objects list");
                        console.log("   This is the master objects list length: "+masterobjects_list.length);
                        //Checking if all library master objects were processed
                        if(masterobjects_list.length>0)
                          getMasterObjectsDetails(masterobjects_list);
                        else if (masterobjects_list.length==0 && document_list.length>0){
                          console.log()
                          console.log(" Loaded all master objects. Jumping to next application.");
                          console.log(" Applications remaining: " + document_list.length);
                          getAppLibraryMasterObjects(document_list);
                        }
                        else if (masterobjects_list.length==0 && document_list==0){ //checking if all master objects and documents were processed
                          console.log("──────────────────────────────────────");
                          resolve("Checkpoint: Applications Library Master Objects are loaded");
                        } 
                        else {
                          console.log("──────────────────────────────────────");
                          console.log ("Shouldn't be here, something went wrong...");
                          process.exit();
                        }
                      })
                    })
                  })
                })
              }//getMasterObjectsDetails
            })
          })
        })
      }//getAppLibraryMasterObjects
    });//promise
    return promise_lib_obj;
  }//getLibObjects
}