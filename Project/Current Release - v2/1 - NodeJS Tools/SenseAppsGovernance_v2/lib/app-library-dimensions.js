var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");
var exprFields = require('./expr-fields.js');
var log = require("./logger");

module.exports={
  getLibDimensions: function(conn_data, global, cookies, single_app, logging){
    //Creating the promise for the Applications Library Dimensions
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.
    var promise_lib_dim = new Promise(function(resolve){

      if(logging.log_mode || logging.log_mode_full) log.info("*** Loading the Library Dimensions List ***", logging.log_file);

      if(!logging.silent_mode) console.log();
      if(!logging.silent_mode) console.log("*****************************************************");
      if(!logging.silent_mode) console.log("         Loading the Library Dimensions List         ");
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
            getAppLibraryDimensions([conn_data.single_app_id]);
          }
          else{
            if(logging.log_mode || logging.log_mode_full) log.info("Single App mode - User has no access to this application", logging.log_file); 
            resolve("Checkpoint: User has no access to this applications");
          } 
        }else{
          if(available_docs.length>0){
            if(logging.log_mode || logging.log_mode_full) log.info("Processing each application", logging.log_file); 
            getAppLibraryDimensions(available_docs);
          }
          else{
            if(logging.log_mode || logging.log_mode_full) log.info("The user has no available documents", logging.log_file);
            resolve("Checkpoint: The user has no available documents");
          }
        }
      })

      //Loading library dimensions from all the documents, one at the time
      function getAppLibraryDimensions(document_list){
        if(!logging.silent_mode) console.log();
        if(!logging.silent_mode) console.log("──────────────────────────────────────");
        var first_app = document_list.shift();
        if(!logging.silent_mode) console.log(" "+first_app);
        if(!logging.silent_mode) console.log("──────────────────────────────────────");

        if(logging.log_mode || logging.log_mode_full) log.info("Loading dimensions for application " + first_app, logging.log_file);

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

            //Checking for the document's contents and focusing on the dimensions
            app.getAllInfos().then(function(appInfos){

              if(logging.log_mode_full) log.debug("Received response from getAllInfos", logging.log_file);
              if(logging.log_mode_full) log.debug("Filtering getAllInfos to Dimensions only", logging.log_file);

              var dimensions_list = [];
              appInfos.qInfos.forEach(function(document_infos){
                if(document_infos.qType=='dimension'){
                  dimensions_list.push(document_infos.qId)
                }
              })

              if(!logging.silent_mode) console.log(" Loading dimensions details:");
              if(logging.log_mode || logging.log_mode_full) log.info("Found " + dimensions_list.length + " dimensions. Loading details", logging.log_file);

              //Verifying if the document has library dimensions
              if(dimensions_list.length>0)
                getDimensionDetails(dimensions_list);
              else if(dimensions_list.length==0 && document_list.length>0){
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" Loaded all dimensions. Jumping to next application.");
                if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                if(logging.log_mode || logging.log_mode_full) log.info("Loaded all dimensions. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                getAppLibraryDimensions(document_list);
              }
              else if(dimensions_list.length==0 && document_list.length==0){ //checking if all dimensions and documents were processed
                if(logging.log_mode || logging.log_mode_full) log.info("All Applications Library Dimensions are loaded",logging.log_file);

                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                resolve("Checkpoint: Applications Library Dimensions are loaded");
              }
              else{
                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                console.log ("Shouldn't be here, something went wrong...");
                if(logging.log_mode || logging.log_mode_full) log.error("Shouldn't be here, something went wrong...", logging.log_file);
                // process.exit();
              }

              //Loading the library dimensions of the document, one library dimension at the time
              function getDimensionDetails(dimensions_list){
                var first_dimension = dimensions_list.shift();
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" Dimension id: "+first_dimension);

                if(logging.log_mode || logging.log_mode_full) log.info("Loading dimension id " + first_dimension,logging.log_file);
                if(logging.log_mode_full) log.debug("Preparing to call getDimension", logging.log_file);

                var start_time = Date.now();

                app.getDimension(first_dimension).then(function(dim){

                  if(logging.log_mode_full) log.debug("Received response from getDimension", logging.log_file);
                  if(logging.log_mode_full) log.debug("Preparing to call getLayout", logging.log_file);

                  //Loading the dimension's layout properties
                  dim.getLayout().then(function(dim_layout){
                    if(logging.log_mode_full) log.debug("Received response from getLayout", logging.log_file);

                    var dim_data = {
                      qInfo: dim_layout.qInfo,
                      qMeta: dim_layout.qMeta,
                      qDim: dim_layout.qDim
                    }

                    return dim_data;
                  })
                  .then(function(dim_layout){

                    if(logging.log_mode_full) log.debug("Preparing to call getLinkedObjects", logging.log_file);

                    //Loading the dimension's linked objects
                    dim.getLinkedObjects().then(function(dim_lnk){
                      var received_time = Date.now();
                      if(!logging.silent_mode) console.log("It took "+ (received_time-start_time) +"ms to receive the library dimension info.");

                      //setting up loading time
                      var loading_time = 0;
                      if(conn_data.timer_mode)
                        loading_time=received_time-start_time;

                      if(logging.log_mode_full) log.debug("Received response from getLinkedObjects", logging.log_file);
                      if(logging.log_mode_full) log.debug("Preparing data for *_LibraryDimensions_* XML file storage", logging.log_file);

                      parse_dimensions = {calculated_dimensions: [], non_calculated_dimensions: [] };

                      if(logging.log_mode_full) log.debug("Parsing calculated dimensions", logging.log_file);

                      dim_layout.qDim.qFieldDefs.forEach(function(dimension_expression){
                        if(dimension_expression.charAt(0)=='='){
                          parse_dimensions.calculated_dimensions.push(dimension_expression);
                        }else{
                          parse_dimensions.non_calculated_dimensions.push(dimension_expression);
                        }
                      });

                      exprFields.checkForDimensionFields(parse_dimensions).then(function(dimensions_parsed){
                        var parsed = {
                          parsedFields: { field: dimensions_parsed.dimensionFields },
                          parsingErrors: dimensions_parsed.dimensionFieldsErrors.length,
                          parsingErrorsDetails: { parsedFieldErrors: dimensions_parsed.dimensionFieldsErrors }
                        }

                        dim_layout.parsedData = parsed;

                        var dim_props = {
                                dim_layout,
                                dim_lnk,
                                qsLoadingTime: loading_time
                              }
                        return dim_props;
                      })
                      .then(function(data){
                        //Setting up options for XML file storage
                        var options = {
                          useCDATA: true
                        };

                        //Storing XML with the dimension's data
                        var xml_library_dimensions = js2xmlparser.parse("libraryDimensions", data, options);
                        fs.writeFile("AppStructures/"+config_app.appname+"_LibraryDimensions_"+first_dimension+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", xml_library_dimensions, function(err) {
                          if (err) {
                            if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/"+config_app.appname+"_LibraryDimensions_"+first_dimension+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml: " + err, logging.log_file);
                            throw err;
                          }else{
                            if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/"+config_app.appname+"_LibraryDimensions_"+first_dimension+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", logging.log_file);
                            if(!logging.silent_mode) console.log('   '+config_app.appname+'_LibraryDimensions_'+first_dimension+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                            if(!logging.silent_mode) console.log();
                            if(!logging.silent_mode) console.log("   Updating the remaining dimensions list");
                            if(!logging.silent_mode) console.log("   This is the dimensions list length: "+dimensions_list.length);
                          }
                          //Checking if all library dimensions were processed
                          if(dimensions_list.length>0)
                            {
                              if(logging.log_mode || logging.log_mode_full) log.info(dimensions_list.length + " remaining dimensions. Updating remaining list.", logging.log_file);
                              getDimensionDetails(dimensions_list);
                            }
                          else if (dimensions_list.length==0 && document_list.length>0){
                            if(!logging.silent_mode) console.log();
                            if(!logging.silent_mode) console.log(" Loaded all dimensions. Jumping to next application.");
                            if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                            if(logging.log_mode || logging.log_mode_full) log.info("Loaded all dimensions. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                            getAppLibraryDimensions(document_list);
                          }
                          else if (dimensions_list.length==0 && document_list==0){ //checking if all dimensions and documents were processed
                            if(logging.log_mode || logging.log_mode_full) log.info("All Applications Library Dimensions are loaded",logging.log_file);

                            if(!logging.silent_mode) console.log("──────────────────────────────────────");
                            resolve("Checkpoint: Applications Library Dimensions are loaded");
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
              }//getDimensionDetails
            })
          })
        })
      }//getAppLibraryDimensions
    })//promise
    return promise_lib_dim;
  }//getLibraryDimensions
}//module exports

