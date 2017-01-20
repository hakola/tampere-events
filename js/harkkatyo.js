(function () {

	function Event(title, description, address, date, web) {
		this.title = title;
		this.description = description;
		this.date = date;
		this.address = address;
		this.web = web;
	}

	/* Getting events from the visittampere database */
	function getEvents(url) {
		if(url == null)
			url = "http://visittampere.fi:80/api/search?type=event&start_datetime="+Date.now()+"&limit=10";
		$.ajax({
			type: "GET",
			dataType:"json", 
			url: url, 
			data: "", // mahdollinen kysely (query string)
			success: function (eData) {
				createList(eData);
			},
			error: function() {
				alert( "Tiedon noutaminen ei onnistunut" );
			}
		})
	}

	/* Storing information got from database to an array and using it to call writelist and initmap functions */
	function createList(eData) {
		eTable = [];
		for(i = 0; i < eData.length; ++i) {
			var time;
			var d;
			if(eData[i].start_datetime != null) {
				d = new Date(eData[i].start_datetime);
			} else {
			    for(j = 0; j < eData[i].times.length; ++j) {
			    	if(eData[i].times[j].start_datetime > Date.now()) {
			    		d = new Date(eData[i].times[j].start_datetime);
	                 	j = eData[i].times.length;
			    	}
			    }
			}
			eTable.push(new Event(eData[i].title, eData[i].description, eData[i].contact_info.address, 
						d, eData[i].contact_info.link));
		}
		writeList(eTable);
		initMap(eTable);
	}

	function writeList(eTable) {
		eTable.sort(function(a, b){return a.date-b.date});
		// Emptying previous search
		$('#events').empty();

		// Creating list and inserting it into dom-tree
		if(eTable.length > 0) {
			for(i = 0; i < eTable.length; ++i)
				$("<li class=\"list-group-item\" id=\"list"+i+"\"></li").appendTo('#events');
		} else {
			$("<li class=\"list-group-item\"><div class=\"alert alert-danger\"><strong>"+
			  "Haulla ei löytynyt tapahtumia!"+"</strong></div></li").appendTo('#events');
		}

		for(i = 0; i < eTable.length; ++i) {
			var d = eTable[i].date;
			if(eTable[i].date != undefined) {
		        mins = (d.getMinutes() < 10) ? '0'+ d.getMinutes() : '' + d.getMinutes();
		        time = d.getDate() + '.' + (d.getMonth()+1) + '.'  + d.getFullYear() + ' at ' +
		        	   (d.getHours()) + ':' + mins;
		    } else
		    	time = "Aikaa ei löytynyt";

			// Writing data to the dom-tree
			$("<div id=\"event"+i+"\"></div>").appendTo('#list'+i);
			$("<div id=\"event-btn\" type=\"button\" class=\"btn-info btn-block\">"+eTable[i].title+
			 "</div>").appendTo('#event'+i);

			$("<div id=\"info\"></div>").appendTo('#list'+i);
			$("<div><strong>Mitä:</strong> "+eTable[i].description+"</div>"+
			  "<div><strong>Missä:</strong> "+eTable[i].address+"</div>"+
			  "<div><strong>Koska:</strong> "+time+"</div>"
			  ).appendTo('#list'+i+' #info');
			if(eTable[i].web != null) {
				$("<div><a href=\""+eTable[i].web+"\"><strong>Nettisivulle</strong> </a></div>").appendTo('#list'+i+' #info');
			}
			$("<div><button type=\"button\" class=\"btn btn-primary btn-sm\" id=\"pin"+i
			 +"\" >Kohdista</button></div></div>").appendTo('#list'+i+' #info');

			/* Click function for every event*/
			$('#pin'+i).click(function() {
				var id = this.id.replace("pin", "");
				var t = eTable[id].title;
				setMapOnAll(null);
				markers[id].setMap(map);
				markers[id].setTitle(eTable[id].title);
				map.setCenter(eventPos[id]);
				map.setZoom(15);
				if( !$('#show-all').is(':visible') )
					$('#show-all').toggle();
			})

			$('#list'+i+' #info').hide(200);
			$('#event'+i).click(function() {
				$('#'+this.id+'+ #info').toggle(200);
			})
		}

	}

	/* Initialising map */
	function initMap(eTable) {
	  	map = new google.maps.Map(document.getElementById('map'), {
	   				zoom: 12,
	   				center: {lat: 61.498, lng: 23.762},
	   				mapTypeControlOptions: {
      					mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
    				}
	  			});
	  	map.mapTypes.set('map_style', styledMap);
 		map.setMapTypeId('map_style');
	  	var geocoder = new google.maps.Geocoder();
		geocodeAddress(geocoder, map, eTable);
	}

	/* Geocoding addresses */
	function geocodeAddress(geocoder, resultsMap, eTable) {
		markers = [];
		eventPos = [];
		for (x = 0; x < eTable.length; ++x) {
			var t = eTable[x].title;
	        $.getJSON('http://maps.googleapis.com/maps/api/geocode/json?address='+eTable[x].address+
	        		  " tampere"+'&sensor=false', null, function (data) {
	            var p = data.results[0].geometry.location;
	            var latlng = new google.maps.LatLng(p.lat, p.lng);
	            var title = data.results[0].formatted_address;
	            addMarker(latlng, title);
	            eventPos.push(latlng);
	        });
    	}
	}

	function addMarker(location, title) {
	  var marker = new google.maps.Marker({
	                position: location,
	                map: map,
	                title: title
	            });
	  markers.push(marker);
	}

	function setMapOnAll(map) {
	  for (var i = 0; i < markers.length; i++) {
	    markers[i].setMap(map);
	  }
	}


	$('#starttime-picker').datepicker({
	    format: "dd/mm/yyyy",
	    weekStart: 1,
	    language: "fi",
	    orientation: "bottom auto",
	    autoclose: true,
   		todayHighlight: true
	});
	$('#endtime-picker').datepicker({
	    format: "dd/mm/yyyy",
	    weekStart: 1,
	    language: "fi",
	    orientation: "bottom auto",
	    autoclose: true,
    	todayHighlight: true
	});

	/* Constructing the database call */
	$('#search').click(function() {
		var url = "http://visittampere.fi:80/api/search?type=event";
		if($('#category-picker').val() != "") {
			url += "&tag="+$('#category-picker').val();
		}
		if($('#starttime-picker').datepicker('getDate') != null) {
			var d = new Date($('#starttime-picker').datepicker('getDate'));
			url += "&start_datetime="+d.getTime();
		} else {
			url += "&start_datetime="+Date.now();
		}
		if($('#endtime-picker').datepicker('getDate') != null) {
			var d = new Date($('#endtime-picker').datepicker('getDate'));
			url += "&end_datetime="+d.getTime(); 
		}
		if($('#free-input').is(':checked')) {
			url += "&free=true";
		}
		url += "&limit=10";
		getEvents(url);

	})

	$('#show-all').click(function() {
		setMapOnAll(map);
		map.setZoom(12);
		map.setCenter({lat: 61.498, lng: 23.762});
		$('#show-all').toggle();
	})

	/* Not working at the moment because google requires you to have HTTPS protocol on ur site */
	$('#locate').click(function() {
		if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(savePosition, positionError, {timeout:10000});
      	} 

      	function savePosition(position) {
            var pos = {
		        lat: position.coords.latitude,
		        lng: position.coords.longitude
		      };
		      var marker = new google.maps.Marker({
	                position: pos,
	                map: map,
	                title: "Olet tässä!"
	            });
		      map.setCenter(pos);
  		}

  		 function positionError(error) {
		      var errorCode = error.code;
		      var message = error.message;

		      alert(message); 
		  }
	})
	$('#show-all').hide();

	// Initialising variables
	var styles = [{"featureType":"water","stylers":[{"color":"#0e171d"}]},{"featureType":"landscape","stylers":[{"color":"#4E5D6C"}]},{"featureType":"road","stylers":[{"color":"#2B3E50"}]},{"featureType":"poi.park","stylers":[{"color":"#1e303d"}]},{"featureType":"transit","stylers":[{"color":"#182731"},{"visibility":"simplified"}]},{"featureType":"poi","elementType":"labels.icon","stylers":[{"color":"#f0c514"},{"visibility":"off"}]},{"featureType":"poi","elementType":"labels.text.stroke","stylers":[{"color":"#1e303d"},{"visibility":"off"}]},{"featureType":"transit","elementType":"labels.text.fill","stylers":[{"color":"#e77e24"},{"visibility":"off"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#94a5a6"}]},{"featureType":"administrative","elementType":"labels","stylers":[{"visibility":"simplified"},{"color":"#e84c3c"}]},{"featureType":"poi","stylers":[{"color":"#e84c3c"},{"visibility":"off"}]}];
	var styledMap = new google.maps.StyledMapType(styles, {name: "Styled Map"});
	var map;
	var eTable;
	var markers;
	var eventPos;
	getEvents();
})()