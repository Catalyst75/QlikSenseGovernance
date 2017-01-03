Important!
* This tool needs an output file named 'ApplicationsList.json' from '../apps-info.js'. 
  Make sure '../apps-info.js' must have ran previously without errors.
* This tool will only analyse the most recent log of the application.
* Parsing scripts might require high amounts of memory, depending on script logs filesizes.
  If you have an issue with NodeJS assigning low amounts of memory you may force adding
  the following command uppon execution with desired amount of memory Mb (example specifies 
  to use up to ~8Gb): 

  --max-old-space-size=8000


Folder structure
 * create ScriptLogsParsed or change destination folder name in scripts
 * create ScriptLogsParsedErrors or change destination folder name in scripts

Node.js modules required to install (npm install <module> --save)
 * q
 * qlik-script-log-lineage
 * json2csv

Defining Script Logs location:
 * By default the tool is pointing to a local 'ScriptLogs' folder. 
 * You may specify the server script logs if desired. In a typical Qlik Sense Server 
   instalation it should be: 'C:\ProgramData\Qlik\Sense\Log\Script'
 * When specifying a custom logs folder path you need to indicate it's relative path
   on the scripts. Check lines 12, 18 and 19 for examples in the 'ScriptParsingTool.js' file.

Command examples:
 * simply run 'node ScriptParsingTool.js' 

Tips:
 * Go get a coffee and be patient :-) 
   Depending on script log filesize some files can up to some minutes...
