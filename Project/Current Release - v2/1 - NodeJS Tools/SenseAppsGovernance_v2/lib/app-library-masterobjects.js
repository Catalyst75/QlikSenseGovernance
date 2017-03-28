var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");
var exprFields = require('./expr-fields.js');
var log = require("./logger");

module.exports={
  getLibObjects: function(conn_data, global, cookies, single_app, logging){
    var promise_lib_obj = new Promise(function(resolve){
    //Creating the promise for the Applications Library Master Objects
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.      

      if(logging.log_mode || logging.log_mode_full) log.info("*** Loading the Library Master Objects List ***", logging.log_file);

      if(!logging.silent_mode) console.log();
      if(!logging.silent_mode) console.log("*****************************************************");
      if(!logging.silent_mode) console.log("       Loading the Library Master Objects List       ");
      if(!logging.silent_mode) console.log("*****************************************************");

      if(logging.log_mode_full) log.debug("Preparing to call getDocList", logging.log_file);

      //Loading a list of all the available documents
      global.getDocList().then(function(documents) {

        if(logging.log_mode_full) log.debug("Received response from getDocList", logging.log_file);

        var available_docs = [];
        documents.forEach(function(document_entry){
          available_docs.push(document_entry.qDocId);
        });

        if(!logging.silent_mode) console.log("Processing each document");
        if(single_app){
          if(!logging.silent_mode) console.log("verifying user can access");

          if(logging.log_mode_full) log.debug("Single App mode - verifying user access", logging.log_file);

          var access_app = false;
          available_docs.forEach(function(application){
            if(application == conn_data.single_app_id)
              access_app = true;
          });

          if(access_app){
            if(logging.log_mode || logging.log_mode_full) log.info("Single App mode - User has access to this application", logging.log_file);
            getAppLibraryMasterObjects([conn_data.single_app_id]);
          }else{
            if(logging.log_mode || logging.log_mode_full) log.info("Single App mode - User has no access to this application", logging.log_file);
            resolve("Checkpoint: User has no access to this applications");
          }
        }else{
          if(available_docs.length>0){
            if(logging.log_mode || logging.log_mode_full) log.info("Processing each application", logging.log_file); 
            getAppLibraryMasterObjects(available_docs);
          }else{
            if(logging.log_mode || logging.log_mode_full) log.info("The user has no available documents", logging.log_file);
            resolve("Checkpoint: The user has no available documents");
          }
        }
      })
      
      //Loading library master objects from all the documents, one at the time
      function getAppLibraryMasterObjects(document_list){
        if(!logging.silent_mode) console.log();
        if(!logging.silent_mode) console.log("──────────────────────────────────────");
        var first_app = document_list.shift();
        if(!logging.silent_mode) console.log(first_app);
        if(!logging.silent_mode) console.log("──────────────────────────────────────");

        if(logging.log_mode || logging.log_mode_full) log.info("Loading master objects for application " + first_app, logging.log_file);

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

          global.openDoc(config_app.appname,"","","",conn_data.no_data).then(function(app) {

            if(logging.log_mode_full) log.debug("Received response from openDoc", logging.log_file);
            if(logging.log_mode_full) log.debug("Preparing to call getAllInfos", logging.log_file);

            //Checking for the document's contents and focusing on the master objects
            app.getAllInfos().then(function(appInfos){

              if(logging.log_mode_full) log.debug("Received response from getAllInfos", logging.log_file);
              if(logging.log_mode_full) log.debug("Filtering getAllInfos to Master Objects only", logging.log_file);

              var masterobjects_list = [];
              appInfos.qInfos.forEach(function(document_infos){
                if(document_infos.qType=='masterobject'){
                  masterobjects_list.push(document_infos.qId)
                }
              })

              if(!logging.silent_mode) console.log(" Loading master objects details:");
              if(logging.log_mode || logging.log_mode_full) log.info("Found " + masterobjects_list.length + " master objects. Loading details", logging.log_file);

              //Verifying if the document has library master objects
              if(masterobjects_list.length>0)
                getMasterObjectsDetails(masterobjects_list);
              else if(masterobjects_list.length==0 && document_list.length>0){
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" Loaded all master objects. Jumping to next application.");
                if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                if(logging.log_mode || logging.log_mode_full) log.info("Loaded all master objects. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                getAppLibraryMasterObjects(document_list);
              }
              else if(masterobjects_list.length==0 && document_list.length==0){ //checking if all master objects and documents were processed
                if(logging.log_mode || logging.log_mode_full) log.info("All Applications Library Master Objects are loaded",logging.log_file);

                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                resolve("Checkpoint: Applications Library Master Objects are loaded");
              }
              else{
                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                console.log ("Shouldn't be here, something went wrong...");
                if(logging.log_mode || logging.log_mode_full) log.error("Shouldn't be here, something went wrong...", logging.log_file);
                // process.exit();
              }

              //Loading the library master objects of the document, one library master object at the time
              function getMasterObjectsDetails(masterobjects_list){
                var first_masterobject = masterobjects_list.shift();
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" Master object id: "+first_masterobject);

                if(logging.log_mode || logging.log_mode_full) log.info("Loading master object id " + first_masterobject,logging.log_file);
                if(logging.log_mode_full) log.debug("Preparing to call getObject", logging.log_file);

                var start_time = Date.now();

                app.getObject(first_masterobject).then(function(obj){
                  if(logging.log_mode_full) log.debug("Received response from getObject", logging.log_file);
                  if(logging.log_mode_full) log.debug("Preparing to call getLayout", logging.log_file);

                  //Loading the master object's layout properties
                  obj.getLayout().then(function(obj_layout){
                    if(logging.log_mode_full) log.debug("Received response from getLayout", logging.log_file);
                    
                    obj_layout = {
                      qInfo: obj_layout.qInfo,
                      qMeta: obj_layout.qMeta,
                      qHyperCube: obj_layout.qHyperCube,
                      title: obj_layout.title,
                      visualization: obj_layout.visualization,
                      subtitle: obj_layout.subtitle,
                      footnote: obj_layout.footnote
                    }
                    return obj_layout;
                  })
                  .then(function(obj_layout){
                    if(logging.log_mode_full) log.debug("Preparing to call getEffectiveProperties", logging.log_file);
                    
                    //Loading the master object's effective properties
                    obj.getEffectiveProperties().then(function(obj_eff_props){
                      var received_time = Date.now();
                      if(!logging.silent_mode) console.log("It took "+ (received_time-start_time) +"ms to receive the library object info.");

                      //setting up loading time
                      var loading_time = 0;
                      if(conn_data.timer_mode)
                        loading_time=received_time-start_time;

                      if(logging.log_mode_full) log.debug("Received response from getEffectiveProperties", logging.log_file);
                      if(logging.log_mode_full) log.debug("Preparing data for *_LibraryMasterObjects_* XML file storage", logging.log_file);

                      obj_eff_props = {
                        qInfo: obj_eff_props.qInfo,
                        qMetaDef: obj_eff_props.qMetaDef,
                        qHyperCubeDef: obj_eff_props.qHyperCubeDef
                      }

                      var obj_props = {
                                      obj_layout,
                                      obj_eff_props,
                                      qsLoadingTime: loading_time
                                    }

                      if(obj_props.obj_eff_props.qHyperCubeDef){

                        if(logging.log_mode_full) log.debug("Parsing master object dimensions", logging.log_file);
                        
                        obj_props.obj_eff_props.qHyperCubeDef.qDimensions.forEach(function(dimension, index){

                          var parsed_dim = {};

                          if(dimension.qLibraryId){
                            parsed_dim = {
                              parsedFields: { field: [] },
                              parsingErrors: 1,
                              parsingErrorsDetails: { parsedFieldErrors: "Library Dimension" }
                            }
                          }else{

                            if(dimension.qDef.qFieldDefs[0].charAt(0)=='='){
                                
                              var parsed_dimensions = exprFields.checkForDimensionFields({calculated_dimensions: dimension.qDef.qFieldDefs, non_calculated_dimensions: [] })._65;

                              parsed_dim = {
                                parsedFields: { field: parsed_dimensions.dimensionFields },
                                parsingErrors: parsed_dimensions.dimensionFieldsErrors.length,
                                parsingErrorsDetails: { parsedFieldErrors: parsed_dimensions.dimensionFieldsErrors }
                              }

                            }else{

                              parsed_dim = {
                                parsedFields: { field: dimension.qDef.qFieldDefs[0] },
                                parsingErrors: 0,
                                parsingErrorsDetails: { parsedFieldErrors: [] }
                              }
                            }
                          }
                         
                          obj_props.obj_eff_props.qHyperCubeDef.qDimensions[index].parsedData = parsed_dim;
                        });

                      if(logging.log_mode_full) log.debug("Parsing master object measures", logging.log_file);

                      obj_props.obj_eff_props.qHyperCubeDef.qMeasures.forEach(function(measure, index){

                        var parsed_msr = {};

                        if(measure.qLibraryId){
                          parsed_msr = {
                            parsedFields: { field: [] },
                            parsingErrors: 1,
                            parsingErrorsDetails: { parsedFieldErrors: "Library Measure" }
                          }
                        }else{

                          var parsed_measure = exprFields.checkForExpressionFields(measure.qDef.qDef)._65;

                          var parsed_msr = {
                            parsedFields: { field: parsed_measure.expressionFields },
                            parsingErrors: parsed_measure.expressionFieldsError.length==0 ? 0 : 1,
                            parsingErrorsDetails: { parsedFieldErrors: [ parsed_measure.expressionFieldsError ] }
                          }
                        }

                        obj_props.obj_eff_props.qHyperCubeDef.qMeasures[index].parsedData = parsed_msr;

                      });
                    }
                    
                    return obj_props;
                    })
                    .then(function(data){
                      //Setting up options for XML file storage
                      var options = {
                        useCDATA: true
                      };

                      //Storing XML with the master object's data
                      var xml_library_masterobjects = js2xmlparser.parse("libraryMasterObjects", data, options);
                      fs.writeFile("AppStructures/"+config_app.appname+"_LibraryMasterObjects_"+first_masterobject+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", xml_library_masterobjects, function(err) {
                        if (err) {
                          if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/"+config_app.appname+"_LibraryMasterObjects_"+first_masterobject+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml: " + err, logging.log_file);
                          throw err;
                        }else{
                          if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/"+config_app.appname+"_LibraryMasterObjects_"+first_masterobject+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", logging.log_file);

                          if(!logging.silent_mode) console.log('   '+config_app.appname+'_LibraryMasterObjects_'+first_masterobject+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                          if(!logging.silent_mode) console.log();
                          if(!logging.silent_mode) console.log("   Updating the remaining master objects list");
                          if(!logging.silent_mode) console.log("   This is the master objects list length: "+masterobjects_list.length);
                        }
                        //Checking if all library master objects were processed
                        if(masterobjects_list.length>0){
                          if(logging.log_mode || logging.log_mode_full) log.info(masterobjects_list.length + " remaining master objects. Updating remaining list.", logging.log_file);
                          getMasterObjectsDetails(masterobjects_list);
                        }
                        else if (masterobjects_list.length==0 && document_list.length>0){
                          if(!logging.silent_mode) console.log()
                          if(!logging.silent_mode) console.log(" Loaded all master objects. Jumping to next application.");
                          if(!logging.silent_mode) console.log(" Applications remaining: " + document_list.length);

                          if(logging.log_mode || logging.log_mode_full) log.info("Loaded all master objects. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                          getAppLibraryMasterObjects(document_list);
                        }
                        else if (masterobjects_list.length==0 && document_list==0){ //checking if all master objects and documents were processed
                          if(logging.log_mode || logging.log_mode_full) log.info("All Applications Library Master Objects are loaded",logging.log_file);

                          if(!logging.silent_mode) console.log("──────────────────────────────────────");
                          resolve("Checkpoint: Applications Library Master Objects are loaded");
                        } 
                        else {
                          if(!logging.silent_mode) console.log("──────────────────────────────────────");
                          console.log ("Shouldn't be here, something went wrong...");
                          if(logging.log_mode || logging.log_mode_full) log.error("Shouldn't be here, something went wrong...", logging.log_file);
                          // process.exit();
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