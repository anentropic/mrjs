var Reduce = {
    fn: function(key, values) {
        // override this useless fn!
        return 1;
    }
}

self.addEventListener('message', function(event) {
    postMessage({
        'key': event.data[0],
        'value': Reduce.fn(event.data[0], event.data[1])
    });
}, false);
