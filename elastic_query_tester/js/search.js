$(document).ready(function() {
    
    $(document).bind('search', function(event, data) {
        var url = $("#host").val() + '/'
                + $("#index").val() + '/'
                + $("#type").val() + '/'
                + $("#urlparam").val();
        
        var field = document.getElementById("query");
		var query = "";
		var pattern ="";
		var httpMethod = $("#httpMethod").val();
		if(data.terms.length > 0) {
			pattern = new RegExp("("+data.terms+")", "gi");
			data.terms = "*" + data.terms + "*"
		}
		if(httpMethod === "POST") {
			query = field.value.replace(/data.terms/g, data.terms).replace("\n", "").replace("\t", "").trim();
		} else if(httpMethod === "GET") {
			query = JSON.parse(field.value.replace("data.terms", data.terms));
		}
        $.ajax({
            url: url,
            data: query,
            dataType: "json",
            contentType: 'application/json',
            type: $("#httpMethod").val(), 
            success: function(data) {
                var tmp = data;
                $('#error').empty();


				

				

                //iteriert dynamisch über das ergebnis und erstellt 2 JSON welche im HTML dann als Tabelle & Info dargestellt werden für jedes Element. Dadurch ist man nicht abhängig vom Typ sondern kann für jede Suche verwendet werden.
                for(var i = 0; i < data.hits.hits.length; i++) {
            		var j = 0;
			    	var dynamicResponseInfo = {
						"keys": [],
						"values":[]
					};
					var dynamicResponse = {
						"keys": [],
						"values":[]
					};
			    	Object.keys(data.hits.hits[i]._source).forEach(function(key) {
						dynamicResponse.keys[j] = key;
						dynamicResponse.values[j] = data.hits.hits[i]._source[key];
						if(String(dynamicResponse.values[j]).startsWith('http')) {
							dynamicResponse.values[j] = urlify(dynamicResponse.values[j]);
						} else if(validHTML(String(dynamicResponse.values[j]))) {
							dynamicResponse.values[j] = "<pre style='white-space: pre-wrap;'><code class='html htmlContent'>" + dynamicResponse.values[j].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + "</code></pre>"
						}
						j++;
					});
                	var j = 0;
					Object.keys(data.hits.hits[i]).forEach(function(key) {
						if(key != "_source" && key != "") {
							dynamicResponseInfo.keys[j] = key;
							dynamicResponseInfo.values[j] = data.hits.hits[i][key];
						}
						j++;
					});

					data.hits.hits[i].dynamicResponse = dynamicResponse;
					data.hits.hits[i].dynamicResponseInfo = dynamicResponseInfo;
                }

                if(httpMethod === "POST") {
					query = syntaxHighlight(JSON.stringify(JSON.parse(query), null, "\t"))
				} else if(httpMethod === "GET") {
					query = syntaxHighlight(JSON.stringify(query, null, "\t"))
				}

                var searchData = {
                	"data" : data,
                	"query": query,
                	"url": url + query
                };
                $('#info').empty();
                $("#searchInfoTemplate").tmpl(searchData).appendTo("#info");
               	$('#results').empty();
                $("#searchResultTemplate").tmpl(data.hits).appendTo("#results");
                $('pre code').each(function(i, block) {
					hljs.highlightBlock(block);
				});
            },
            error: function(data) {
            	$('#error').empty();
            	$('#results').empty();
            	$('#info').empty();
            	var responseData = {
            		"data": data,
            		"responseJSON": syntaxHighlight(JSON.stringify(data.responseJSON, null, "\t"))
            	}

            	if(responseData.responseJSON === '') {
            		responseData.responseJSON = "<div style='text-align: center; border: 1px solid red;'>ES IST EIN FEHLER BEIM ABSENDEN DES REQUESTS AUFGETRETEN.</div>";
            	}

                $("#searchErrorTemplate").tmpl(responseData).appendTo("#error");
            },
        })
    });
    //Submit on each key pressed, but put in a minimum interval with typewatch
    $('#search_txt').keyup(function() {
        typewatch(function () {
            var lastSearchTerm = $('#search_txt').data('lastSearchTerm');
            if (!lastSearchTerm) {
                lastSearchTerm = '';
            }
            if (lastSearchTerm != $('#search_txt').val()) {
                $(document).trigger('search', {terms:$('#search_txt').val()});
            }
            $('#search_txt').data('lastSearchTerm', $('#search_txt').val());
        }, 1);
    });
    
    $('#query').focusout(function() {
    	if($('#search_txt').val() != '') {
    		$(document).trigger('search', {terms:$('#search_txt').val()});
    	}
    })

	


    $("#httpMethod").click(function() {
		val = $("#httpMethod").val();
		if(val == "POST") {
			$("#httpMethod").val("GET");
			$("#query").val('{ \n \t "q": "text:data.terms", \n \t "size":"2" \n}');
			$("#query").height(80);
		} else if(val == "GET") {
			$("#httpMethod").val("POST");
			$("#query").val('{\r\t"size": 2\r\t"query": {\r\t\t"query_string" : { \r\t\t\t"query" : "data.terms",\r\t\t\t"fields" : ["url^3", "text^1.5"],\r\t\t\t"default_operator": "AND"\r\t\t}\r\t},\r\t"sort": [\r\t\t{ "_score":{"order":"desc"}}\r\t]\r}');
			$("#query").height(220);
		}
		if($('#search_txt').val() != '') {
    		$(document).trigger('search', {terms:$('#search_txt').val()});
    	}
	})

    $('.search_settings input').focusout(function() {
    	if($('#search_txt').val() != '') {
    		$(document).trigger('search', {terms:$('#search_txt').val()});
    	}
    })

    //Creates a minimum interval between posted searches. 
    var typewatch = (function() {
        var timer = 0;
        return function(callback, ms) {
            clearTimeout(timer);
            timer = setTimeout(callback, ms);
        }
    })();

    var textareas = document.getElementsByTagName('textarea');
	var count = textareas.length;
	for(var i=0;i<count;i++){
	    textareas[i].onkeydown = function(e){
	        if(e.keyCode==9 || e.which==9){
	            e.preventDefault();
	            var s = this.selectionStart;
	            this.value = this.value.substring(0,this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
	            this.selectionEnd = s+1; 
	        }
	    }
	}

	function syntaxHighlight(json) {
		if(json != undefined) {
			json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
		        var cls = 'number';
		        if (/^"/.test(match)) {
		            if (/:$/.test(match)) {
		                cls = 'key';
		            } else {
		                cls = 'string';
		            }
		        } else if (/true|false/.test(match)) {
		            cls = 'boolean';
		        } else if (/null/.test(match)) {
		            cls = 'null';
		        }
		        return '<span class="' + cls + '">' + match + '</span>';
		    });
		}
		return ''
	    
	}

	function urlify(text) {
	    var urlRegex = /(https?:\/\/[^\s]+)/g;
	    return text.replace(urlRegex, function(url) {
	        return '<a href="' + url + '">' + url + '</a>';
	    })
	}

	function validHTML(html) {
	  var openingTags, closingTags;

	  html        = html.replace(/<[^>]*\/\s?>/g, '');      // Remove all self closing tags
	  html        = html.replace(/<(br|hr|img).*?>/g, '');  // Remove all <br>, <hr>, and <img> tags
	  openingTags = html.match(/<[^\/].*?>/g) || [];        // Get remaining opening tags
	  closingTags = html.match(/<\/.+?>/g) || [];           // Get remaining closing tags
	  if(openingTags.length > 0 || closingTags.length > 0) {
	  	return true;
	  } 
	  return false;
	}
})