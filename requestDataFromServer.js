/* eslint-env jquery */
/*
POINTS_SERVER = 'https://cs.uef.fi/o-mopsi/controller/OMopsiGameController.php
- desc (the game name - make a dropdown list to select a game by name)
- gameId (you will need it in second step)
- latitude and longitude are the coordinates. Use those to decide where your overlay will be placed.
You can also ignore these and do another variant (explained in second step below)
- you can also use the thumbnail to display on map, but it is optional, I think.

 */
// https:// works
const POINTS_SERVER = 'https://cs.uef.fi/o-mopsi/controller/OMopsiGameController.php';
const gamesParameter = 'request_type=get_games&userId=-1';
const userParameter = 'request_type=get_goals&gameId=';
// processData received from server and return as object:
// {gameId: "1916", desc: "Helsinki East", lat: "60.21994128892997", lon: "25.07458478943865"}
const processGameData = (dataFromServer) => {
  const targetKey = ['gameId', 'desc', 'lat', 'lon'];
  const obj = JSON.parse(dataFromServer).allGames;
  // get obj.allGames's keys
  const keys = Object.keys(obj[0]);
  // get keys we want to delete
  const newKeys = keys.filter(item => !targetKey.includes(item));
  // newKeys.map(x => delete obj[x]);
  for (let i = 0; i < obj.length; i += 1) {
    newKeys.map(x => delete obj[i][x]);
  }
  return obj;
};
const getGameNamesFromServer = (url, param) => {
  // Create the XHR request
  const request = new XMLHttpRequest();
  // Return a new promise.
  return new Promise((resolve, reject) => {
    request.open('POST', url, true);
    request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    request.onload = () => {
      // This is called even on 404 etc
      // so check the status
      if (request.status === 200 && request.readyState === 4) {
        // Resolve the promise with the response text
        resolve(request.response);
      } else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(Error(request.statusText));
      }
    };
    // Handle network errors
    request.onerror = () => {
      reject(Error('Network Error'));
    };
    // Make the request
    request.send(param);
  });
};
const getGames = (dataFromServer) => {
  const processedData = dataFromServer.goals
  // get slpited goal names[...][...][...]
    .map(name => name.goalName.split(/[_\W]+/))
    // combine Array into one
    .reduce((firstElement, leftElement) => firstElement.concat(leftElement), [])
  // calaulate frequency
    .reduce((o, k) => {
      const i = k;
      i in o ? o[i] += 1 : (o[i] = 1);
      return o;
    }, {});
  return processedData;
};

$(document).ready(() => {
  getGameNamesFromServer(POINTS_SERVER, gamesParameter)
  // update games
    .then((re) => {
      let htmlCode = '<option value="">Select game</option>';
      // get gameId
      const res = processGameData(re);
      $.each(res, (key, value) => {
        htmlCode += `<option value='${value.gameId}'>${value.desc}</option>'`;
      });
      $('#game').html(htmlCode);
      return res;
    })
    .catch((error) => {
      console.log('Failed!', error);
    });
  /* eslint func-names: ["error", "never"] */
  $('#game').on('change', function () {
    if ($(this).val() != 0) {
      getGameNamesFromServer(POINTS_SERVER, userParameter.concat(`${$(this).val()}`))
        .then((resul) => {
          Object.entries(resul).forEach(entry => {
            let re = [];
            let key = entry[0];
            let value = entry[1];
          re.push({'word': key, 'weight':value});
          console.log(re);
          });
          // console.log(getGames(JSON.parse(resul)));
        });
    }
  });
});
