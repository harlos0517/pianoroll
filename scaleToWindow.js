function scaleToWindow(canvas) {
  var scaleX, scaleY, scale, center

  //1. Scale the canvas to the correct size
  //Figure out the scale amount on each axis
  scaleX = window.innerWidth / canvas.attr('width')
  scaleY = window.innerHeight / canvas.attr('height')

  //Scale the canvas based on whichever value is less: `scaleX` or `scaleY`
  scale = Math.min(scaleX, scaleY)
  canvas.style.width = scale * canvas.attr('width') + 'px'
  canvas.style.height = scale * canvas.attr('height') + 'px'

  //2. Center the canvas.
  //Decide whether to center the canvas vertically or horizontally.
  //Wide canvases should be centered vertically, and 
  //square or tall canvases should be centered horizontally
  if (scaleX > scaleY) {
    center = 'horizontally'
  } else {
    center = 'vertically'
  }

  //Center horizontally (for square or tall canvases)
  var margin
  if (center === 'horizontally') {
    var margin = (window.innerWidth - canvas.offsetWidth) / 2
    canvas.style.marginTop = 0 + 'px'
    canvas.style.marginBottom = 0 + 'px'
    canvas.style.marginLeft = margin + 'px'
    canvas.style.marginRight = margin + 'px'
  }

  //Center vertically (for wide canvases) 
  if (center === 'vertically') {
    var margin = (window.innerHeight - canvas.offsetHeight) / 2
    canvas.style.marginTop = 0 + 'px'
    canvas.style.marginBottom = 0 + 'px'
    canvas.style.marginLeft = 0 + 'px'
    canvas.style.marginRight = 0 + 'px'
  }

  //3. Remove any padding from the canvas  and body and set the canvas
  //display style to 'block'
  canvas.style.paddingLeft = 0 + 'px'
  canvas.style.paddingRight = 0 + 'px'
  canvas.style.paddingTop = 0 + 'px'
  canvas.style.paddingBottom = 0 + 'px'
  canvas.style.display = 'block'

  //Fix some quirkiness in scaling for Safari
  var ua = navigator.userAgent.toLowerCase()
  if (ua.indexOf('safari') != -1) {
    if (ua.indexOf('chrome') > -1) {
      // Chrome
    } else {
      // Safari
      //canvas.style.maxHeight = '100%'
      //canvas.style.minHeight = '100%'
    }
  }

  //5. Return the `scale` value. This is important, because you'll nee this value 
  //for correct hit testing between the pointer and sprites
  return scale
}