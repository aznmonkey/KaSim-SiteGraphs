/*jshint esversion: 6*/

class Parser {
  constructor() {
    this.text = "";
    this.tokens = [];
    this.data = {};
  }

  /* load a json from a path */
  readJson(path, callback) {

    var json = path || './data/simple.json';

    function loadJSON(path, callback2) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState === 4) {
                if (httpRequest.status === 200) {
                    var data = JSON.parse(httpRequest.responseText);
                    if (callback2) {
                      callback2(data);
                    }
                    if (callback) {
                      callback();
                    }
                }
            }
        };
        httpRequest.open('GET', path);
        httpRequest.send(); 
    }

    /* parse json file*/
    loadJSON(json, this.parseData.bind(this));
  }

  /**
   * parse a json file
   */
  parseData(data) {
    /* first get string tokens from the syntaxData */
    return data;    
    
  }
}