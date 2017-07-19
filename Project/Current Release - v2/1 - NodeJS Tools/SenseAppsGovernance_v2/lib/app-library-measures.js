var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");
var qelParser = require('./parse.js');
var exprFields = require('./expr-fields.js');
var log = require("./logger");

module.exports={
  getLibMeasures: function(conn_data, global, cookies, single_app, logging){
    //Creating the promise for the Applications Library Measures
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.
    var promise_lib_msr = new Promise(function(resolve){

      if(logging.log_mode || logging.log_mode_full) log.info("*** Loading the Library Measures List ***", logging.log_file);

      if(!logging.silent_mode) console.log();
      if(!logging.silent_mode) console.log("*****************************************************");
      if(!logging.silent_mode) console.log("          Loading the Library Measures List          ");
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
            getAppLibraryMeasures([conn_data.single_app_id]);
          }else{
            if(logging.log_mode || logging.log_mode_full) log.info("Single App mode - User has no access to this application", logging.log_file);
            resolve("Checkpoint: User has no access to this applications");
          }
        }else{
          if(available_docs.length>0){
            if(logging.log_mode || logging.log_mode_full) log.info("Processing each application", logging.log_file); 
            getAppLibraryMeasures(available_docs);
          }else{
            if(logging.log_mode || logging.log_mode_full) log.info("The user has no available documents", logging.log_file);
            resolve("Checkpoint: The user has no available documents");
          }
        }
      })

      //Loading library measures from all the documents, one at the time
      function getAppLibraryMeasures(document_list){
        if(!logging.silent_mode) console.log();
        if(!logging.silent_mode) console.log("──────────────────────────────────────");
        var first_app = document_list.shift();
        if(!logging.silent_mode) console.log(" "+first_app);
        if(!logging.silent_mode) console.log("──────────────────────────────────────");

        if(logging.log_mode || logging.log_mode_full) log.info("Loading measures for application " + first_app, logging.log_file);

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

            //Checking for the document's contents and focusing on the measures
            app.getAllInfos().then(function(appInfos){

              if(logging.log_mode_full) log.debug("Received response from getAllInfos", logging.log_file);
              if(logging.log_mode_full) log.debug("Filtering getAllInfos to Measures only", logging.log_file);

              var measures_list = [];
              appInfos.qInfos.forEach(function(document_infos){
                if(document_infos.qType=='measure'){
                  measures_list.push(document_infos.qId)
                }
              })

              if(!logging.silent_mode) console.log(" Loading measures details:");
              if(logging.log_mode || logging.log_mode_full) log.info("Found " + measures_list.length + " measures. Loading details", logging.log_file);

              //Verifying if the document has library measures
              if(measures_list.length>0)
                getMeasuresDetails(measures_list);
              else if(measures_list.length==0 && document_list.length>0){
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" Loaded all measures. Jumping to next application.");
                if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                if(logging.log_mode || logging.log_mode_full) log.info("Loaded all measures. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                getAppLibraryMeasures(document_list);
              }
              else if(measures_list.length==0 && document_list.length==0){ //checking if all measures and documents were processed
                if(logging.log_mode || logging.log_mode_full) log.info("All Applications Library Measures are loaded",logging.log_file);

                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                resolve("Checkpoint: Applications Library Measures are loaded");
              }
              else{
                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                console.log ("Shouldn't be here, something went wrong...");
                if(logging.log_mode || logging.log_mode_full) log.error("Shouldn't be here, something went wrong...", logging.log_file);
                // process.exit();
              }

              //Loading the library measures of the document, one library measure at the time
              function getMeasuresDetails(measures_list){
                var first_measure = measures_list.shift();
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" Measure id: "+first_measure);

                if(logging.log_mode || logging.log_mode_full) log.info("Loading measure id " + first_measure,logging.log_file);
                if(logging.log_mode_full) log.debug("Preparing to call getMeasure", logging.log_file);

                var start_time = Date.now();

                app.getMeasure(first_measure).then(function(msr){
                  if(logging.log_mode_full) log.debug("Received response from getMeasure", logging.log_file);
                  if(logging.log_mode_full) log.debug("Preparing to call getLayout", logging.log_file);

                  //Loading the measure's layout properties
                  msr.getLayout().then(function(msr_layout){
                    if(logging.log_mode_full) log.debug("Received response from getLayout", logging.log_file);

                    return msr_layout;
                  })
                  .then(function(msr_layout){

                    if(logging.log_mode_full) log.debug("Preparing to call getLinkedObjects", logging.log_file);

                    //Loading the measure's linked objects
                    msr.getLinkedObjects().then(function(msr_lnk){
                      var received_time = Date.now();
                      if(!logging.silent_mode) console.log("It took "+ (received_time-start_time) +"ms to receive the library measure info.");

                      //setting up loading time
                      var loading_time = 0;
                      if(conn_data.timer_mode)
                        loading_time=received_time-start_time;

                      if(logging.log_mode_full) log.debug("Received response from getLinkedObjects", logging.log_file);
                      if(logging.log_mode_full) log.debug("Preparing data for *_LibraryMeasures_* XML file storage", logging.log_file);

                      if(logging.log_mode_full) log.debug("Parsing measures", logging.log_file);

                      exprFields.checkForExpressionFields(msr_layout.qMeasure.qDef).then(function(expression_fields){

                        var parsed = {
                          parsedFields: { field: expression_fields.expressionFields },
                          parsingErrors: expression_fields.expressionFieldsError.length==0 ? 0 : 1,
                          parsingErrorsDetails: { parsedFieldErrors: [ expression_fields.expressionFieldsError ] }
                        }

                        msr_layout.parsedData = parsed;
                        
                        var msr_props = {
                          msr_layout,
                          msr_lnk,
                          qsLoadingTime: loading_time
                        }

                        return msr_props;

                      }).then(function(data){
                        //Setting up options for XML file storage
                        var options = {
                          useCDATA: true
                        };

                        //Storing XML with the measure's data
                        var xml_library_measures = js2xmlparser.parse("libraryMeasures", data, options);
                        fs.writeFile("AppStructures/"+config_app.appname+"_LibraryMeasures_"+first_measure+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", xml_library_measures, function(err) {
                          if (err) {
                            if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/"+config_app.appname+"_LibraryMeasures_"+first_measure+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml: " + err, logging.log_file);
                            throw err;
                          }else{
                            if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/"+config_app.appname+"_LibraryMeasures_"+first_measure+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", logging.log_file);

                            if(!logging.silent_mode) console.log('   '+config_app.appname+'_LibraryMeasures_'+first_measure+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                            if(!logging.silent_mode) console.log();
                            if(!logging.silent_mode) console.log("   Updating the remaining measures list");
                            if(!logging.silent_mode) console.log("   This is the measures list length: "+measures_list.length);
                          }
                          //Checking if all library measures were processed
                          if(measures_list.length>0){
                            if(logging.log_mode || logging.log_mode_full) log.info(measures_list.length + " remaining measures. Updating remaining list.", logging.log_file);
                            getMeasuresDetails(measures_list);
                          }
                          else if (measures_list.length==0 && document_list.length>0){
                            if(!logging.silent_mode) console.log();
                            if(!logging.silent_mode) console.log(" Loaded all measures. Jumping to next application.");
                            if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                            if(logging.log_mode || logging.log_mode_full) log.info("Loaded all measures. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                            getAppLibraryMeasures(document_list);
                          }
                          else if (measures_list.length==0 && document_list==0){ //checking if all measures and documents were processed
                            if(logging.log_mode || logging.log_mode_full) log.info("All Applications Library Measures are loaded",logging.log_file);

                            if(!logging.silent_mode) console.log("──────────────────────────────────────");
                            resolve("Checkpoint: Applications Library Measures are loaded");
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
                })
              }//getMeasuresDetails
            })
          })
        })
      }//getAppLibraryMeasures
    })//promise
    return promise_lib_msr;
  }//getLibMeasures
}//module