var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");

module.exports={
  getSheets: function(conn_data, global, cookies, single_app){
    var promise_sht = new Promise(function(resolve){
    //Creating the promise for the Applications Sheets
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.      

      console.log();
      console.log("*****************************************************");
      console.log("      Loading the Application Sheets and Objects     ");
      console.log("*****************************************************");

      //Loading a list of all the available documents
      if(single_app)
        getAppSheets([conn_data.single_app_id]);
      else{
        global.getDocList().then(function(documents) {
          var available_docs = [];
          documents.forEach(function(document_entry){
            available_docs.push(document_entry.qDocId);
          });

          console.log("Processing each document");
          getAppSheets(available_docs);      
        })
      }

      //Loading sheets from all the documents, one at the time
      function getAppSheets(document_list){
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
            //Checking for the document's contents and focusing on the sheets
            app.getAllInfos().then(function(appInfos){
              var sheets_list = [];
              appInfos.qInfos.forEach(function(document_infos){
                if(document_infos.qType=='sheet'){
                  sheets_list.push(document_infos.qId)
                }
              })
              console.log(" Loading sheets details:");

              //Verifying if the document has sheets
              if(sheets_list.length>0)
                getSheetDetails(sheets_list);
              else if(sheets_list.length==0 && document_list.length>0){
                console.log();
                console.log(" Loaded all sheets. Jumping to next application.");
                console.log(" Remaining applications: " + document_list.length);
                getAppSheets(document_list);
              }
              else if(sheets_list.length==0 && document_list.length==0){ //checking if all sheets and documents were processed
                console.log("──────────────────────────────────────");
                resolve("Checkpoint: Applications Sheets are loaded");
              }
              else{
                console.log("──────────────────────────────────────");
                console.log ("Shouldn't be here, something went wrong...");
                process.exit();
              }

              //Loading the sheets of the document, one sheet at the time
              function getSheetDetails(sheets_list){
                var first_sheet = sheets_list.shift();
                console.log();
                console.log(" - Sheet id: "+first_sheet);

                app.getObject(first_sheet).then(function(sht){
                  //Loading the sheet's layout properties
                  sht.getLayout().then(function(sht_layout){

                    //Checking if the sheet has objects
                    if(sht_layout.cells.length>0){
                      console.log(" │  This sheet has some objects");
                      var objects_list = [];

                      sht_layout.cells.forEach(function(sheet_object){
                        objects_list.push(sheet_object.name);
                      })

                      if(objects_list.length>0)
                        getSheetObjects(objects_list);

                      //Loading the sheet's objects, one object at the time
                      function getSheetObjects(objects_list){
                        var first_object = objects_list.shift();
                        console.log(" └- Object Id: " + first_object);
                        sht.getChild(first_object).then(function(obj){
                          obj.getFullPropertyTree().then(function(obj_full_props){
                            //Setting up data and options for XML file storage

                            obj_full_props = {
                              qInfo: obj_full_props.qProperty.qInfo,
                              showTitles: obj_full_props.qProperty.showTitles,
                              title: obj_full_props.qProperty.title,
                              visualization: obj_full_props.qProperty.visualization,
                              qHyperCubeDef: obj_full_props.qProperty.qHyperCubeDef
                            };

                            var data = {
                              obj_full_props
                            };

                            var options = {
                              useCDATA: true
                            };

                            var xml_sheet_object = js2xmlparser("sheetObject", data, options);

                            //Storing XML with the object's data
                            fs.writeFile('AppStructures/'+config_app.appname+'_SheetObject_'+first_sheet+'_'+first_object+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_sheet_object, function(err) {
                              if (err) throw err;
                              console.log(' │  '+config_app.appname+'_SheetObject_'+first_sheet+'_'+first_object+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                              console.log(' │  ');
                              console.log(" │  Updating the remaining objects list for this sheet");
                              console.log(" │  This is the objects list length: "+objects_list.length);
                              //Checking if all the objects were processed
                              if(objects_list.length>0)
                                getSheetObjects(objects_list);
                              else{
                                console.log(' │ ');
                                console.log(" - Finished the objects for sheet "+first_sheet);
                                //Setting up data for XML file storage
                                var sheet_data = {
                                  sht_layout
                                };

                                var xml_sheet = js2xmlparser("sheet", sheet_data, options);

                                //Storing XML with the sheet's data
                                fs.writeFile('AppStructures/'+config_app.appname+'_Sheet_'+first_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_sheet, function(err) {
                                  if (err) throw err;
                                  console.log(' - '+config_app.appname+'_Sheet_'+first_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                                  console.log('- - - - - - - - - - - - - - - - - - - ');
                                  console.log(" Updating the remaining sheets list");
                                  console.log(" This is the sheets list length: "+sheets_list.length);
                                  console.log('- - - - - - - - - - - - - - - - - - - ');
                                  //Checking if all the sheets were processed
                                  if(sheets_list.length>0)
                                    getSheetDetails(sheets_list);
                                  else if (sheets_list.length==0 && document_list.length>0){
                                    console.log();
                                    console.log(" Loaded all sheets. Jumping to next application.");
                                    console.log(" Remaining applications: " + document_list.length);
                                    getAppSheets(document_list);
                                  }
                                  else if (sheets_list.length==0 && document_list==0){ //checking if all sheets and documents were processed
                                    console.log("──────────────────────────────────────");
                                    resolve("Checkpoint: Applications Sheets are loaded");
                                  } 
                                  else {
                                    console.log("──────────────────────────────────────");
                                    console.log ("Shouldn't be here, something went wrong...");
                                    process.exit();
                                  }
                                })
                              }
                            })
                          })
                        })
                      }//getSheetObjects
                    }
                    else{
                      console.log("   This is an empty sheet");
                      
                      //Setting up data and options for XML file storage
                      var sheet_data = {
                        sht_layout
                      };

                      var options = {
                        useCDATA: true
                      };

                      var xml_sheet = js2xmlparser("sheet", sheet_data, options);

                      //Storing XML with the sheet's data
                      fs.writeFile('AppStructures/'+config_app.appname+'_Sheet_'+first_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_sheet, function(err) {
                        if (err) throw err;
                        console.log(' - '+config_app.appname+'_Sheet_'+first_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                        console.log('- - - - - - - - - - - - - - - - - - - ');
                        console.log(" Updating the remaining sheets list");
                        console.log(" This is the sheets list length: "+sheets_list.length);
                        console.log('- - - - - - - - - - - - - - - - - - - ');
                        //Checking if all the sheets were processed
                        if(sheets_list.length>0)
                          getSheetDetails(sheets_list);
                        else if (sheets_list.length==0 && document_list.length>0){
                          console.log();
                          console.log(" Loaded all sheets. Jumping to next application.");
                          console.log(" Remaining applications: " + document_list.length);
                          getAppSheets(document_list);
                        }
                        else if (sheets_list.length==0 && document_list==0){ //checking if all sheets and documents were processed
                          console.log("──────────────────────────────────────");
                          resolve("Checkpoint: Applications Sheets are loaded");
                        } 
                        else {
                          console.log("──────────────────────────────────────");
                          console.log ("Shouldn't be here, something went wrong...");
                          process.exit();
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