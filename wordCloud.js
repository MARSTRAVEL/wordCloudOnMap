/*
 * keyword        latitude       longitude
 * pizza          62.3          29.4
 * fast           62.4          29.3
 * pizza          62.5          29.5
 * food           62.4          29.4
 */
/* global google */
const MinBoxSize = 1; // minimun box size
const fontFamily = 'sans-serif'; // font style
const initialFontSize = 80; // font size
const canvasWidth = 400;
const canvasHeight = 400;
const wordWidthOfBvh = 200;
const wordHeightOfBvh = 200;
let overlay;
// when accept inputWords, order according to its frequency
const inputWords = [{ keyword: 'pizza', weight: 2 },
  { keyword: 'fast', weight: 1 },
  { keyword: 'food', weight: 1 },
];
const latitude = (62.3 + 62.4 + 62.5 + 62.4) / 4;
const longitude = (29.4 + 29.3 + 29.5 + 29.4) / 4;
const ratio = (wordWeight) => {
  let sum = 0;
  for (let i = 0; i < inputWords.length; i += 1) {
    sum += inputWords[i].weight;
  }
  return wordWeight / sum;
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
const getWordPixel = (text, wordRatio) => {
  const fontSize = wordRatio * initialFontSize;
  c.clearRect(0, 0, wordWidthOfBvh * 2, wordHeightOfBvh * 2);
  c.save();
  c.textBaseline = 'top';
  c.font = `${~~fontSize}px ${fontFamily}`;// eslint-disable-line no-bitwise
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
const initializeBvhTree = (text, wordRatio) => {
  const initialBoundingBox = {
    x0: 0, y0: 0, x1: wordWidthOfBvh, y1: wordHeightOfBvh,
  };
  return buildBvhTree(
    { wordPixelArray: getWordPixel(text, wordRatio), ...initialBoundingBox },
    initialBoundingBox,
  );
};
// x=vt∗cos(wt)
// y=vt∗cos(wt)
function moveSteps(t) {
  const initialX = canvasWidth / 2;
  const initialY = canvasHeight / 2;
  const a = 17;
  const b = 3;
  const angle = 0.5 * t;
  const x = (a + b * angle) * Math.cos(angle) + initialX;
  const y = (a + b * angle) * Math.sin(angle) + initialY;
  return [x, y];
}
// create word Object: wrd,BvhTree,weight,drawX,drawY,drawColor,drawFont
// this function will be initialized automatically
const wordsList = inputWords.map(word => (
  {
    word: word.keyword,
    bvhTree: initializeBvhTree(word.keyword, ratio(word.weight)),
    weight: word.weight,
    drawPosition: moveSteps(1), // initialPosition at centeral point of Canvas
    drawFont: ratio(word.weight) * initialFontSize,
  }
));
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
const findDrawPosition = () => {
  let step = 1;
  for (let i = 1; i < wordsList.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      while (treesOverlaped(wordsList[i].bvhTree,
        wordsList[j].bvhTree,
        wordsList[i].drawPosition,
        wordsList[j].drawPosition)) {
        step += 1;
        wordsList[i].drawPosition = moveSteps(step);
      }
      wordsList[i].drawPosition = moveSteps(step);
    }
  }
};
// update draw position of all words
function drawInputwords(pFCan) {
  const pFCanvas = pFCan;
  for (let i = 0; i < wordsList.length; i += 1) {
    pFCanvas.font = `${~~wordsList[i].drawFont}px ${fontFamily}`;// eslint-disable-line no-bitwise
    pFCanvas.fillStyle = 'red';
    pFCanvas.textBaseline = 'top';
    pFCanvas.fillText(wordsList[i].word, wordsList[i].drawPosition[0],
      wordsList[i].drawPosition[1]);
  }
}
// decode canvas to base64
function convertCanvasToBase64() {
  findDrawPosition();
  const cas = document.createElement('canvas');
  // const img = document.createElement('IMG');
  const ctx = cas.getContext('2d');
  cas.width = canvasWidth;
  cas.height = canvasHeight;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  drawInputwords(ctx);
  const base64Data = cas.toDataURL('image/png', 1);// 1 means original quatity
  // img.setAttribute('src', base64Data);
  // decode content in canvas to base64 format pic
  return base64Data;
}


  const infowindow = new google.maps.InfoWindow({
    position: myLatLng,
  });
  marker.setMap(map);
  marker.addListener('click', () => {
    infowindow.setContent(convertCanvasToBase64());
    infowindow.open(map, marker);
  });
  // latitude +- 0.05  longitude +-0.1
  const bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(62.350000, 29.300000),
    new google.maps.LatLng(62.450000, 29.500000),
  );

  // The photograph is courtesy of the U.S. Geological Survey.
  const srcImage = convertCanvasToBase64();

  overlay = new WordCloudOverlay(bounds, srcImage, map);
  google.maps.event.addDomListener(window, 'click');
}
initMap();
