var api = require('./../utils/redis.js');

var result;
api.is_log_present('name', function (result) {
    console.log('Result = ' + result);
});

var log1 = {'text': 'terminalll', 'process': 'yoco'};
var log2 = {'text': 'Hmmmmmm', 'process': 'chrome'};
// var log = {'c1':JSON.stringify(log1), 'c2':JSON.stringify(log2)};
var log = {'c1': log1, 'c2': log2};
var str_log = JSON.stringify(log);
console.log(str_log);
api.insert_log('haha', {'info': str_log});

api.read_log('haha', function (result) {
    console.log(result);
    // var obj = JSON.parse(result['info']);
    // console.log(obj);
});

api.delete_log('haha');