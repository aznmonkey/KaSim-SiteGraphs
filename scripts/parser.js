/*jshint esversion: 6*/

class Parser {
  constructor() {
    this.data = {};
  }

  /* load a json from a path */
  readJson(path) {

    var json = path || './data/simple.json';

    function loadJSON(path, callback) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState === 4) {
                if (httpRequest.status === 200) {
                    let data = JSON.parse(httpRequest.responseText);  
                    callback(data);                                
                }
                else {
                  throw "couldn't read file";
                }
            }
        };
        httpRequest.open('GET', path);
        httpRequest.send(); 
    }

    /* parse json file*/
    loadJSON(json, this.populateData.bind(this));
  }

  populateData(data) {
    window.data = [];
    window.data.push(new DataStorage(data, 0));
    console.log(window.data);
  }

  removeData() {
    window.data.pop();
  }
}