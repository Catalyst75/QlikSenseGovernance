var fs = require('fs');
var path = require('path');
var util = require('util');
var promise = require('q');

var analyzer = require('qlik-script-log-lineage');
var json2csv = require('json2csv');

var readdir = promise.denodeify(fs.readdir);
var readFile = promise.denodeify(fs.readFile);

var logFilesDirectoryName = 'ScriptLogs';

var parsedLogFilesDirectoryName = 'ScriptLogsParsed';
var parsedLogErrorsFilesDirectoryName = 'ScriptLogsParsedErrors';

var logFilesDirectoryFullPaths = [
	// 'C:\\ProgramData\\Qlik\\Sense\\Log\\Script' //default sense logs path
	path.join(__dirname, logFilesDirectoryName, '') //local tool folder

];

var apps_list = JSON.parse(fs.readFileSync('ApplicationsList.json','utf-8'));
var app_script_files = [];
var scripts_ignored = [];

var util_options = { showHidden: false, depth: 8, colors: true, maxArrayLength: null };

for(i in apps_list){
	app_script_files[apps_list[i]] = [];
}

var available_script_logs = fs.readdirSync(logFilesDirectoryName);

//storing them in the app_script_files
for(i in available_script_logs){
	var filename_split = available_script_logs[i].split('.');
	var time_split = filename_split[1].split('_');
	var reload_time = new Date(time_split[0], //year
						   time_split[1], //month
						   time_split[2], //day
						   time_split[3], //hour
						   time_split[4], //minute
						   time_split[5]); //second

	if(app_script_files[filename_split[0]]){
		app_script_files[filename_split[0]].push({
												app_id: filename_split[0], 
												reload_time: reload_time, 
												filename: available_script_logs[i]
											});
	}else{
		if(scripts_ignored[filename_split[0]]){
			scripts_ignored[filename_split[0]].push({
												app_id: filename_split[0], 
												reload_time: reload_time, 
												filename: available_script_logs[i]
											});
		}else{
			scripts_ignored[filename_split[0]] = [];
			scripts_ignored[filename_split[0]].push({
												app_id: filename_split[0], 
												reload_time: reload_time, 
												filename: available_script_logs[i]
											});
		}
	}
}

var logs_to_analyze = [];
console.log();
console.log("Looking for the most recent script logs available.");
for (i in app_script_files){
	
	var max_date = new Date(0);
	var filename_arr_address = -1;
	if(app_script_files[i].length>0){
		//sorting
		app_script_files[i].sort(function(a,b){return b.reload_time-a.reload_time});
		logs_to_analyze.push(app_script_files[i][0].filename);
	}
}

console.log("Done. Found "+logs_to_analyze.length+" files.");
console.log();
console.log("This is the list of latest available scripts logs to parse: ")
for(i in logs_to_analyze)
	console.log(" - "+logs_to_analyze[i]);

var logFilesFilter = [
	
];

var logFilesForce = logs_to_analyze;

analyzer.getAnalyzer().then(analyzer => {
	
	return promise.all(logFilesDirectoryFullPaths.map(logFilesDirectoryFullPath => readdir(logFilesDirectoryFullPath).then(files => {

		return files.map(file => {
			
			if(fs.lstatSync(path.join(logFilesDirectoryFullPath, file)).isFile()) {
				
				return {
					fileName: file,
					fullName: path.join(logFilesDirectoryFullPath, file)
				};
				
			}
			
			return false;
			
		})
		.filter(i => i && logFilesFilter.indexOf(i.fileName) == -1)
		.filter(i => i && (logFilesForce.length == 0 || logFilesForce.indexOf(i.fileName) !== -1));
		
	}))).then(files => {
		
		return promise.all([
	
			analyzer,
			
			[].concat.apply([], files)
		
		]);
		
	}) 
	
}).then(reply => {
	
	var analyzer = reply[0];
	var files = reply[1];

	var step = promise([]);
	files.forEach(file => {

		step = step.then(function(arr) {
			
			return promise().then(() => {
				
				return readFile(file.fullName, 'utf-8').then(fileContent => {
					
					return {
						fullName : file.fullName,
						fileName: file.fileName,
						fileContent: fileContent
					}
					
				});
				
			}).then(file => {
				console.log();
				console.log("-- Starting to analyze file "+file.fileName);
				var analyzed = analyzer.analyze(file.fileContent);
				
				if(analyzed.analyzed) {
					console.log();
					console.log("└- Success! File was parsed correctly.")
					console.log(' └- Storing libraries.csv');
					
					var libraries = json2csv({
						data: analyzed.libraries,
						fields: [ 'keyLib', 'libName', 'libRow' ],
						defaultValue: 'false'
					});
					
					fs.writeFileSync(path.join(__dirname,parsedLogFilesDirectoryName, file.fileName.split('.')[0]+'_libraries.csv'), libraries);
					console.log(" └- Stored libraries.csv");

					console.log(' └- Storing statements.csv');
					
					var statements = json2csv({
						data: analyzed.statements,
						fields: [
							'keyStatement', 'lib.keyLib', 'statementType', 'statement',
							'statementSourceType', 'statementSource', 'statementSourceLib',
							'statementSourceTable', 'statementSourceParameters', 'statementTable'
						],
						fieldNames: [
							'keyStatement', 'keyLib', 'statementType', 'statement',
							'statementSourceType', 'statementSource', 'statementSourceLib',
							'statementSourceTable', 'statementSourceParameters', 'statementTable'
						],
						defaultValue: 'false'
					});
					
					fs.writeFileSync(path.join(__dirname,parsedLogFilesDirectoryName, file.fileName.split('.')[0]+'_statements.csv'), statements);
					console.log(' └- Stored statements.csv');

					console.log(' └- Storing fields.csv');
					
					var fields = json2csv({
						data: analyzed.fields,
						fields: [ 'keyField', 'tableName', 'fieldName' ],
						defaultValue: 'false'
					});
					
					fs.writeFileSync(path.join(__dirname,parsedLogFilesDirectoryName, file.fileName.split('.')[0]+'_fields.csv'), fields);
					console.log(' └- Stored fields.csv');

					console.log(' └- Storing linksFieldStatement.csv');

					var links2 = analyzed.links.map(link => {
						return {
							keyField: link.field.keyField,
							keyStatement: link.source.statement.keyStatement,
							rowNumber: link.source.rowNumber,
							expression: link.source.expression.txt()
						}
					});
					
					var linksFieldStatement = json2csv({
						data: links2,
						fields: [ 'keyField', 'keyStatement', 'rowNumber', 'expression' ],
						defaultValue: 'false'
					});
						
					fs.writeFileSync(path.join(__dirname,parsedLogFilesDirectoryName, file.fileName.split('.')[0]+'_linksFieldStatement.csv'), linksFieldStatement);
					console.log(' └- Stored linksFieldStatement.csv');
				
				} else {
					console.log();
					console.log("└- Warning!");
					console.log("   "+file.fileName + " is not parseable at the moment.")
					console.log();

					// console.log(util.inspect(analyzed, { showHidden: false, depth: 8, colors: true, maxArrayLength: null }));
					
					fs.writeFileSync(path.join(__dirname,parsedLogErrorsFilesDirectoryName, file.fileName+'.json'), JSON.stringify(analyzed, null, 3));
					console.log('   File stored in JSON format at ' + parsedLogErrorsFilesDirectoryName + ' folder.');
				}
			})
		});
	});
	
	return step;
	
}).then(success => {
	console.log();
	console.log("Finished all files!");
})
.fail(err => console.log(err))