const Deferred = require('./index');
const fs = require('fs');
const deferred = new Deferred();
const asyncReadFile = deferred.prmisify(fs.readFile);
asyncReadFile('./a.js').then(data => {
    console.log(data.toString());
});
