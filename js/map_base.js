var Map = {
    job_key: null,
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
    Map.fn(event.data[0], event.data[1]);
    Map.complete();
}, false);
