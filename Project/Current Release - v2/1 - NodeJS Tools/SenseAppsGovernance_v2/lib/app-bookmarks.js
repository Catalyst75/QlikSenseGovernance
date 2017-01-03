var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");
var exprFields = require('./expr-fields.js');

module.exports={
  getBookmarks: function(conn_data, global, cookies, single_app){
    var promise_bmk = new Promise(function(resolve){
    //Creating the promise for the Applications Bookmarks
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.      

      console.log();
      console.log("*****************************************************");
      console.log("          Loading the Applications Bookmarks         ");
      console.log("*****************************************************");

      //Loading a list of all the available documents
      global.getDocList().then(function(documents) {
        var available_docs = [];
        documents.forEach(function(document_entry){
          available_docs.push(document_entry.qDocId);
        });

        console.log("Processing each document");
        if(single_app){
          console.log("verifying user can access");
          var access_app = false;
          available_docs.forEach(function(application){
            if(application == conn_data.single_app_id)
              access_app = true;
          });
          if(access_app)
            getAppBookmarks([conn_data.single_app_id]);
          else
            resolve("Checkpoint: User has no access to this applications") 
        }else{
          if(available_docs.length>0)
            getAppBookmarks(available_docs);  
          else
            resolve("Checkpoint: The user has no available documents")
        }
      })

      //Loading bookmarks from all the documents, one at the time
      function getAppBookmarks(document_list){
        console.log();
        console.log("──────────────────────────────────────");
        var first_app = document_list.shift();
        console.log(" "+first_app);
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
          global.openDoc(config_app.appname,"","","",conn_data.no_data).then(function(app) {
            //Checking for the document's contents and focusing on the bookmarks
            app.getAllInfos().then(function(appInfos){
              var bookmarks_list = [];
              appInfos.qInfos.forEach(function(document_infos){
                if(document_infos.qType=='bookmark'){
                  bookmarks_list.push(document_infos.qId)
                }
              })
              console.log(" Loading Bookmarks details:");

              //Verifying if the document has bookmarks
              if(bookmarks_list.length>0)
                getBookmarksDetails(bookmarks_list);
              else if(bookmarks_list.length==0 && document_list.length>0){
                console.log();
                console.log(" Loaded all bookmarks. Jumping to next application.");
                console.log(" Remaining applications: " + document_list.length);
                getAppBookmarks(document_list);
              }
              else if(bookmarks_list.length==0 && document_list.length==0){ //checking if all bookmarks and documents were processed
                console.log(" Loaded all bookmarks");
                console.log("──────────────────────────────────────");
                resolve("Checkpoint: Applications Bookmarks are loaded");
              }
              else{
                console.log("──────────────────────────────────────");
                console.log ("Shouldn't be here, something went wrong...");
                process.exit();
              }

              //Loading the bookmarks of the document, one bookmark at the time
              function getBookmarksDetails(bookmarks_list){
                var first_bookmark = bookmarks_list.shift();
                console.log();
                console.log(" Bookmark id: "+first_bookmark);

                var start_time = Date.now();

                app.getBookmark(first_bookmark).then(function(bkmk){
                  //Loading the bookmark's layout properties
                  bkmk.getLayout().then(function(bkmk_layout){
                    var received_time = Date.now();
                    console.log("It took "+ (received_time-start_time) +"ms to receive the bookmark info.");

                    //setting up loading time
                    var loading_time = 0;
                    if(conn_data.timer_mode)
                      loading_time=received_time-start_time;

                    console.log("Bookmark layout:");
                    // console.log(bkmk_layout.qBookmark.qStateData[0].qFieldItems);

                    bkmk_layout.qBookmark.qStateData[0].qFieldItems.forEach(function(bookmark_field_item,index){
                      console.log(bookmark_field_item.qDef.qName);

                      if(bookmark_field_item.qDef.qName.charAt(0)=='='){
                        console.log("This is an expression, time to parse it");
                        var parsed_expression = exprFields.checkForExpressionFields(bookmark_field_item.qDef.qName)._65;

                        var parsed_bkm = {
                          parsedFields: { field: parsed_expression.expressionFields },
                          parsingErrors: parsed_expression.expressionFieldsError.length==0 ? 0 : 1,
                          parsingErrorsDetails: { parsedFieldErrors: [ parsed_expression.expressionFieldsError ] }
                        }

                        bkmk_layout.qBookmark.qStateData[0].qFieldItems[index].parsedData = parsed_bkm;

                      }else{
                        console.log("This is not an expression, store the field as is");

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
                    fs.writeFile('AppStructures/'+config_app.appname+'_Bookmarks_'+first_bookmark+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_library_bookmarks, function(err) {
                      if (err) throw err;
                      console.log('   '+config_app.appname+'_Bookmarks_'+first_bookmark+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                      console.log();
                      console.log("   Updating the remaining bookmarks list");
                      console.log("   This is the bookmarks list length: "+bookmarks_list.length);
                      //Checking if all bookmarks were processed
                      if(bookmarks_list.length>0)
                        getBookmarksDetails(bookmarks_list);
                      else if (bookmarks_list.length==0 && document_list.length>0){
                        console.log();
                        console.log(" Loaded all bookmarks. Jumping to next application.");
                        console.log(" Remaining applications: " + document_list.length);
                        getAppBookmarks(document_list);
                      }
                      else if (bookmarks_list.length==0 && document_list==0){ //checking if all bookmarks and documents were processed
                        console.log("──────────────────────────────────────");
                        resolve("Checkpoint: Applications Bookmarks are loaded");
                      } 
                      else {
                        console.log("──────────────────────────────────────");
                        console.log ("Shouldn't be here, something went wrong...");
                        process.exit();
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