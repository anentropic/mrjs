/* from reading more about MapReduce I can see this needs a way to request
 * a new input without actually emitting a result, as the MapReduce design
 * allows mappers to retain state and potentially process all inputs before
 * emitting anything.
 * (currently the only way to get a new input is to emit)
 */

var Map = {
    job_key: null,
    init: function() {},
    emit: function(key, val) {
        postMessage({
            'msg_type': 'msg',
            'job_key': this.job_key,
            'key': key,
            'value': val
        });
    },
    complete: function() {
        postMessage({
            'msg_type': 'complete',
            'job_key': this.job_key
        });
    },
    fn: function(key, val) {
        // override this useless fn!
        this.emit(key, val);
    }
}

self.addEventListener('message', function(event) {
    Map.job_key = event.data[0];
    Map.init();
    Map.fn(event.data[0], event.data[1]);
    Map.complete();
}, false);
