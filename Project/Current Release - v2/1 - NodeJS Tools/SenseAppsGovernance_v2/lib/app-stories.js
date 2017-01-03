var qsocks = require('qsocks');
var fs = require('fs');
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var Promise = require("promise");

module.exports={
  getAppStories: function(conn_data, global, cookies, single_app){
    var promise_str = new Promise(function(resolve){
    //Creating the promise for the Applications Stories
    //Root admin privileges should allow him to access to all available applications. Otherwise check your environment's security rules for the designed user.      

      console.log();
      console.log("*****************************************************");
      console.log(" Loading the Application Stories and their Snapshots ");
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
            getStories([conn_data.single_app_id]);
          else
            resolve("Checkpoint: User has no access to this applications") 
        }else{
          if(available_docs.length>0)
            getStories(available_docs);  
          else
            resolve("Checkpoint: The user has no available documents")  
        }      
      })

      //Loading stories from all the documents, one at the time
      function getStories(document_list){
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
            app.getAllInfos().then(function(appInfos){
              var stories_list = [];
              appInfos.qInfos.forEach(function(document_infos){
                if(document_infos.qType=='story'){
                  stories_list.push(document_infos.qId)
                }
              })
              console.log(" Loading stories details:");

              //Verifying if the document has stories
              if(stories_list.length>0)
                getStoriesDetails(stories_list); 
              else if(stories_list.length==0 && document_list.length>0){
                console.log();
                console.log(" Loaded all stories. Jumping to next application.");
                console.log(" Remaining applications: " + document_list.length);
                getStories(document_list);
              }
              else if(stories_list.length==0 && document_list.length==0){ //checking if all stories and documents were processed
                console.log("──────────────────────────────────────");
                resolve("Checkpoint: Applications Stories and Snapshots are loaded");
              }
              else{
                console.log("──────────────────────────────────────");
                console.log ("Shouldn't be here, something went wrong...");
                process.exit();
              }

              //Loading the stories of the document, one story at the time
              function getStoriesDetails(stories_list){
                var first_story = stories_list.shift();
                console.log(" - Story id: "+first_story);

                app.getObject(first_story).then(function(str){
                  //Loading the story's layout properties
                  str.getLayout().then(function(str_layout){

                    //Checking if the story has sheets
                    if(str_layout.qChildList.qItems.length>0){
                      console.log(" │  This story has some sheets");
                      var str_sheets_list = [];

                      str_layout.qChildList.qItems.forEach(function(story_sheet){
                        str_sheets_list.push(story_sheet.qInfo.qId);
                      })

                      if(str_sheets_list.length>0)
                        getStorySheetsDetails(str_sheets_list);
                      else{
                        console.log("   This is an empty story");
                        //Setting up data and options for XML file storage
                        var str_data = {
                          str_layout
                        };

                        var options = {
                          useCDATA: true
                        };

                        var xml_sheet = js2xmlparser.parse("story", str_data, options);

                        //Storing XML with the story's data
                        fs.writeFile('AppStructures/'+config_app.appname+'_Story_'+first_story+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_sheet, function(err) {
                          if (err) throw err;
                          console.log(' - '+config_app.appname+'_Story_'+first_story+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                          console.log('- - - - - - - - - - - - - - - - - - - ');
                          console.log(" Updating the remaining stories list");
                          console.log(" This is the stories list length: "+stories_list.length);
                          console.log('- - - - - - - - - - - - - - - - - - - ');
                          //Checking if all the stories were processed
                          if(stories_list.length>0)
                            getStoriesDetails(stories_list);
                          else if (stories_list.length==0 && document_list.length>0){
                            console.log(" Loaded all stories. Jumping to next application.");
                            console.log(" Remaining applications: " + document_list.length);
                            getStories(document_list);
                          }
                          else if (stories_list.length==0 && document_list==0){ //checking if all stories and documents were processed
                            console.log("──────────────────────────────────────");
                            resolve("Checkpoint: Applications Stories and Snapshots are loaded");
                          } 
                          else {
                            console.log("──────────────────────────────────────");
                            console.log ("Shouldn't be here, something went wrong...");
                            process.exit();
                          }
                        })
                      }

                      //Loading the story sheets details, one sheet at the time
                      function getStorySheetsDetails(str_sheets_list){

                        var first_story_sheet = str_sheets_list.shift();
                        console.log(" ├- Story Sheet Id: " + first_story_sheet);

                        str.getChild(first_story_sheet).then(function(str_sht){
                          //Loading the sheet's layout properties
                          str_sht.getLayout().then(function(str_sht_layout){
                            //Verifying if the sheet has objects
                            if(str_sht_layout.qChildList.qItems.length>0){
                              console.log(" │└- This story sheet has some items. Let me get the snapshots first.");
                              var str_sht_items_snapshots = [];
                              //Focusing in the snapshots for additional object information
                              str_sht_layout.qChildList.qItems.forEach(function(slide_item){
                                if(slide_item.qData.visualization=='snapshot')
                                  str_sht_items_snapshots.push(slide_item.qInfo.qId);
                              })

                              if(str_sht_items_snapshots.length>0){ //there are snapshots in the slide
                                getStorySnapshotsDetails(str_sht_items_snapshots);
                              }
                              else{ //there are no snapshots in the slide
                                console.log(" │   There are no snapshots in this slide");
                                console.log(" │   Storing the rest of the slide items");

                                //slide items
                                var str_sht_items_other = [];

                                str_sht_layout.qChildList.qItems.forEach(function(slide_item){
                                  if(slide_item.qData.visualization!='snapshot'){
                                    str_sht_items_other.push(slide_item);
                                  }
                                })

                                //Setting up data and options for XML file storage
                                var str_sht_other_details = {
                                  slideitems: str_sht_items_other
                                }

                                var options = {
                                  useCDATA: true
                                }

                                var xml_story_sheet_slideitems = js2xmlparser.parse("storySheetSlideItems", str_sht_other_details, options);

                                //Storing XML with the slideitem's data
                                fs.writeFile('AppStructures/'+config_app.appname+'_StorySlideItems_'+first_story+'_'+first_story_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_story_sheet_slideitems, function(err) {
                                  if (err) throw err;
                                  console.log(' │ - '+config_app.appname+'_StorySlideItems_'+first_story+'_'+first_story_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');
                                  console.log(" │   Storing the slide data");

                                  //Setting up data and options for XML file storage
                                  var slide_data = {
                                    qInfo: str_sht_layout.qInfo,
                                    rank: str_sht_layout.rank
                                  }

                                  var options = {
                                    useCDATA: true
                                  }

                                  var xml_story_sheet = js2xmlparser.parse("storySheet", slide_data, options);

                                  //Storing XML with the slide's data
                                  fs.writeFile('AppStructures/'+config_app.appname+'_StorySlide_'+first_story+'_'+first_story_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_story_sheet, function(err) {
                                    if (err) throw err;
                                    console.log(' │ - '+config_app.appname+'_StorySlide_'+first_story+'_'+first_story_sheet+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');

                                    console.log('- - - - - - - - - - - - - - - - - - - ');
                                    console.log(" Updating the remaining slides list");
                                    console.log(" This is the slides list length: "+str_sheets_list.length);
                                    console.log('- - - - - - - - - - - - - - - - - - - ');
                                    //Checking if all the slides were processed
                                    if(str_sheets_list.length>0)
                                      getStorySheetsDetails(str_sheets_list);
                                    else{
                                      console.log("   This story is loaded");
                                      //Setting up data and options for XML file storage
                                      var str_data = {
                                        str_layout
                                      };

                                      var options = {
                                        useCDATA: true
                                      };

                                      var xml_sheet = js2xmlparser.parse("story", str_data, options);
                                      //Storing XML with the story's data
                                      fs.writeFile('AppStructures/'+config_app.appname+'_Story_'+first_story+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml', xml_sheet, function(err) {
                                      if (err) throw err;
                                        console.log(' - '+config_app.appname+'_Story_'+first_story+'_'+conn_data.user_directory + '_' + conn_data.user_name+'.xml file saved');

                                        if(stories_list.length>0){
                                          console.log('... ... ... ... ... ... ... ... ... ..');
                                          console.log(" Loaded all slides. Jumping to the next story");
                                          console.log(" Stories remaining: " + stories_list.length);
                                          console.log('... ... ... ... ... ... ... ... ... ..');
                                          getStoriesDetails(stories_list);
                                        }
                                        else if(stories_list.length==0 && document_list.length>0){ //no more slides, no more stories, more apps
                                          console.log(" Loaded all stories. Jumping to next application.");
                                          console.log(" Remaining applications: " + document_list.length);
                                          getStories(document_list);
                                        }
                                        else if(stories_list.length==0 && document_list.length==0){ //no more slides, no more stories, no more apps
                                          console.log("──────────────────────────────────────");
                                          resolve("Checkpoint: Applications Stories and Snapshots are loaded");
                                        }
                                        else{
                                          console.log("──────────────────────────────────────");
                                          console.log ("Shouldn't be here, something went wrong...");
                                          process.exit();
                                        }
                                      })//writefile Story  
                                    }
                                  })//writefile StorySlide
                                })//writefile StorySlideItems
                              }

                              //Loading the story snapshots details, one snapshot at the time
                              function getStorySnapshotsDetails(str_sht_items_snapshots){

                                var first_snapshot = str_sht_items_snapshots.shift();
                                console.log(" │ - Snapshot Id: " + first_snapshot);

                                str_sht.getChild(first_snapshot).then(function(str_sht_snpsht){
                                  //Loading the snapshot's layout properties
                                  str_sht_snpsht.getLayout().then(function(str_sht_snpsht_layout){
                                    //Setting up data and options for XML file storage
                                    
                                    str_sht_snpsht_layout = {
                                      qInfo: str_sht_snpsht_layout.qInfo,
                                      visualization: str_sht_snpsht_layout.visualization,
                                      visualizationType: str_sht_snpsht_layout.visualizationType,
                                      qEmbeddedSnapshot: {
                                          showTitles: str_sht_snpsht_layout.qEmbeddedSnapshot.showTitles,
                                          title: str_sht_snpsht_layout.qEmbeddedSnapshot.title,
                                          sheetId: str_sht_snpsht_layout.qEmbeddedSnapshot.sheetId,
                                          creationDate: str_sht_snpsht_layout.qEmbeddedSnapshot.creationDate,
                                          visualization: str_sht_snpsht_layout.qEmbeddedSnapshot.visualization,
                                          sourceObjectId: str_sht_snpsht_layout.qEmbeddedSnapshot.sourceObjectId,
                                          timestamp: str_sht_snpsht_layout.qEmbeddedSnapshot.timestamp
                                      },
                                      style: str_sht_snpsht_layout.style
                                    }

                                    var snapshot_data = {
                                      str_sht_snpsht_layout
                                    };
                                    
                                    var options = {
                                      useCDATA: true
                                    }

                                    var xml_story_sheet_snapshot = js2xmlparser.parse("storySheetSnapshot", snapshot_data, options); 

                                    //Storing XML with the snapshot's data
                                    fs.writeFile('AppStructures/'+config_app.appname+'_StorySnapshot_'+first_story+'_'+first_story_sheet+'_'+first_snapshot+'.xml', xml_story_sheet_snapshot, function(err) {
                                      if (err) throw err;
                                      console.log(' │ - '+config_app.appname+'_StorySnapshot_'+first_story+'_'+first_story_sheet+'_'+first_snapshot+'.xml file saved');

                                      console.log(" │   Updating the remaining snapshots list for this sheet's story");
                                      console.log(" │   This is the snapshots list length: "+str_sht_items_snapshots.length);
                                      //Checking if all the snapshots were processed
                                      if(str_sht_items_snapshots.length>0)
                                        getStorySnapshotsDetails(str_sht_items_snapshots);
                                      else{ //snapshots done, other slide items and next slide
                                        console.log(" │ - Finished the snapshots for sheet's story "+first_story);
                                        console.log(" │   Storing the rest of the slide items");

                                        //slide items
                                        var str_sht_items_other = [];

                                        str_sht_layout.qChildList.qItems.forEach(function(slide_item){
                                          if(slide_item.qData.visualization!='snapshot'){
                                            str_sht_items_other.push(slide_item);
                                          }
                                        })

                                        var str_sht_other_details = {
                                          slideitems: str_sht_items_other
                                        }

                                        //Setting up data for XML file storage
                                        var options = {
                                          useCDATA: true
                                        }

                                        var xml_story_sheet_slideitems = js2xmlparser.parse("storySheetSlideItems", str_sht_other_details, options);

                                        //Storing XML with the slideitem's data
                                        fs.writeFile('AppStructures/'+config_app.appname+'_StorySlideItems_'+first_story+'_'+first_story_sheet+'.xml', xml_story_sheet_slideitems, function(err) {
                                          if (err) throw err;
                                          console.log(' │ - '+config_app.appname+'_StorySlideItems_'+first_story+'_'+first_story_sheet+'.xml file saved');
                                          console.log(" │   Storing the slide data");

                                          //Setting up data and options for XML file storage
                                          var slide_data = {
                                            qInfo: str_sht_layout.qInfo,
                                            rank: str_sht_layout.rank
                                          }

                                          var options = {
                                            useCDATA: true
                                          }

                                          var xml_story_sheet = js2xmlparser.parse("storySheet", slide_data, options);

                                          //Storing XML with the slide's data
                                          fs.writeFile('AppStructures/'+config_app.appname+'_StorySlide_'+first_story+'_'+first_story_sheet+'.xml', xml_story_sheet, function(err) {
                                            if (err) throw err;
                                            console.log(' │ - '+config_app.appname+'_StorySlide_'+first_story+'_'+first_story_sheet+'.xml file saved');
                                            console.log('- - - - - - - - - - - - - - - - - - - ');
                                            console.log(" Updating the remaining slides list");
                                            console.log(" This is the slides list length: "+str_sheets_list.length);
                                            console.log('- - - - - - - - - - - - - - - - - - - ');
                                            //Checking if all the slides were processed
                                            if(str_sheets_list.length>0)
                                              getStorySheetsDetails(str_sheets_list);
                                            else{
                                              console.log("   This story is loaded");
                                              //Setting up data and options for XML file storage
                                              var str_data = {
                                                str_layout
                                              };

                                              var options = {
                                                useCDATA: true
                                              };

                                              var xml_sheet = js2xmlparser.parse("story", str_data, options);
                                              //Storing XML with the story's data
                                              fs.writeFile('AppStructures/'+config_app.appname+'_Story_'+first_story+'.xml', xml_sheet, function(err) {
                                              if (err) throw err;
                                                console.log(' - '+config_app.appname+'_Story_'+first_story+'.xml file saved');

                                                if(stories_list.length>0){
                                                  console.log('... ... ... ... ... ... ... ... ... ..');
                                                  console.log(" Loaded all slides. Jumping to the next story");
                                                  console.log(" Stories remaining: " + stories_list.length);
                                                  console.log('... ... ... ... ... ... ... ... ... ..');
                                                  getStoriesDetails(stories_list);
                                                }
                                                else if(stories_list.length==0 && document_list.length>0){ //no more slides, no more stories, more apps
                                                  console.log(" Loaded all stories. Jumping to next application.");
                                                  console.log(" Remaining applications: " + document_list.length);
                                                  getStories(document_list);
                                                }
                                                else if(stories_list.length==0 && document_list.length==0){ //no more slides, no more stories, no more apps
                                                  console.log("──────────────────────────────────────");
                                                  resolve("Checkpoint: Applications Stories and Snapshots are loaded");
                                                }
                                                else{
                                                  console.log("──────────────────────────────────────");
                                                  console.log ("Shouldn't be here, something went wrong...");
                                                  process.exit();
                                                }
                                              })//writefile Story  
                                            }
                                          })//writefile StorySlide
                                        })//writefile StorySlideItems
                                      }
                                    })
                                  })//str_sht_snpsht.getLayout()
                                })//str_sht.getChild(first_snapshot) - refers to the sheet snapshot item
                              } //getStorySnapshotsDetails
                            }//if(str_layout.qChildList.qItems.length>0) - refers to sheet items
                            else{
                              console.log(" │   This is an empty slide");
                              console.log(" │   Storing the slide data");

                              //Setting up data and options for XML file storage
                              var slide_data = {
                                qInfo: str_sht_layout.qInfo,
                                rank: str_sht_layout.rank
                              }

                              var options = {
                                useCDATA: true
                              }

                              var xml_story_sheet = js2xmlparser.parse("storySheet", slide_data, options);

                              //Storing XML with the slide's data
                              fs.writeFile('AppStructures/'+config_app.appname+'_StorySlide_'+first_story+'_'+first_story_sheet+'.xml', xml_story_sheet, function(err) {
                                if (err) throw err;
                                console.log(' │ - '+config_app.appname+'_StorySlide_'+first_story+'_'+first_story_sheet+'.xml file saved');
                                console.log('- - - - - - - - - - - - - - - - - - - ');
                                console.log(" Updating the remaining slides list");
                                console.log(" This is the slides list length: "+str_sheets_list.length);
                                console.log('- - - - - - - - - - - - - - - - - - - ');
                                //Checking if all the slides were processed
                                if(str_sheets_list.length>0)
                                  getStorySheetsDetails(str_sheets_list);
                                else{
                                  console.log("   This story is loaded");
                                  //Setting up data and options for XML file storage
                                  var str_data = {
                                    str_layout
                                  };

                                  var options = {
                                    useCDATA: true
                                  };

                                  var xml_sheet = js2xmlparser.parse("story", str_data, options);
                                  //Storing XML with the story's data
                                  fs.writeFile('AppStructures/'+config_app.appname+'_Story_'+first_story+'.xml', xml_sheet, function(err) {
                                  if (err) throw err;
                                    console.log(' - '+config_app.appname+'_Story_'+first_story+'.xml file saved');

                                    if(stories_list.length>0){
                                      console.log('... ... ... ... ... ... ... ... ... ..');
                                      console.log(" Loaded all slides. Jumping to the next story");
                                      console.log(" Stories remaining: " + stories_list.length);
                                      console.log('... ... ... ... ... ... ... ... ... ..');
                                      getStoriesDetails(stories_list);
                                    }
                                    else if(stories_list.length==0 && document_list.length>0){ //no more slides, no more stories, more apps
                                      console.log(" Loaded all stories. Jumping to next application.");
                                      console.log(" Remaining applications: " + document_list.length);
                                      getStories(document_list);
                                    }
                                    else if(stories_list.length==0 && document_list.length==0){ //no more slides, no more stories, no more apps
                                      console.log("──────────────────────────────────────");
                                      resolve("Checkpoint: Applications Stories and Snapshots are loaded");
                                    }
                                    else{
                                      console.log("──────────────────────────────────────");
                                      console.log ("Shouldn't be here, something went wrong...");
                                      process.exit();
                                    }
                                  })//writefile Story  
                                }
                              })//writefile StorySlide
                            }
                          })//str_sht.getLayout()
                        })//str.getChild(first_story_sheet)
                      }//getStorySheetsDetails
                    }//if(str_layout.qChildList.length>0) - refers to sheets in the story
                  })//str.getLayout
                })//app.getObject
              }//getStoriesDetails
            })
          })
        })
      }
    });//promise
    return promise_str;
  }//getAppStories
}//module exports