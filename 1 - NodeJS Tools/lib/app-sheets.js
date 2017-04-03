var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");
var exprFields = require('./expr-fields.js');
var log = require("./logger");

module.exports={
  getSheets: function(conn_data, global, cookies, single_app, logging){
    var promise_sht = new Promise(function(resolve){
    //Creating the promise for the Applications Sheets
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.      

      if(logging.log_mode || logging.log_mode_full) log.info("*** Loading the Sheets List ***", logging.log_file);

      if(!logging.silent_mode) console.log();
      if(!logging.silent_mode) console.log("*****************************************************");
      if(!logging.silent_mode) console.log("      Loading the Application Sheets and Objects     ");
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
            getAppSheets([conn_data.single_app_id]);
          }
          else{
            if(logging.log_mode || logging.log_mode_full) log.info("Single App mode - User has no access to this application", logging.log_file);
            resolve("Checkpoint: User has no access to this applications");
          }
        }else{
          if(available_docs.length>0){
            if(logging.log_mode || logging.log_mode_full) log.info("Processing each application", logging.log_file);
            getAppSheets(available_docs);
          }
          else{
            if(logging.log_mode || logging.log_mode_full) log.info("The user has no available documents", logging.log_file);
            resolve("Checkpoint: The user has no available documents");
          }
        }     
      })

      //Loading sheets from all the documents, one at the time
      function getAppSheets(document_list){
        if(!logging.silent_mode) console.log();
        if(!logging.silent_mode) console.log("──────────────────────────────────────");
        var first_app = document_list.shift();
        if(!logging.silent_mode) console.log(" "+first_app);
        if(!logging.silent_mode) console.log("──────────────────────────────────────");

        if(logging.log_mode || logging.log_mode_full) log.info("Loading sheets for application " + first_app, logging.log_file);

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

            //Checking for the document's contents and focusing on the sheets
            app.getAllInfos().then(function(appInfos){

              if(logging.log_mode_full) log.debug("Received response from getAllInfos", logging.log_file);
              if(logging.log_mode_full) log.debug("Filtering getAllInfos to Sheets only", logging.log_file);

              var sheets_list = [];
              appInfos.qInfos.forEach(function(document_infos){
                if(document_infos.qType=='sheet'){
                  sheets_list.push(document_infos.qId)
                }
              });

              if(!logging.silent_mode) console.log(" Loading sheets details:");
              if(logging.log_mode || logging.log_mode_full) log.info("Found " + sheets_list.length + " sheets. Loading details", logging.log_file);

              //Verifying if the document has sheets
              if(sheets_list.length>0)
                getSheetDetails(sheets_list);
              else if(sheets_list.length==0 && document_list.length>0){
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" Loaded all sheets. Jumping to next application.");
                if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                if(logging.log_mode || logging.log_mode_full) log.info("Loaded all sheets. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                getAppSheets(document_list);
              }
              else if(sheets_list.length==0 && document_list.length==0){ //checking if all sheets and documents were processed
                if(logging.log_mode || logging.log_mode_full) log.info("All Applications Sheets are loaded",logging.log_file);

                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                resolve("Checkpoint: Applications Sheets are loaded");
              }
              else{
                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                console.log ("Shouldn't be here, something went wrong...");
                if(logging.log_mode || logging.log_mode_full) log.error("Shouldn't be here, something went wrong...", logging.log_file);
                // process.exit();
              }

              //Loading the sheets of the document, one sheet at the time
              function getSheetDetails(sheets_list){
                var first_sheet = sheets_list.shift();
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" - Sheet id: "+first_sheet);

                if(logging.log_mode || logging.log_mode_full) log.info("Loading sheet " + first_sheet,logging.log_file);
                if(logging.log_mode_full) log.debug("Preparing to call getObject", logging.log_file);

                var start_time = Date.now();

                app.getObject(first_sheet).then(function(sht){

                  if(logging.log_mode_full) log.debug("Received response from getObject", logging.log_file);
                  if(logging.log_mode_full) log.debug("Preparing to call getLayout", logging.log_file);

                  //Loading the sheet's layout properties
                  sht.getLayout().then(function(sht_layout){
                    var sheet_time = Date.now();
                    if(!logging.silent_mode) console.log("It took "+ (sheet_time-start_time) +"ms to receive the sheet info.");

                    //setting up loading time
                    var sheet_loading_time = 0;
                    if(conn_data.timer_mode)
                      sheet_loading_time=sheet_time-start_time;

                    if(logging.log_mode_full) log.debug("Received response from getLayout", logging.log_file);

                    //Checking if the sheet has objects
                    if(sht_layout.cells.length>0){

                      if(logging.log_mode_full) log.debug("The sheet has objects.", logging.log_file);

                      if(!logging.silent_mode) console.log(" │  This sheet has some objects");
                      var objects_list = [];

                      sht_layout.cells.forEach(function(sheet_object){
                        objects_list.push(sheet_object.name);
                      })

                      if(objects_list.length>0)
                        getSheetObjects(objects_list);

                      //Loading the sheet's objects, one object at the time
                      function getSheetObjects(objects_list){
                        var first_object = objects_list.shift();
                        if(!logging.silent_mode) console.log(" └- Object Id: " + first_object);

                        if(logging.log_mode || logging.log_mode_full) log.info("Loading object " + first_object,logging.log_file);
                        if(logging.log_mode_full) log.debug("Preparing to call getChild", logging.log_file);

                        var start_time_obj = Date.now();
                        sht.getChild(first_object).then(function(obj){

                          if(logging.log_mode_full) log.debug("Received response from getChild", logging.log_file);
                          if(logging.log_mode_full) log.debug("Preparing to call getFullPropertyTree", logging.log_file);

                          obj.getFullPropertyTree().then(function(obj_full_props){
                            var object_time = Date.now();
                            if(!logging.silent_mode) console.log("It took "+ (object_time-start_time_obj) +"ms to receive the object info.");

                            //setting up loading time
                            var sheet_object_loading_time = 0;
                            if(conn_data.timer_mode)
                              sheet_object_loading_time=object_time-start_time_obj;

                            if(logging.log_mode_full) log.debug("Received response from getFullPropertyTree", logging.log_file);
                            if(logging.log_mode_full) log.debug("Preparing data for *_SheetObject_* XML file storage", logging.log_file);

                            //Setting up data and options for XML file storage

                            obj_full_props = {
                              qInfo: obj_full_props.qProperty.qInfo,
                              showTitles: obj_full_props.qProperty.showTitles,
                              title: obj_full_props.qProperty.title,
                              visualization: obj_full_props.qProperty.visualization,
                              qHyperCubeDef: obj_full_props.qProperty.qHyperCubeDef
                            };

                            if(obj_full_props.qHyperCubeDef){

                              if(logging.log_mode_full) log.debug("Parsing object dimensions", logging.log_file);

                              obj_full_props.qHyperCubeDef.qDimensions.forEach(function(dimension,index){
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

                                obj_full_props.qHyperCubeDef.qDimensions[index].parsedData = parsed_dim;
                              });

                              if(logging.log_mode_full) log.debug("Parsing object measures", logging.log_file);

                              obj_full_props.qHyperCubeDef.qMeasures.forEach(function(measure,index){
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

                                obj_full_props.qHyperCubeDef.qMeasures[index].parsedData = parsed_msr;
                              });
                            }
                            
                            var data = {
                              obj_full_props,
                              qsLoadTimeObject: sheet_object_loading_time
                            };

                            var options = {
                              useCDATA: true
                            };

                            var xml_sheet_object = js2xmlparser.parse("sheetObject", data, options);

                            //Storing XML with the object's data
                            fs.writeFile("AppStructures/"+config_app.appname+"_SheetObject_"+first_sheet+"_"+first_object+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", xml_sheet_object, function(err) {
                              if (err) {
                                if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/"+config_app.appname+"_SheetObject_"+first_sheet+"_"+first_object+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml: " + err, logging.log_file);
                                throw err;
                              }else{
                                if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/"+config_app.appname+"_SheetObject_"+first_sheet+"_"+first_object+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", logging.log_file);

                                if(!logging.silent_mode) console.log(' │  '+config_app.appname+'_SheetObject_'+first_sheet+'_'+first_object+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                                if(!logging.silent_mode) console.log(' │  ');
                                if(!logging.silent_mode) console.log(" │  Updating the remaining objects list for this sheet");
                                if(!logging.silent_mode) console.log(" │  This is the objects list length: "+objects_list.length);}
                              //Checking if all the objects were processed
                              if(objects_list.length>0){
                                if(logging.log_mode || logging.log_mode_full) log.info(objects_list.length + " remaining objects. Updating remaining list.", logging.log_file);
                                getSheetObjects(objects_list);
                              }
                              else{
                                if(!logging.silent_mode) console.log(' │ ');
                                if(!logging.silent_mode) console.log(" - Finished the objects for sheet "+first_sheet);

                                if(logging.log_mode || logging.log_mode_full) log.info("Finished the objects for sheet "+first_sheet, logging.log_file);
                                if(logging.log_mode_full) log.debug("Preparing data for *_Sheet_* XML file storage", logging.log_file);

                                //Setting up data for XML file storage
                                var sheet_data = {
                                  sht_layout,
                                  qsLoadingTime: sheet_loading_time
                                };

                                var xml_sheet = js2xmlparser.parse("sheet", sheet_data, options);

                                //Storing XML with the sheet's data
                                fs.writeFile("AppStructures/"+config_app.appname+"_Sheet_"+first_sheet+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", xml_sheet, function(err) {
                                  if (err) {
                                    if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/"+config_app.appname+"_Sheet_"+first_sheet+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml: " + err, logging.log_file);
                                    throw err;
                                  }else{
                                    if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/"+config_app.appname+"_Sheet_"+first_sheet+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", logging.log_file);

                                    if(!logging.silent_mode) console.log(' - '+config_app.appname+'_Sheet_'+first_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                                    if(!logging.silent_mode) console.log('- - - - - - - - - - - - - - - - - - - ');
                                    if(!logging.silent_mode) console.log(" Updating the remaining sheets list");
                                    if(!logging.silent_mode) console.log(" This is the sheets list length: "+sheets_list.length);
                                    if(!logging.silent_mode) console.log('- - - - - - - - - - - - - - - - - - - ');
                                  }
                                  //Checking if all the sheets were processed
                                  if(sheets_list.length>0){
                                    if(logging.log_mode || logging.log_mode_full) log.info(sheets_list.length + " remaining sheets. Updating remaining list.", logging.log_file);
                                    getSheetDetails(sheets_list);
                                  }
                                  else if (sheets_list.length==0 && document_list.length>0){
                                    if(!logging.silent_mode) console.log();
                                    if(!logging.silent_mode) console.log(" Loaded all sheets. Jumping to next application.");
                                    if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                                    if(logging.log_mode || logging.log_mode_full) log.info("Loaded all sheets. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                                    getAppSheets(document_list);
                                  }
                                  else if (sheets_list.length==0 && document_list==0){ //checking if all sheets and documents were processed
                                    if(logging.log_mode || logging.log_mode_full) log.info("All Applications Sheets are loaded",logging.log_file);

                                    if(!logging.silent_mode) console.log("──────────────────────────────────────");
                                    resolve("Checkpoint: Applications Sheets are loaded");
                                  } 
                                  else {
                                    if(!logging.silent_mode) console.log("──────────────────────────────────────");
                                    console.log ("Shouldn't be here, something went wrong...");
                                    if(logging.log_mode || logging.log_mode_full) log.error("Shouldn't be here, something went wrong...", logging.log_file);
                                    // process.exit();
                                  }
                                })
                              }
                            })
                          })
                        })
                      }//getSheetObjects
                    }
                    else{
                      if(!logging.silent_mode) console.log("   This is an empty sheet");

                      if(logging.log_mode || logging.log_mode_full) log.info("This is an empty sheet", logging.log_file);
                      if(logging.log_mode_full) log.debug("Preparing data for *_Sheet_* XML file storage", logging.log_file);
                      
                      //Setting up data and options for XML file storage
                      var sheet_data = {
                        sht_layout
                      };

                      var options = {
                        useCDATA: true
                      };

                      var xml_sheet = js2xmlparser.parse("sheet", sheet_data, options);

                      //Storing XML with the sheet's data
                      fs.writeFile("AppStructures/"+config_app.appname+"_Sheet_"+first_sheet+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", xml_sheet, function(err) {
                        if (err) {
                          if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/"+config_app.appname+"_Sheet_"+first_sheet+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml: " + err, logging.log_file);
                          throw err;
                        }else{
                          if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/"+config_app.appname+"_Sheet_"+first_sheet+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", logging.log_file);

                          if(!logging.silent_mode) console.log(' - '+config_app.appname+'_Sheet_'+first_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                          if(!logging.silent_mode) console.log('- - - - - - - - - - - - - - - - - - - ');
                          if(!logging.silent_mode) console.log(" Updating the remaining sheets list");
                          if(!logging.silent_mode) console.log(" This is the sheets list length: "+sheets_list.length);
                          if(!logging.silent_mode) console.log('- - - - - - - - - - - - - - - - - - - ');
                        }
                        //Checking if all the sheets were processed
                        if(sheets_list.length>0){
                          if(logging.log_mode || logging.log_mode_full) log.info(sheets_list.length + " remaining sheets. Updating remaining list.", logging.log_file);
                          getSheetDetails(sheets_list);
                        }
                        else if (sheets_list.length==0 && document_list.length>0){
                          if(!logging.silent_mode) console.log();
                          if(!logging.silent_mode) console.log(" Loaded all sheets. Jumping to next application.");
                          if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                          if(logging.log_mode || logging.log_mode_full) log.info("Loaded all sheets. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                          getAppSheets(document_list);
                        }
                        else if (sheets_list.length==0 && document_list==0){ //checking if all sheets and documents were processed
                          if(logging.log_mode || logging.log_mode_full) log.info("All Applications Sheets are loaded",logging.log_file);

                          if(!logging.silent_mode) console.log("──────────────────────────────────────");
                          resolve("Checkpoint: Applications Sheets are loaded");
                        } 
                        else {
                          if(!logging.silent_mode) console.log("──────────────────────────────────────");
                          console.log ("Shouldn't be here, something went wrong...");
                          if(logging.log_mode || logging.log_mode_full) log.error("Shouldn't be here, something went wrong...", logging.log_file);
                          // process.exit();
                        }
                      })
                    }
                  })
                })
              }//getSheetDetails
            })
          })
        })
      }//getAppSheets
    });//promise
    return promise_sht;
  }//getSheets
}//module exports