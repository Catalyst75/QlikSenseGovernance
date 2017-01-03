
Certificates export in QMC
 * machine name
 * password (leave blank)
 * include secrets key
 * windows format

Folder structure
 * create AppStructures or change destination folder name in scripts

Node.js modules required to install (npm install <module> --save)
 * qsocks
 * request
 * promise
 * js2xmlparser

Other modules that can make the difference. These should not be required to install as they are in NodeJS core.
 * fs
 * require


Command examples:
 * minimum to work: node apps-info.js -a SenseDemo -ud SenseDemo -un Sense
 * full specification: node apps-info.js -a SenseDemo -c "C:\Nodejs-projects\Apps-Governance\client.pfx" -ud SenseDemo -un Sense -o localhost -t
 * single app: node apps-info.js -a SenseDemo -ud SenseDemo -un Sense -s 1d0c97e5-5884-4bb6-b4f8-1c0ec385fcbf
 * only apps metadata: node apps-info.js -a SenseDemo -ud SenseDemo -un Sense -nd
 * importance of the '-t' flag: it allows to record time spent in each request to estimate objects rendering times

Node files:
 * apps-info.js - project executable with helper. Loads in sequence the files in 'lib'.
 * lib/app-list.js - gets the list of applications available in the server. Stores the DocumentsList.xml file.
 * lib/app-connections.js - gets the list of connections available to the user. Stores the DocumentsConnections.xml file.
 * lib/app-tables.js - gets the tables of the datamodel for each one of the applications. Stores a <application-id>_KeyTables.xml file.
 * lib/app-library-dimensions.js - gets the library dimensions for each one of the applications. Stores a <application-id>_LibraryDimensions_<dimension-id>.xml file.
 * lib/app-library-measures.js - gets the library measures for each of the applications. Stores a <application-id>_LibraryMeasures_<measure-id>.xml file.
 * lib/app-library-masterobjects.js - gets the library master objects for each of the aplications. Stores a <application-id>_LibraryMasterObjects_<master-object-id>.xml file.
 * lib/app-bookmarks.js - gets the bookmarks for each of the applications. Stores a <application-id>_Bookmarks_<bookmark-id>.xml file.
 * lib/app-sheets.js - gets the sheets and it's objects for each of the applications. Stores:
			 - a <application-id>_Sheet_<sheet-id>.xml file.
			 - a <application-id>_SheetObject_<sheet-id>_<sheet-object-id>.xml file.
 * lib/app-stories.js - gets the stories and it's contents for each of the applications. Stores:
			 - a <application-id>_Story_<story-id>.xml file.
			 - a <application-id>_StorySlide_<story-id>_<slide-id>.xml file.
			 - a <application-id>_StorySlideItems_<story-id>_<slide-id>.xml file. (represents all the items of a specific slide excelpt the snapshots)
			 - a <application-id>_StorySnapshot_<story-id>_<slide-id>_<snapshot-id>.xml file.
* lib/expr-fields.js - this is a promise that tries to parse expressions using 'lib/parse.js' and 'lib/qelParser.js', both created by [pouc] (https://github.com/pouc).
