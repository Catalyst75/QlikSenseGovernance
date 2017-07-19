var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");
var exprFields = require('./expr-fields.js');
var log = require("./logger");

module.exports={
  getBookmarks: function(conn_data, global, cookies, single_app, logging){
    var promise_bmk = new Promise(function(resolve){
    //Creating the promise for the Applications Bookmarks
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.      

      if(logging.log_mode || logging.log_mode_full) log.info("*** Loading the Bookmarks List ***", logging.log_file);

      if(!logging.silent_mode) console.log();
      if(!logging.silent_mode) console.log("*****************************************************");
      if(!logging.silent_mode) console.log("          Loading the Applications Bookmarks         ");
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
            getAppBookmarks([conn_data.single_app_id]);
          }
          else{
            if(logging.log_mode || logging.log_mode_full) log.info("Single App mode - User has no access to this application", logging.log_file);
            resolve("Checkpoint: User has no access to this applications");
          }
        }else{
          if(available_docs.length>0){
            if(logging.log_mode || logging.log_mode_full) log.info("Processing each application", logging.log_file);
            getAppBookmarks(available_docs);
          }
          else{
            if(logging.log_mode || logging.log_mode_full) log.info("The user has no available documents", logging.log_file);
            resolve("Checkpoint: The user has no available documents");
          }
        }
      })

      //Loading bookmarks from all the documents, one at the time
      function getAppBookmarks(document_list){
        if(!logging.silent_mode) console.log();
        if(!logging.silent_mode) console.log("──────────────────────────────────────");
        var first_app = document_list.shift();
        if(!logging.silent_mode) console.log(" "+first_app);
        if(!logging.silent_mode) console.log("──────────────────────────────────────");

        if(logging.log_mode || logging.log_mode_full) log.info("Loading bookmarks for application " + first_app, logging.log_file);

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

            //Checking for the document's contents and focusing on the bookmarks
            app.getAllInfos().then(function(appInfos){

              if(logging.log_mode_full) log.debug("Received response from getAllInfos", logging.log_file);
              if(logging.log_mode_full) log.debug("Filtering getAllInfos to Bookmarks only", logging.log_file);

              var bookmarks_list = [];
              appInfos.qInfos.forEach(function(document_infos){
                if(document_infos.qType=='bookmark'){
                  bookmarks_list.push(document_infos.qId)
                }
              })

              if(!logging.silent_mode) console.log(" Loading Bookmarks details:");
              if(logging.log_mode || logging.log_mode_full) log.info("Found " + bookmarks_list.length + " bookmarks. Loading details", logging.log_file);

              //Verifying if the document has bookmarks
              if(bookmarks_list.length>0)
                getBookmarksDetails(bookmarks_list);
              else if(bookmarks_list.length==0 && document_list.length>0){
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" Loaded all bookmarks. Jumping to next application.");
                if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                if(logging.log_mode || logging.log_mode_full) log.info("Loaded all bookmarks. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                getAppBookmarks(document_list);
              }
              else if(bookmarks_list.length==0 && document_list.length==0){ //checking if all bookmarks and documents were processed
                if(logging.log_mode || logging.log_mode_full) log.info("All Applications Bookmarks are loaded",logging.log_file);

                if(!logging.silent_mode) console.log(" Loaded all bookmarks");
                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                resolve("Checkpoint: Applications Bookmarks are loaded");
              }
              else{
                if(!logging.silent_mode) console.log("──────────────────────────────────────");
                console.log ("Shouldn't be here, something went wrong...");
                if(logging.log_mode || logging.log_mode_full) log.error("Shouldn't be here, something went wrong...", logging.log_file);
                // process.exit();
              }

              //Loading the bookmarks of the document, one bookmark at the time
              function getBookmarksDetails(bookmarks_list){
                var first_bookmark = bookmarks_list.shift();
                if(!logging.silent_mode) console.log();
                if(!logging.silent_mode) console.log(" Bookmark id: "+first_bookmark);

                if(logging.log_mode || logging.log_mode_full) log.info("Loading bookmark " + first_bookmark,logging.log_file);
                if(logging.log_mode_full) log.debug("Preparing to call getBookmark", logging.log_file);

                var start_time = Date.now();

                app.getBookmark(first_bookmark).then(function(bkmk){

                  if(logging.log_mode_full) log.debug("Received response from getBookmark", logging.log_file);
                  if(logging.log_mode_full) log.debug("Preparing to call getLayout", logging.log_file);

                  //Loading the bookmark's layout properties
                  bkmk.getLayout().then(function(bkmk_layout){
                    var received_time = Date.now();
                    if(!logging.silent_mode) console.log("It took "+ (received_time-start_time) +"ms to receive the bookmark info.");

                    //setting up loading time
                    var loading_time = 0;
                    if(conn_data.timer_mode)
                      loading_time=received_time-start_time;

                    if(logging.log_mode_full) log.debug("Received response from getLayout", logging.log_file);
                    if(logging.log_mode_full) log.debug("Preparing data for *_Bookmarks_* XML file storage", logging.log_file);

                    // if(!logging.silent_mode) console.log("Bookmark layout:");
                    // if(!logging.silent_mode) console.log(bkmk_layout.qBookmark.qStateData[0].qFieldItems);

                    bkmk_layout.qBookmark.qStateData[0].qFieldItems.forEach(function(bookmark_field_item,index){
                      // if(!logging.silent_mode) console.log(bookmark_field_item.qDef.qName);

                      if(bookmark_field_item.qDef.qName.charAt(0)=='='){
                        if(logging.log_mode_full) log.debug("Parsing bookmark expression", logging.log_file);

                        // if(!logging.silent_mode) console.log("This is an expression, time to parse it");
                        var parsed_expression = exprFields.checkForExpressionFields(bookmark_field_item.qDef.qName)._65;

                        var parsed_bkm = {
                          parsedFields: { field: parsed_expression.expressionFields },
                          parsingErrors: parsed_expression.expressionFieldsError.length==0 ? 0 : 1,
                          parsingErrorsDetails: { parsedFieldErrors: [ parsed_expression.expressionFieldsError ] }
                        }

                        bkmk_layout.qBookmark.qStateData[0].qFieldItems[index].parsedData = parsed_bkm;

                      }else{
                        // if(!logging.silent_mode) console.log("This is not an expression, store the field as is");

                        var parsed_bkm = {
                          parsedFields: { field: bookmark_field_item.qDef.qName },
                          parsingErrors: 0,
                          parsingErrorsDetails: { parsedFieldErrors: [] }
                        }

                        bkmk_layout.qBookmark.qStateData[0].qFieldItems[index].parsedData = parsed_bkm;
                      }
                    });

                    var bkmk_data={
                      bkmk_layout,
                      qsLoadingTime: loading_time
                    }

                    return bkmk_data;
                  })
                  .then(function(data){
                    //Setting up options for XML file storage
                    var options = {
                      useCDATA: true
                    };

                    //Storing XML with the bookmark's data
                    var xml_library_bookmarks = js2xmlparser.parse("libraryBookmarks", data, options);
                    fs.writeFile("AppStructures/"+config_app.appname+"_Bookmarks_"+first_bookmark+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", xml_library_bookmarks, function(err) {
                      if (err) {
                        if(logging.log_mode || logging.log_mode_full) log.warning("Unable to store AppStructures/"+config_app.appname+"_Bookmarks_"+first_bookmark+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml: " + err, logging.log_file);
                        throw err;
                      }else{
                        if(logging.log_mode || logging.log_mode_full) log.info("Stored AppStructures/"+config_app.appname+"_Bookmarks_"+first_bookmark+"_"+conn_data.user_directory + "_" + conn_data.user_name+".xml", logging.log_file);

                        if(!logging.silent_mode) console.log('   '+config_app.appname+'_Bookmarks_'+first_bookmark+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                        if(!logging.silent_mode) console.log();
                        if(!logging.silent_mode) console.log("   Updating the remaining bookmarks list");
                        if(!logging.silent_mode) console.log("   This is the bookmarks list length: "+bookmarks_list.length);
                      }
                      //Checking if all bookmarks were processed
                      if(bookmarks_list.length>0){
                        if(logging.log_mode || logging.log_mode_full) log.info(bookmarks_list.length + " remaining bookmarks. Updating remaining list.", logging.log_file);
                        getBookmarksDetails(bookmarks_list);
                      }
                      else if (bookmarks_list.length==0 && document_list.length>0){
                        if(!logging.silent_mode) console.log();
                        if(!logging.silent_mode) console.log(" Loaded all bookmarks. Jumping to next application.");
                        if(!logging.silent_mode) console.log(" Remaining applications: " + document_list.length);

                        if(logging.log_mode || logging.log_mode_full) log.info("Loaded all bookmarks. " + document_list.length + " remaining applications. Updating remaining list.", logging.log_file);

                        getAppBookmarks(document_list);
                      }
                      else if (bookmarks_list.length==0 && document_list==0){ //checking if all bookmarks and documents were processed
                        if(logging.log_mode || logging.log_mode_full) log.info("All Applications Bookmarks are loaded",logging.log_file);

                        if(!logging.silent_mode) console.log("──────────────────────────────────────");
                        resolve("Checkpoint: Applications Bookmarks are loaded");
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
              }//getBookmarksDetails
            })
          })
        })
      }//getAppBookmarks
    });//promise
    return promise_bmk;
  }//getBookmarks
}//module