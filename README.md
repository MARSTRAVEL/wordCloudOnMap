# wordCloudOnMap
cluster text and draw word cloud,  sconvert to base64Data format pic, set up  as overlay over GooGle map at given latitude and longitude.

Following are two main functions:
convertCanvasToBase64():
  automatically create a canvas that width is 400 and height is 400, then plot word cloud on the canvas return as base64 format picture

initializeMap():
  initialize Google map and add DomListener overlay.toggle()
