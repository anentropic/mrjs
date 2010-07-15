importScripts('reduce_base.js');

Reduce.fn = function(key, values) {
    var sum = 0;
    for (var i=0, len=values.length; i<len; i++) {
        sum += values[i];
    }
    return sum;
}