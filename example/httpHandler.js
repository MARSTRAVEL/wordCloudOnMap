// DEPRECATED


//

function httpGetAsync(url, callback){
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200){
            callback(request.responseText);
		}
    }
    request.open("GET", url, true);
    request.send(null);
}

function httpPostAsync(url, dataString, callback){
	var request = new XMLHttpRequest();
	request.open('POST', url, true);
	request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200){
            callback(request.responseText);
		}
    }
	request.send( dataString );
}
