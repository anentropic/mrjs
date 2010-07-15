importScripts('map_base.js');

Map.fn = function(key, val) {
    var words = val.split(' ');
    for (var i=0, len=words.length; i<len; i++) {
        this.emit(String(words[i]).toLowerCase().replace(/\W/, ''), 1);
    }
}