/* eslint-env jquery */
/*
POINTS_SERVER = 'https://cs.uef.fi/o-mopsi/controller/OMopsiGameController.php
- desc (the game name - make a dropdown list to select a game by name)
- gameId (you will need it in second step)
- latitude and longitude are the coordinates. Use those to decide where your overlay will be placed.
You can also ignore these and do another variant (explained in second step below)
- you can also use the thumbnail to display on map, but it is optional, I think.
 */
/* global google */
const MinBoxSize = 2; // minimun box size
const fontFamily = 'sans-serif'; // font style
const canvasWidth = 700;
const canvasHeight = 700;
const wordWidthOfBvh = 350;
const wordHeightOfBvh = 300;
const maxFontSize = 55;
const minFontSize = 15;
// https:// works
const POINTS_SERVER = 'https://cs.uef.fi/o-mopsi/controller/OMopsiGameController.php';
const gamesParameter = 'request_type=get_games&userId=-1';
const userParameter = 'request_type=get_goals&gameId=';

const wordFontSize = (inputWords) => {
  let multiplier;
  const maxAppearWord = Math.max(...inputWords.map(o => o.weight));
  const minAppearWord = Math.min(...inputWords.map(o => o.weight));
  if (maxAppearWord === minAppearWord) {
    multiplier = 0;
  } else {
    multiplier = maxFontSize - minFontSize;
  }
  for (let item in inputWords) {
    if (inputWords.hasOwnProperty(item)) {
      if (inputWords[item].weight <= 1) {
        inputWords[item].fontSize = minFontSize;
      } else {
        inputWords[item].fontSize = Math.round(Math.log(inputWords[item].weight) / Math.log(maxAppearWord)
        * multiplier + minFontSize);
      }
    }
  }
  return inputWords;
};
// create canvas for getting pixcel of each word, doesnt show this canvas
const canvasGetPixcel = document.createElement('canvas');
canvasGetPixcel.width = wordWidthOfBvh;
canvasGetPixcel.height = wordHeightOfBvh;
canvasGetPixcel.style.border = '1px solid red';
const c = canvasGetPixcel.getContext('2d');

// Bounding Volume Hierarchy Tree constructor
// topLeft x-Coordinate:topLeftX bottomRight X-Coordinate: bottomRightX
class BvhTree {
  constructor(topLeftX, topLeftY, bottomRightX, bottomRightY) {
    this.topLeftX = topLeftX;
    this.topLeftY = topLeftY;
    this.bottomRightX = bottomRightX;
    this.bottomRightY = bottomRightY;
    this.children = [];
  }

  // add children nodes
  addChildNode(children) {
    this.children = [].concat(this.children, children);
  }
}
// detect bounding box we are working on is inside word or not
const boundingBoxIsInsideWord = (wordPixel, boundingBox) => {
  const {
    x0, y0, x1, y1,
  } = boundingBox;
  const widthOfBoungBox = wordPixel.x1 - wordPixel.x0;
  const wordPixelArr = wordPixel.wordPixelArray;

  // if there is empty pixcel, then boundingBox is not inside word
  for (let i = x0; i < x1; i += 1) {
    for (let j = y0; j < y1; j += 1) {
      if (!wordPixelArr[j * widthOfBoungBox + i]) return false;
    }
  }
  return true;
};
// boundingBox intesect word or not
const boundingBoxIntersectWord = (wordPixel, boundingBox) => {
  let {
    x0, y0, x1, y1,
  } = boundingBox;
  x0 = Math.max(0, x0 - wordPixel.x0);
  y0 = Math.max(0, y0 - wordPixel.y0);
  x1 = Math.min(wordPixel.x1, x1) - wordPixel.x0;
  y1 = Math.min(wordPixel.y1, y1) - wordPixel.y0;

  const widthOfBoungBox = wordPixel.x1 - wordPixel.x0;
  const wordPixelArr = wordPixel.wordPixelArray;
  for (let j = y0; j < y1; j += 1) {
    for (let i = x0; i < x1; i += 1) {
      if (wordPixelArr[j * widthOfBoungBox + i]) return true;
    }
  }
  return false;
};
// get pxels array of each word
const getWordPixel = (text, wordfont, rotateDegree) => {
  const fontSize = wordfont;
  c.clearRect(0, 0, wordWidthOfBvh * 2, wordHeightOfBvh * 2);
  c.save();
  c.textBaseline = 'top';
  c.font = `${~~fontSize}px ${fontFamily}`;// eslint-disable-line no-bitwise
  c.translate(70, 0);
  c.rotate(rotateDegree * Math.PI / 180);
  c.fillText(text, 0, 0);
  c.restore();
  // imageData:width、height、data
  // 其中data为Uint8ClampedArray，是一个长度为width*height长度的一维数组，描述各个像素的rgba
  const imageData = c.getImageData(1, 1, wordWidthOfBvh, wordHeightOfBvh);
  const pixels = imageData.data;
  const pixelArray = [];
  // 如果这个像素内的r+g+b+a不为0，则表示该像素有内容
  for (let i = 0; i < wordWidthOfBvh * wordHeightOfBvh; i += 1) {
    pixelArray[i] = pixels[i * 4 + 0] + pixels[i * 4 + 1] + pixels[i * 4 + 2] + pixels[i * 4 + 3];
  }
  return pixelArray;
};
// bottom up build Hierarchical Bounding Box Tree for each word
const buildBvhTree = (wordPixel, boundingBox) => {
  const {
    x0, y0, x1, y1,
  } = boundingBox;
  // the bounding box we are working on to decide to separate or not(target box)
  if (boundingBoxIsInsideWord(wordPixel, boundingBox)) return new BvhTree(x0, y0, x1, y1);
  if (boundingBoxIntersectWord(wordPixel, boundingBox)) {
    const tree = new BvhTree(x0, y0, x1, y1);
    // if boundingBox bigger than MinBoxSize, divide bounding box into four parts
    if (x1 - x0 > MinBoxSize || y1 - y0 > MinBoxSize) {
      const newX = Math.floor((x0 + x1) / 2);
      const newY = Math.floor((y0 + y1) / 2);

      const topLeft = buildBvhTree(wordPixel, {
        x0, y0, x1: newX, y1: newY,
      });
      const topRight = buildBvhTree(wordPixel, {
        x0: newX, y0, x1, y1: newY,
      });
      const bottomLeft = buildBvhTree(wordPixel, {
        x0, y0: newY, x1: newX, y1,
      });
      const bottomRight = buildBvhTree(wordPixel, {
        x0: newX, y0: newY, x1, y1,
      });
      if (topLeft) { tree.addChildNode(topLeft); }
      if (topRight) { tree.addChildNode(topRight); }
      if (bottomLeft) { tree.addChildNode(bottomLeft); }
      if (bottomRight) { tree.addChildNode(bottomRight); }

    // topLeft && tree.addChildren(topLeft)
    }
    return tree;
  }
  return null;
};
// initialize BvhTree
const initializeBvhTree = (text, wordfontS, rotateDegree) => {
  const initialBoundingBox = {
    x0: 0, y0: 0, x1: wordWidthOfBvh, y1: wordHeightOfBvh,
  };
  return buildBvhTree(
    { wordPixelArray: getWordPixel(text, wordfontS, rotateDegree), ...initialBoundingBox },
    initialBoundingBox,
  );
};
// x=vt∗cos(wt)
// y=vt∗cos(wt)
function moveSteps(a, b, step) {
  const angle = 0.35 * step;
  const x = (12 + 4 * angle) * Math.cos(angle) + a;
  const y = (12 + 4 * angle) * Math.sin(angle) + b;
  return [Math.round(x), Math.round(y)];
}
// unplacedWord overlapplacedWordsArray
const wordOverlapeAllPlaced = (word, wordarray) => {
  // not overlap
  let overlap = false;
  const unplacedWord = word;
  const placedWords = wordarray;
  for (let i = 0; i < placedWords.length; i += 1) {
    if (placedWords[i].rotate === true) {
      if (treesOverlaped(placedWords[i].rotatebvhTree, unplacedWord.bvhTree,
        placedWords[i].drawPosition, unplacedWord.drawPosition)) {
        overlap = true;
        break;
      }
    } else if (treesOverlaped(placedWords[i].bvhTree, unplacedWord.bvhTree,
      placedWords[i].drawPosition, unplacedWord.drawPosition)) {
      overlap = true;
      break;
    }
  }

  if (overlap === true) {
    unplacedWord.rotate = true;
    for (let i = 0; i < placedWords.length; i += 1) {
      if (placedWords[i].rotate === true) {
        if (treesOverlaped(placedWords[i].rotatebvhTree, unplacedWord.rotatebvhTree,
          placedWords[i].drawPosition, unplacedWord.drawPosition)) {
          overlap = true;
          unplacedWord.rotate = false;
          break;
        }
        overlap = false;
      } else {
        if (treesOverlaped(placedWords[i].bvhTree, unplacedWord.rotatebvhTree,
          placedWords[i].drawPosition, unplacedWord.drawPosition)) {
          overlap = true;
          unplacedWord.rotate = false;
          break;
        }
        overlap = false;
      }
    }
  }
  return overlap;
};

// find drawPosition for each word
const findDrawPosition = (wordsList) => {
  let step;
  const wl = wordsList;
  let wordToPlace;
  const placedWordArray = [];
  placedWordArray.push(wl.shift());
  while (wl.length !== 0) {
    step = 1;
    // take one word if there is
    wordToPlace = wl.shift();

    // if wordToPlace overlap at least one word in placedWordArray
    while (wordOverlapeAllPlaced(wordToPlace, placedWordArray)) {
      step += 1;
      wordToPlace.drawPosition = moveSteps(wordToPlace.drawPosition[0],
        wordToPlace.drawPosition[1], step);
    }
    // update placedWordArray
    placedWordArray.push(wordToPlace);
  }
  return placedWordArray;
};

// two trees overlapTest
const twoBoundingBoxesIntersect = (subTreeA, subTreeB, positionA, positionB) => {
  const [ax, ay] = positionA;
  const [bx, by] = positionB;
  return subTreeA.topLeftX + ax < subTreeB.bottomRightX + bx
  && subTreeA.topLeftY + ay < subTreeB.bottomRightY + by
  && subTreeA.bottomRightX + ax > subTreeB.topLeftX + bx
  && subTreeA.bottomRightY + ay > subTreeB.topLeftY + by;
};
const treesOverlaped = (treeA, treeB, positionA, positionB) => {
  if (twoBoundingBoxesIntersect(treeA, treeB, positionA, positionB)) {
    if (!treeA.children.length) {
      if (!treeB.children.length) return true;
      for (let i = 0, n = treeB.children.length; i < n; i += 1) {
        if (treesOverlaped(treeA, treeB.children[i], positionA, positionB)) return true;
      }
    } else {
      for (let i = 0, n = treeA.children.length; i < n; i += 1) {
        if (treesOverlaped(treeB, treeA.children[i], positionB, positionA)) return true;
      }
    }
  }
  return false;
};
// find drawPosition for each word

const roateText = (canvasRotateText, posX, posY, degree, fontSize, text) => {
  const pFCanvas = canvasRotateText;
  pFCanvas.save();
  pFCanvas.textBaseline = 'top';
  pFCanvas.font = `${~~fontSize}px sans-serif`;// eslint-disable-line no-bitwise
  pFCanvas.fillStyle = 'red';
  // test 'interesting' fontSize 55
  pFCanvas.translate(posX, posY);
  pFCanvas.rotate(degree * Math.PI / 180);
  pFCanvas.fillText(text, 0, 0);
  pFCanvas.restore();
};

function drawInputwords(pFCanvas, wordsList) {
  for (let i = 0; i < wordsList.length; i += 1) {
    if (wordsList[i].rotate === true) {
      roateText(pFCanvas, wordsList[i].drawPosition[0], wordsList[i].drawPosition[1],
        90, wordsList[i].fontSize, wordsList[i].word);
    } else {
      roateText(pFCanvas, wordsList[i].drawPosition[0], wordsList[i].drawPosition[1],
        0, wordsList[i].fontSize, wordsList[i].word);
    }
  }
}

// decode canvas to base64
function convertCanvasToBase64(wordList) {
  const worArray = findDrawPosition(wordList);
  const cas = document.createElement('canvas');
  document.body.appendChild(cas);
  const ctx = cas.getContext('2d');
  cas.width = canvasWidth;
  cas.height = canvasHeight;
  //ctx.fillStyle = "rgba(0, 0, 0, 0.0)";
  //ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  drawInputwords(ctx, worArray);
  const base64Data = cas.toDataURL('image/png', 1);// 1 means original quatity
  // img.setAttribute('src', base64Data);
  // decode content in canvas to base64 format pic
  return base64Data;
}


// This example adds hide() and show() methods to a custom overlay's prototype.
// These methods toggle the visibility of the container <div>.
// Additionally, we add a toggleDOM() method, which attaches or detaches the
// overlay to or from the map.
class WordCloudOverlay extends google.maps.OverlayView {
  constructor(bounds, image, map) {
    super(bounds, image, map);
    this.bounds = bounds;
    this.image = image;
    this.map = map;
    // Define a property to hold the image's div. We'll
    // actually create this div upon receipt of the onAdd()
    // method so we'll leave it null for now.
    this.div = null;
    // Explicitly call setMap on this overlay
    this.setMap(map);
  }

  onAdd() {
    const div = document.createElement('div');
    div.style.border = 'none';
    div.style.borderWidth = '0px';
    div.style.position = 'absolute';

    // Create the img element and attach it to the div.
    const img = document.createElement('img');
    img.src = this.image;
    img.style.width = '100%';
    img.style.height = '100%';
    div.appendChild(img);
    this.div = div;
    // Add the element to the "overlayImage" pane.
    const panes = this.getPanes();
    panes.overlayImage.appendChild(this.div);
  }

  draw() {
    // We use the south-west and north-east
    // coordinates of the overlay to peg it to the correct position and size.
    // To do this, we need to retrieve the projection from the overlay.
    const overlayProjection = this.getProjection();
    // Retrieve the south-west and north-east coordinates of this overlay
    // in LatLngs and convert them to pixel coordinates.
    // We'll use these coordinates to resize the div.
    const sw = overlayProjection.fromLatLngToDivPixel(this.bounds.getSouthWest());
    const ne = overlayProjection.fromLatLngToDivPixel(this.bounds.getNorthEast());

    // Resize the image's div to fit the indicated dimensions.
    this.div.style.left = `${sw.x}px`;
    this.div.style.top = `${ne.y}px`;
    this.div.style.width = `${ne.x - sw.x}px`;
    this.div.style.height = `${sw.y - ne.y}px`;
  }

  onRemove() {
    this.div.parentNode.removeChild(this.div);
  }
  // Set the visibility to 'hidden' or 'visible'.

  hide() {
    if (this.div) {
      // The visibility property must be a string enclosed in quotes.
      this.div.style.visibility = 'hidden';
    }
  }

  show() {
    if (this.div) {
      this.div.style.visibility = 'visible';
    }
  }

  toggle() {
    if (this.div) {
      if (this.div.style.visibility === 'hidden') {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  // Detach the map from the DOM via toggleDOM().
  // Note that if we later reattach the map, it will be visible again,
  // because the containing <div> is recreated in the overlay's onAdd() method.
}

const initMap = () => {
  // const btn = document.getElementById('btn');
  const map = new google.maps.Map(document.getElementById('googleMap'), {
    zoom: 11,
    center: { lat: 60.185532, lng: 24.980044},
    mapTypeId: 'satellite',
  });
  return map;
};

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
// process data of user and return wordsList
const getKeyWords = (dataFromServer) => {
  let rl = [];
  const processedData = dataFromServer.goals
  // get slpited goal names[...][...][...]
    .map(name => name.goalName.split(/[_\W]+/))
    // combine Array into one
    .reduce((firstElement, leftElement) => firstElement.concat(leftElement), [])
    .filter(name => name.length > 1)
  // calaulate frequency
    .reduce((o, k) => {
      const i = k;
      i in o ? o[i] += 1 : (o[i] = 1);
      return o;
    }, {});

    // create {keyword:.., weight:..}
  Object.entries(processedData)
    .forEach(([key, value]) => rl.push({ keyword: `${key}`, weight: `${value}` }));
  // sort object according to its weight
  rl = rl.sort((obj1, obj2) => obj2.weight - obj1.weight);
  // add ratio property to rl
     rl = wordFontSize(rl);
  const wordsList = rl.map(word => (
    {
      word: word.keyword,
      bvhTree: initializeBvhTree(word.keyword, word.fontSize, 0),
      rotatebvhTree: initializeBvhTree(word.keyword, word.fontSize, 90),
      rotate: false,
      drawPosition: [Math.floor(Math.random() * 100) + 250, Math.floor(Math.random() * 100) + 250], // initialPosition at centeral point of Canvas
      fontSize: word.fontSize,
    }
  ));
  return wordsList;
};
const getLatAndLon = (dataFromServer) => {
  const sumLat = dataFromServer.goals.reduce((accumulator, currentValue) => {
    const suLat = accumulator + parseFloat(currentValue.lat);
    return suLat;
  }, 0);

  const sumLon = dataFromServer.goals.reduce((accumulator, currentValue) => {
    const suLon = accumulator + parseFloat(currentValue.lon);
    return suLon;
  }, 0);
  return [sumLat / dataFromServer.goals.length, sumLon / dataFromServer.goals.length];
};

$(document).ready(() => {
  const map = initMap();
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
          const wordList = getKeyWords(JSON.parse(resul));
          const latAndLon = getLatAndLon(JSON.parse(resul));
          // latitude +- 0.05  longitude +-0.1
          const bounds = new google.maps.LatLngBounds(
            // southWest
            new google.maps.LatLng(latAndLon[0]-0.06, latAndLon[1]-0.13),
            // northEast
            new google.maps.LatLng(latAndLon[0]+0.06, latAndLon[1]+0.13),
          );

          // The photograph is courtesy of the U.S. Geological Survey.
          const srcImage = convertCanvasToBase64(wordList);

          // The custom USGSOverlay object contains the USGS image,
          // the bounds of the image, and a reference to the map.
          const overlay = new WordCloudOverlay(bounds, srcImage);
          const myLatLng = new google.maps.LatLng(latAndLon[0], latAndLon[1]);
          map.setCenter(myLatLng);
          overlay.setMap(map);
        });
    }
  });
});
