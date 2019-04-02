# wordCloudOnMap
The functional part is to set up a marker at given latitude and longitude in Google map. When click maker it will plot word cloud according to given weighted words.

Following are two main functions:
convertCanvasToBase64():
  automatically create a canvas that width is 400 and height is 400, then plot word cloud on the canvas return as base64 format picture

initializeMap():
  initialize Google map and add DomListener overlay.toggle()
