// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

const presetArea = document.querySelector('#presets')

presetArea.addEventListener('dragover', dragover)
presetArea.addEventListener('drop', JSONDrop)
presetArea.addEventListener('dragend', dragend)
presetArea.addEventListener('dragexit', dragexit)
presetArea.addEventListener('dragleave', dragexit)

function JSONDrop(e) {
  // console.log('Drop')
  e.stopPropagation();
  e.preventDefault();

  let files = e.dataTransfer.files;
  Array.from(files).forEach(file => {
    // Only process json files.
    if (file.type.match('application/json')){
      let reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {
          let preset = JSON.parse(e.target.result);
          // import preset
          globalThis.importLocalStorage(preset)
        };
      })(file);

      reader.readAsText(file);
      // remove styling
      presetArea.classList.remove('drag-import-over')
    } else {
      // add message, setTimeout to remove class
      presetArea.classList.add('wrong-type')
      setTimeout(() => {
        presetArea.classList.remove('wrong-type')
        // remove styling
        presetArea.classList.remove('drag-import-over')
      }, 2000)
      console.warn('only JSON files are allowed to be imported')
    }
  })
}

function dragover(e) {
  // console.log("dragOver");
  if(e.srcElement.id === 'presets') e.srcElement.classList.add('drag-import-over')
  e.preventDefault();
}

function dragend(e) {
  // console.log("dragEnd");
  // Remove all of the drag data
  var dt = ev.dataTransfer;
  if (dt.items) {
    // Use DataTransferItemList interface to remove the drag data
    for (var i = 0; i < dt.items.length; i++) {
      dt.items.remove(i);
    }
  } else {
    // Use DataTransfer interface to remove the drag data
    e.dataTransfer.clearData();
  }
}

function dragexit(e) {
  // console.log('leaving the drag target')
  // remove styling
  presetArea.classList.remove('drag-import-over')
}
