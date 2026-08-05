// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

/**
 * Allows setting of object to Storage. stringifies object
 * @function
 * @param {key}
 * @param {value}
 */
Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
}
/**
 * Allows getting of object from Storage. JSON parses object
 * @function
 * @param {key}
 * returns {Object}
 */
Storage.prototype.getObject = function(key) {
    const itemKey = key.replace(/^(_boppad_|_boppadusertables_)/,'')
    return JSON.parse(this.getItem(key));
}
/**
 * Capitalizes string
 * @function
 * returns {String}
 */
String.prototype.capitalize = function(){
	return this.toLowerCase().replace( /\b\w/g, function (m) {
		return m.toUpperCase();
	});
};

// color palette ['A', 'B', 'C', 'D']
let colorPalette = ['#00adef', '#9a6aad', '#ec008c', '#f1592a']

/**
 * Sets active input when clicking on sibling span
 * @function
 * @param {$element} input
 */
function inputFocus(input){
	if(input.is('span')) {
		input.prev().select();
	} else {
		input.select();
	}
}

/**
 * Sets active quadrant on body
 * @function
 * @param {String} quadrant - active quadrant; 'A', 'B', 'C', 'D'
 */
function setQuadrant(quadrant = 'A'){
	document.body.dataset.active = quadrant;
}

/**
 * Converts 16-bit number to LSB and MSB.
 * @function
 * @param {Number} number - 16-bit number
 * @param {Number} multiplier - multiplies 'number', to normalize float values use 100
 * @returns {Array} array of LSB and MSB; [LSB, MSB]
 */
function convert16to8(number, multiplier){
	return [
  	((number * multiplier) >> 0) & 0xff,
		((number * multiplier) >> 8) & 0xff
  ]
}

/**
 * Converts LSB and MSB to 16-bit number
 * @function
 * @param {Number} bitArr - [LSB, MSB]
 * @param {Number} divider - divides the calculated value, resulting in a float when set to 100
 * @returns {Number} 16-bit number from LSB and MSB
 */
function convert8to16(bitArr, divider){
	let lsb = bitArr[0], msb = bitArr[1]
	return (((msb << 8) + lsb) / divider).toFixed(2);
}

/**
 * Gets the quadrant and modline of a modline item
 * @function
 * @param {String} id - ID of
 * @param {Number} divider - divides the calculated value, resulting in a float when set to 100
 * @returns {Array} quadrant and modline number
 */
function getQuadMod(id, item){
  quadMod = /quadrant_([a-d])_modline_([1-6])_' + item/.exec(id),
  quad = quadMod[1],
  mod = quadMod[2]

  return [quad, mod]
}

/**
 * Checks if value is > -1
 * @function
 * @param {Number}
 * @returns {Number} value or null
 */
function isOn(value){
	return (value != -1) ? value : null;
}

/**
 * Returns ['A', 'B', 'C', 'D'] from index
 * @function
 * @param {Number}
 * @returns {String} ['A', 'B', 'C', 'D']
 */
function i2q(index){ // quadrantFromIndex
	return ['A', 'B', 'C', 'D'][+index]
}

/**
 * Returns index from ['A', 'B', 'C', 'D']
 * @function
 * @param {String}
 * @returns {Number} index
 */
function q2i(quadrant){ // indexFromQuadrant
	return ['A', 'B', 'C', 'D'].indexOf(quadrant)
}

/**
 * Checks body el for data-unison values of 'on' / 'off'
 * @function
 * @returns {Boolean}
 */
function isUnison(){
	let unison = document.querySelector('body').getAttribute('data-unison')
	return (unison == 'on') ? true : false;
}

/**
 * Returns data-unison values of ['A', 'B', 'C', 'D']
 * @function
 * @returns {String} ['A', 'B', 'C', 'D']
 */
function getUnison(){
	return document.querySelector('body').getAttribute('data-unison-quadrant')
}

/**
 * Returns value mapped to new range r1 = original range, r2 = new range
 * @function
 * @returns {Number}
 */
function convertRange( value, r1, r2 ) {
  return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ];
}

/**
 * Returns promise from jQuery event
 * @function
 * @param {String} event name
 * @returns {Promise}
 */
function promiseEvent(event) {
  return new Promise(function (resolve) {
    $(document).one(event, resolve);
  });
};

function insertSVG(els, svgs, callback){
	els.forEach( (el, i) => {
		el[0].insertAdjacentHTML('afterbegin', svgs[i])
	})

	callback(els)
}

/**
 * determines if value is within number min/max range
 * @function
 * @param {Object} DOM Element
 * @returns {Boolean}
 */
function isValidRange(element){
  let parentClass = element.parentElement.classList,
      max = parseInt(element.max), value = parseInt(element.value)

  if(!element.validity.valid) {

    if(parentClass.contains('number-input') || parentClass.contains('note-selection')) {
      parentClass.add('error')
    } else if(parentClass.contains('modline') || parentClass.contains('input-group')){
      element.classList.add('error')
    }

    return false
  } else {
    if(parentClass.contains('number-input') || parentClass.contains('note-selection')) {
      parentClass.remove('error')
    } else if(parentClass.contains('modline') || parentClass.contains('input-group')){
      element.classList.remove('error')
    }

    return true
  }
}

/**
 * sets value to min / max if value is out of range
 * @function
 * @param {Object} DOM Element
 * @returns {Number}
 */
function restrictNumber(element){
  let min = Number.isInteger(element.min) ? parseInt(element.min) : parseFloat(element.min),
      max = Number.isInteger(element.max) ? parseInt(element.max) : parseFloat(element.max),
      value = Number.isInteger(element.value) ? parseInt(element.value) : parseFloat(element.value)

  if(element.validity.valid) {
    return value
  } else if(value > max) {
    element.value = max
    return max
  } else if(value < min) {
    element.value = min
    return min
  }
}

function getJSON(url) {
  return new Promise((accept, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.responseType = 'json';
    xhr.onload = () => (xhr.status == 200) ? accept(xhr.response) : reject(xhr.status)
  	xhr.send();
  })
};

function xhrFetch(url){
  return new Promise(function(resolve, reject) {
    let req = new XMLHttpRequest();

    req.open('GET', url);

    req.onload = () => (req.status == 200) ? resolve(req.response) : reject(Error(req.statusText))

    req.onerror = () => reject(Error("Network Error"))

    req.send();
  });
}

function optionIndex(select) {
  let options = select.options;
  let selectedOption = options.item(select.selectedIndex);
  let nodes = selectedOption.parentNode.children;

  for (let i = 0; i < nodes.length; ++i) {
    if (nodes[i] === selectedOption) {
      return i;
    }
  }

  return -1;
}

function containsString(haystack, needle){
   return haystack.match(needle) != null
}

function isButton(id){
  let buttons = ['full_vol_change', 'velocity_override', 'invert_source', 'solo']

  return buttons.some(button => containsString(id, button))
}

/**
 * delays the next step by amount of milliseconds
 * @function
 * @param {Number} time in milliseconds
 * @returns {Promise}
 */
function delay(time){
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time)
  })
}

/**
 * converts entity to char
 * @function
 * @param {String} htmk entity
 * @returns {String}
 */
function entityToChar(entity) {
  var s = document.createElement('span');
  s.innerHTML = entity;
  return s.innerHTML;
}

function buildPresetName(preset) {
  return Object.keys(preset)
    .filter((k) => k.includes("presetName"))
    .map((k) => String.fromCharCode(preset[k]))
    .filter((v) => v !== '\x00')
    .join("");
}

function isWindows() {
	if (typeof process !== "undefined" && process.platform === 'win32') {
		return true
	} else {
		return window.navigator &&
			window.navigator.platform &&
			window.navigator.platform.indexOf('Win') >= 0
	}
}

function isWindows10() {
	return isWindows() && /Windows\s*\w*\s*10/g.test(window.navigator.platform)
}

function isLinux() {
	if (typeof process !== "undefined" && process.platform === 'linux') {
		return true
	} else {
		return window.navigator &&
			window.navigator.platform &&
			window.navigator.platform.indexOf('Linux') >= 0
	}
}

export {
  insertSVG,
  colorPalette,
  setQuadrant,
  convert16to8,
  convert8to16,
  inputFocus,
  isOn,
  q2i,
  i2q,
  isUnison,
  getUnison,
  convertRange,
  promiseEvent,
  isValidRange,
  restrictNumber,
  xhrFetch,
  getJSON,
  optionIndex,
  isButton,
  delay,
  entityToChar,
  buildPresetName,
  isWindows,
  isWindows10,
  isLinux
};
