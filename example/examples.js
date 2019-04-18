// Google https://developers.google.com/maps/get-started/
// Weather https://openweathermap.org/
// OSRM http://project-osrm.org/
// Overpass http://overpass-api.de/
// Mopsi transportation mode http://cs.uef.fi/mopsi/routes/transportationModeApi/
// More Mopsi Apis: https://www.uef.fi/web/machine-learning/software

var JOENSUU = {
	lat:62.60,
	lng:29.76
}
var TUUSNIEMI = {
	lat:62.81,
	lng:28.49
}
var KUOPIO = {
	lat:62.89,
	lng:27.67
}

var LAMAD_SERVER="php/server.php";

var GOOGLE_KEY = "AIzaSyC2YXHpksnAc5JXUEF1M0yFxy9xqWr-XYw";
var GOOGLE_SERVER="https://maps.googleapis.com/maps/api/";

var WEATHER_KEY = "4fcf2c0a6dc40be49279a68c91e175f4";
var WEATHER_SERVER="http://api.openweathermap.org/data/2.5/weather";

var OSRM_SERVER="http://router.project-osrm.org/route/v1/driving/";

var OVERPASS_SERVER="http://cs.uef.fi/mopsi_dev/overpass/api.php";

var TRANSPORTATION_SERVER="http://cs.uef.fi/mopsi/routes/transportationModeApi/api.php";

var POINTS_SERVER="http://cs.uef.fi/o-mopsi/api/server.php";

function getTSP (points){
	var param={
		"request_type":"tsp",
		"points":points
	}
	//
	httpPostAsync(POINTS_SERVER,
		"param=" + JSON.stringify(param),
		showTSP);
}
function showTSP(stringOutput){
	var points=JSON.parse(stringOutput);
	var result="";
	for(var i=0;i<points.length;i++){
		if(i>0){
			result+="\n";
		}
		result+=points[i]["lat"]+" "+points[i]["lng"];
	}
	document.getElementById("output").innerHTML
		+="\n<b>TSP:</b>\n"+result+"\n";
}

function main(){
	addNumbers(42,29);

	googleTimeZone(TUUSNIEMI);
	googleGeocode(TUUSNIEMI);

	getWeatherInCity("Kuopio");

	navigateUsingOSRM(TUUSNIEMI,KUOPIO);

	readRouteFromTxtFile("io/route.txt", segmentRouteOnServer);

	var points=[
		{lat:62.60477477249902,lng:29.732512750471415},
		{lat:62.60868431357721,lng:29.73259858115989},
		{lat:62.60449832081471,lng:29.727448739851297},
		{lat:62.603708444677224,lng:29.737576761091532},
		{lat:62.604735279558845,lng:29.74633149131614},
		{lat:62.60824994554549,lng:29.74985054954368},
		{lat:62.60667037185691,lng:29.759034433210672},
		{lat:62.60240510311431,lng:29.755687036360086},
		{lat:62.60106220652103,lng:29.763411798322977},
		{lat:62.59584803242837,lng:29.758948602522196},
		{lat:62.59734917637417,lng:29.744014062727274},
		{lat:62.60066722537791,lng:29.749507226789774},
		{lat:62.60422186655659,lng:29.762210168684305}
	];

	getConvexHull(points);
	getTSP(points);

	var query='<query type="node" ><bbox-query n="63.2"  s="62.5" w="26" e="31"/><has-kv k="amenity" v="pub"/></query><print/>';
	getOverpassPubs(query);

}

//

var g_addNumbersString="";
function addNumbers(a, b){
	var param={
		"request_type":"add_numbers",
		"a":a,
		"b":b
	}
	g_addNumbersString="\n<b>"+a+" + "+b+"</b> = ";
	var url=LAMAD_SERVER;
	httpPostAsync(url,
		"param="+JSON.stringify(param),
		function(stringOutput){
		var obj=JSON.parse(stringOutput);
		g_addNumbersString+=obj["server"];
		document.getElementById("output").innerHTML
			+=g_addNumbersString+"\n";
	});
}

//

function googleTimeZone(point){
	var key=GOOGLE_KEY;
	var request=GOOGLE_SERVER+"timezone/json?location="+
		point.lat+","+
		point.lng+"&timestamp="+Math.round((new Date().getTime())/1000)+"&key="+key;

	httpGetAsync(request,function(stringOutput){
		var obj=JSON.parse(stringOutput)
		document.getElementById("output").innerHTML
		+="\n<b>Timezone  ("+point.lat+", "+point.lng+"):</b>\n"+obj["rawOffset"]+" second offset\n";
	});
}

//

function googleGeocode(point){
	var key=GOOGLE_KEY;
	var request=GOOGLE_SERVER+"geocode/json?latlng="+
		point.lat+","+
		point.lng+"&key="+
		key;

	httpGetAsync(request,function(stringOutput){
		var obj=JSON.parse(stringOutput)
		var addr=obj["results"][0]["formatted_address"];
		document.getElementById("output").innerHTML
		+="\n<b>Geocoding ("+point.lat+", "+point.lng+"):</b>\n"+addr+"\n";
	});
}

//

var g_weatherInCity="";
function getWeatherInCity(city){
	var key=WEATHER_KEY;
	var request=WEATHER_SERVER+"?q="+
	city+"&appid="+
	key;
	g_weatherInCity="\n<b>"+city+" weather:</b>\n";
	httpGetAsync(request,onGetWeather);
}
function onGetWeather(stringOutput){
	var obj=JSON.parse(stringOutput);
	g_weatherInCity+=obj["weather"][0]["description"];
	document.getElementById("output").innerHTML
		+=g_weatherInCity+"\n";
}

//

var g_navigationFromTo="";
function navigateUsingOSRM(startPoint, endPoint){
	var request=OSRM_SERVER+startPoint.lng+","+startPoint.lat+";"+endPoint.lng+","+endPoint.lat+"?geometries=geojson";
	g_navigationFromTo="\n<b>Navigation ("+startPoint.lat+", "+startPoint.lng+") -> ("+endPoint.lat+", "+endPoint.lng+"):</b>\n";
	httpGetAsync(request,printNavigation);
}
function printNavigation(stringOutput){
	var str="";
	var obj=JSON.parse(stringOutput);
	var coords=obj["routes"][0]["geometry"]["coordinates"];

	for(var i=0;i<coords.length;i++){
		str+=coords[i][1]+", "+coords[i][0]+"\n"
	}

	g_navigationFromTo+=str;
	document.getElementById("output").innerHTML
		+=g_navigationFromTo;
}

//

function readRouteFromTxtFile(file, callback){
	httpPostAsync(file,"",function(stringFormat){
		var route=parseRouteTxt(stringFormat);
		document.getElementById("output").innerHTML
		+="\n<b>Route: "+file+" loaded</b>"+"\n";
		//
		callback(route);
	});
}
function parseRouteTxt(stringFormat){
	var points=stringFormat.split("\n");
	var route=new Array();
	for(var i = 0;i<=points.length;i++){
		if(points[i]!=null && points[i]!=""){
			var components=points[i].split(" ");
			route.push({
				lat:(Number)(components[0]),
				lng:(Number)(components[1]),
				time:(Number)(components[2])
			});
		}
	}
	return route;
}

function segmentRouteOnServer(route){
	var param={
		"request_type":"segment_route",
		"route":route
	}
	//
	httpPostAsync(TRANSPORTATION_SERVER,
		"param="+JSON.stringify(param),
		printSegmentedRoute);
}
function printSegmentedRoute(stringOutput){
	var obj=JSON.parse(stringOutput);
	var types=new Array();
	var parts=obj["server"];
	var typesString="";
	for(var i=0;i<parts.length;i++){
		typesString+=(i+1)+". "+parts[i]["type"];
		if(i<parts.length-1){
			typesString+="\n";
		}
	}

	document.getElementById("output").innerHTML
		+="\n<b>Transportation segments:</b>\n"+typesString+"\n";
}

//

function getConvexHull (points){
	var param={
		"request_type":"convex_hull",
		"points":points
	}
	//
	httpPostAsync(POINTS_SERVER,
		"param="+JSON.stringify(param),
		showConvexHull);
}
function showConvexHull(stringOutput){
	var points=JSON.parse(stringOutput);
	var result="";
	for(var i=0;i<points.length;i++){
		if(i>0){
			result+="\n";
		}
		result+=points[i]["lat"]+" "+points[i]["lng"];
	}
	document.getElementById("output").innerHTML
		+="\n<b>Convex Hull:</b>\n"+result+"\n";
}

//


//

var g_overpassPubs="";
function getOverpassPubs(query){
	var request=OVERPASS_SERVER;
	g_overpassPubs="\n<b>Overpass query Pubs:</b>\n";

	httpPostAsync(OVERPASS_SERVER,
		"query="+query,
		function(stringOutput){
			var obj=JSON.parse(stringOutput);
			for(var i=0;i<obj["node"].length;i++){
				var name="";
				for(var j=0;j<obj["node"][i]["tag"].length;j++){
					if(obj["node"][i]["tag"][j]["@attributes"]["k"]=="name"){
						name=obj["node"][i]["tag"][j]["@attributes"]["v"];
						break;
					}
				}

				var latitude=Number(obj["node"][i]["@attributes"]["lat"]);
				var longitude=Number(obj["node"][i]["@attributes"]["lon"]);
				g_overpassPubs+=name+" ("+latitude+", "+longitude+")\n";
			}
			document.getElementById("output").innerHTML
				+=g_overpassPubs;
	});
}
