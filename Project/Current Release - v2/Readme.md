# Configuration Walkthrough

##Start with the NodeJS components
1. Download NodeJS (either 6 or 7) => https://nodejs.org/en/
2. Download Git For Windows (might be required to locate some npm modules) => https://git-for-windows.github.io/
3. Copy the 'SenseAppsGovernance_v2' folder to a place of your chosing within the Qlik Sense Server
4. Follow the 'Readme - Node Js Configs and Walkthroug.txt' to setup your environment
 - Once all is setup and everything is running ok you may setup the 'ScriptParsingTool' that is included in 'SenseAppsGovernance'
 - Follow the 'Readme - Node Js Configs and Walkthroug.txt' included in the 'ScriptParsingTool' folder
 - After everything running ok, you may advance to your Qlik Sense Components setup

####Notes
* When running the 'ScriptParsingTool', some parsing logic might still be under development. 
   If you have a crash, identify the file given in the console and remove it temporarly. Share the file with us so we can improve this.
   
* Both when running 'SenseAppsGovernance' and 'ScriptParsingTool', at the end you must have a successfull message indicating all is done.
   If this message does not appear, do not assume all went well. Verify the configs and if it persists let us know.
##### Screenshot example for successfull 'SenseAppsGovernance_v2' run
![alt text](https://github.com/rvspt/QlikSenseGovernance/blob/QlikSenseGovernance-v2/Images/SenseAppsGovernanceSuccessful.PNG "SenseAppsGovernance_v2 run successfully")
##### Screenshot example for successfull 'ScriptParsingTool' run
![alt text](https://github.com/rvspt/QlikSenseGovernance/blob/QlikSenseGovernance-v2/Images/ScriptParsingToolSuccessful.PNG "ScriptParsingTool run successfully")

* You may optionally skip the 'ScriptParsingTool' if you do not wish to have Lineage analysis. If you do so, make sure to uncomment the first line of the 'Lineage' tab in the 'Sense Governance v2.qvf' app script (it is located in the Qlik Sense Components)


##Configuring Qlik Sense Components
1. Import 'Sense Governance QVD Generator v2.qvf'. If not existing already, create/configure 3 Library Connections in QMC:
  - AppStructures: this refers to the 'AppStructures' folder of the 'SenseAppsGovernance' NodeJS component (configured in 1)
  - ParsedScripts: this refers to the 'ScriptParsingTool/ScriptLogsParsed' folder of the 'SenseAppsGovernance' NodeJS component (configured in 1)
  - GovernanceQVDs: folder of your choosing that will store the converted XML files from NodeJS 'AppStructures' to a QVD format for the 'SenseGovernance v2.qvf'
2. Import 'Sense Governance v2.qvf'
3. Import the extension 'DataLineage.zip'
4. Import the extension 'd3dynamictreelayout-qs.zip' (warning - unless you are already using version 1.2.1 of this extension, re-import it if it is alreay installed on server)
5. Open 'Sense Governance QVD Generator v2.qvf', go to 'Data Load Editor' and do a reload
6. Open 'Sense Governance v2.qvf', go to 'Data Load Editor' and do a reload
7. Enjoy :-) 

####Notes
* 'Sense Governance v2.qvf' has already some data about a dev environment I have in a VM, so you can see what is expected to appear when fed with your data.
