# Qlik Sense Governance
Project to help Administrators to understand a Qlik Sense Site composition. 

Developed and focused in 3 major analysis vectors for Qlik Sense Administrators:
* Application Structure and Reach i.e. sources, owners, fields transformations and lineage, size and footprint within the site including indentification of consuming users and their self-service creations
* Performance i.e. application complexity, object rendering times and potential heavy calculated objects/sheets
* Contents i.e. library items and their quality to improve self-service experience, objects and components labeling, applications institutional contents vs. users self-service creations

Tested with Qlik Sense 3.1.3.

Follow the Instructions.pdf file to find out more information about this project and how to try it yourself.

### Release History
 * v1 - Initial relase of the project
 * v1.1 - Added capability to pool the server apps impersonating it's users. This allows to get information about what the users can actually reach within the Sense Server environment, i.e: the user's personal apps in the "My Work" stream
 * v1.2 - Added a new mode: "No Data". This mode allows to use Sense's 'Open Apps Without Data' feature, avoiding heavy RAM consumption for quick apps metadata update (such as master items, users objects, sheets, stories and bookmarks, etc.). When activated, no app datamodel information will be loaded.
 * v2 - Fully revised version that now includes Data Lineage capability. Some of the features are:
  * New interfaces for quicker site understanding
  * Script log and expressions parsing for better field detection accuracy (contributed by [pouc](https://github.com/pouc))
  * Data lineage interface indicating the path of applications components in the sequence (contributed by [expovin](https://github.com/expovin))
     * Data Sources (and script commands) => Application => Tables => Fields => Library Dimensions or Measures => Sheets => Objects => Stories
  * Objects and sheets estimated rendering time
