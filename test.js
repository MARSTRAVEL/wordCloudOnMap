/* global google */
const latitude = (62.3 + 62.4 + 62.5 + 62.4) / 4;
const longitude = (29.4 + 29.3 + 29.5 + 29.4) / 4;

class WordCloudOverlay extends google.maps.OverlayView {
  constructor(bounds, image) {
    super(bounds, image);
    this.bounds = bounds;
    this.image = image;
    // Define a property to hold the image's div. We'll
    // actually create this div upon receipt of the onAdd()
    // method so we'll leave it null for now.
    this.div = null;
    // Explicitly call setMap on this overlay
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
    center: { lat: 62.323907, lng: -150.109291 },
    mapTypeId: 'satellite',
  });
  return map;
}

const test = () => {
  //const map = initMap();
  document.getElementById('bt1').addEventListener('click', () => {
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(62.281819, -150.287132),
      new google.maps.LatLng(62.400471, -150.005608),
    );

    // The photograph is courtesy of the U.S. Geological Survey.
    const srcImage = 'https://www.freelogodesign.org/Content/img/logo-ex-7.png';

    // The custom USGSOverlay object contains the USGS image,
    // the bounds of the image, and a reference to the map.
    const overlay = new WordCloudOverlay(bounds, srcImage);
    overlay.setMap(map);
  });

  document.getElementById('bt2').addEventListener('click', () => {
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(62.281819, -150.287132),
      new google.maps.LatLng(62.400471, -150.005608),
    );

    // The photograph is courtesy of the U.S. Geological Survey.
    const srcImage = 'https://i1.wp.com/www.grapheine.com/wp-content/uploads/2016/08/subway-logo-sign-arrows.gif?quality=90&strip=all&ssl=1';

    // The custom USGSOverlay object contains the USGS image,
    // the bounds of the image, and a reference to the map.
    const overlay = new WordCloudOverlay(bounds, srcImage);
    overlay.setMap(map);
  });
};

initMap();
