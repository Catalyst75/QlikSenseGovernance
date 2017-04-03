var Promise = require("promise");
var qelParser = require('./parse.js');

module.exports={
	checkForExpressionFields: function(expression){
		var promise_expression_fields = new Promise(function(resolve){
			var cleanup_fields = true;
			try{
				var expression_fields = qelParser.parse(expression);	
			}
			catch(err){
				//console.log("WARNING: I guess I am not ready yet for these expression functions. Share me with my creators please");
				cleanup_fields = false;
				resolve({ expressionFields: "", expressionFieldsError: err.message });
			}

			if(cleanup_fields){
	          var fields = [];

	          checkExpression(expression_fields);

	          function checkExpression(expression_structure){
	            if(expression_structure[0].constructor === Array){
	              if(expression_structure[0][0]=='field'){
	                fields.push(expression_structure[0][1]);
	                expression_structure.shift();
	                if(expression_structure.length!=0){
	                  checkExpression(expression_structure);
	                }
	                return expression_structure;
	              } else if(expression_structure[0].length == 2){
	                checkExpression(expression_structure[0]);
	                expression_structure.shift();
	                if(expression_structure.length!=0){
	                  checkExpression(expression_structure);
	                }
	                // return expression_structure;
	              } else if (expression_structure[0].length > 2){
	                if(expression_structure[0].length > 2){
	                  checkExpression(expression_structure[0]);
	                }
	                expression_structure.shift();
	                if(expression_structure.length!=0){
	                  checkExpression(expression_structure);
	                }
	                return expression_structure;
	              } else if(expression_structure.length==1){
	                if(expression_structure[0].length>=1)
	                  checkExpression(expression_structure[0]);
	                return expression_structure;
	              } else if(expression_structure.length == 0){
	                return expression_structure;
	              }
	              else
	                return expression_structure;
	            }else{
	              if(expression_structure[0] == 'formula'){
	                fields.push(expression_structure[3]);
	                expression_structure.shift();
	                expression_structure.pop();
	                checkExpression(expression_structure);

	              }else{
	                expression_structure.shift();
	                if(expression_structure.length!=0){
	                  checkExpression(expression_structure);
	                }else 
	                  return expression_structure;
	              }
	            }
	          }

	          //clear fields
	          fields = [].concat.apply([], fields);
	          fields = uniqueFields(fields);
	          function uniqueFields(a) {
	              var seen = {};
	              var out = [];
	              var len = a.length;
	              var j = 0;
	              for(var i = 0; i < len; i++) {
	                   var item = a[i];
	                   if(seen[item] !== 1) {
	                         seen[item] = 1;
	                         out[j++] = item;
	                   }
	              }
	              return out;
	          }
	          resolve({ expressionFields: fields, expressionFieldsError: "" });
	      	}
		})//promise
		return promise_expression_fields;
	},//checkForExpressionFields

	checkForDimensionFields: function(dimensions){ //object as {calculated_dimensions, non_calculated_dimensions}
		var promise_dimension_fields = new Promise(function(resolve){

			var errors = [];
			var parsed_dimensions = [];
			var cleanup_fields = false;
			var errors_parsing = false;

			dimensions.calculated_dimensions.forEach(function(calculated_dimension){
				try{
					var dimension_fields = qelParser.parse(calculated_dimension);
					parsed_dimensions.push(dimension_fields);
					cleanup_fields = true;	
				}catch(err){
					//console.log("WARNING: I guess I am not ready yet for these expression functions. Share me with my creators please");
					errors.push({non_parseable_dim: calculated_dimension, dimensionFieldsErrorMessage: err.message});
					errors_parsing = true;
				}
			});	
			
			var dimension_details = {};

			if(cleanup_fields){
				var fields = [];

				parsed_dimensions.forEach(function(parsed_dimension){

					checkExpression(parsed_dimension);

		          	function checkExpression(expression_structure){
		            if(expression_structure[0].constructor === Array){
		              if(expression_structure[0][0]=='field'){
		                fields.push(expression_structure[0][1]);
		                expression_structure.shift();
		                if(expression_structure.length!=0){
		                  checkExpression(expression_structure);
		                }
		                return expression_structure;
		              } else if(expression_structure[0].length == 2){
		                checkExpression(expression_structure[0]);
		                expression_structure.shift();
		                if(expression_structure.length!=0){
		                  checkExpression(expression_structure);
		                }
		              } else if (expression_structure[0].length > 2){
		                if(expression_structure[0].length > 2){
		                  checkExpression(expression_structure[0]);
		                }
		                expression_structure.shift();
		                if(expression_structure.length!=0){
		                  checkExpression(expression_structure);
		                }
		                return expression_structure;
		              } else if(expression_structure.length==1){
		                if(expression_structure[0].length>=1)
		                  checkExpression(expression_structure[0]);
		                return expression_structure;
		              } else if(expression_structure.length == 0){
		                return expression_structure;
		              }
		              else
		                return expression_structure;
		            }else{
		              if(expression_structure[0] == 'formula'){
		                fields.push(expression_structure[3]);
		                expression_structure.shift();
		                expression_structure.pop();
		                checkExpression(expression_structure);

		              }else{
		                expression_structure.shift();
		                if(expression_structure.length!=0){
		                  checkExpression(expression_structure);
		                }else 
		                  return expression_structure;
		              }
		            }
		          }

		          fields.concat(dimensions.non_calculated_dimensions);

		          //clear fields
		          fields = [].concat.apply([], fields);
		          fields = uniqueFields(fields);
		          function uniqueFields(a) {
		              var seen = {};
		              var out = [];
		              var len = a.length;
		              var j = 0;
		              for(var i = 0; i < len; i++) {
		                   var item = a[i];
		                   if(seen[item] !== 1) {
		                         seen[item] = 1;
		                         out[j++] = item;
		                   }
		              }
		              return out;
		          }
				});	    

		        dimension_details.dimensionFields = fields;      	
			}else{//only non calculated dimensions
				dimension_details.dimensionFields = dimensions.non_calculated_dimensions;
			}

			if(errors_parsing){
				dimension_details.dimensionFieldsErrors = errors;
			}else{
				dimension_details.dimensionFieldsErrors = [];
			}

			resolve(dimension_details);
		});
		return promise_dimension_fields;
	}
}//module