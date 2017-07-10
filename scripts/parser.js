/*jshint esversion: 6*/

class Parser {
  constructor() {
    this.data = {};
  }

  /* load a json from a path */
  readJson(path, isSnapShot) {
    var parser = this;
    let json = path || './data/simple.json';
    return new Promise(function(resolve, reject) {
      var httpRequest = new XMLHttpRequest();
      httpRequest.open('GET', json);
      httpRequest.onload = function() {
        if (httpRequest.status == 200) {
        // Resolve the promise with the response text
          //console.log(httpRequest.responseText);
          let data = JSON.parse(httpRequest.responseText);
          console.log(data);
          resolve(parser.populateData(data, isSnapShot));

        }
        else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
          reject(Error(httpRequest.statusText));
        }

      };
      // Handle network errors
      httpRequest.onerror = function() {
        reject(Error("Network Error"));
      };
      httpRequest.send(); 
    });
  }

  populateData(rawData, isSnapShot) {
    let data;
    if (!isSnapShot) 
      data = new DataStorage(rawData, isSnapShot);
    else {
      data = new DataWareHouse(rawData);
    }
    //console.log(dataStorage);
    return data;
  }

  removeData() {
    window.data.pop();
  }
}