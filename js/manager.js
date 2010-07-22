/*
 * requires: hash.js, jQuery
 * (could lose jQuery... just being lazy with $.extend(options) )
 * intend to replace hash.js with html5 IndexedDB (or perhaps pluggable)
 *
 * reading more about MapReduce, this needs a 'Combiner' step...
 * currently a no-op combiner happens implicitly in on_mapper_emit()
 *
 * most importantly we need a 'shuffle and sort' step that happens after
 * combining.  as much as possible we can use IndexedDB to do this for us,
 * by adding a synthetic 'sort-key' field to the data.
 *
 * also need a 'Partitioner' step... currently there's an implicit no-op
 * partitioning that distributes data to the Reducers in a round-robin fashion.
 * the Partitioner would basically just parse the sort-key value into a
 * Reducer id (in MapReduce the default is: [numeric-hash of the primary key]
 * modulo [number of reducers])
 *
 * also needs a way for Mappers to request a new input without actually
 * emitting a result... probably means queuing up an even split of the data to
 * all the mappers initially rather than current round-robin distribution to
 * next-available Mapper
 *
 */ 

var Manager = function(options) {
    this.options = $.extend(this.options, options);
}

Manager.prototype = {
    options: {
        'map_pool_size': 10,
        'reduce_pool_size': 5
    },
    map_pool: [],
    reduce_pool: [],
    
    job_todo: new Hash(), // initial data to map
    job_inprogress: new Hash(), // being mapped
    job_done: new Hash(), // mapped
    job_length: null,
    
    map_results: new Hash(), // map results to reduce
    map_inprogress: new Hash(), // being reduced
    reduce_results: new Hash(),
    map_length: null,
    
    init: function(data) {
        this.job_todo.init(data);
        this.job_length = this.job_todo.length;
        
        this.build_pool(this.map_pool, this.options.map_pool_size, this.options.map_js, this.on_mapper_emit);
        this.start_mapping();
    },
    
    build_pool: function(pool, size, js_url, emit_handler) {
        var _this = this;
        for (var i=0; i<size; i++) {
            var w = new Worker(js_url);
            w.addEventListener('message', function(event) {
                emit_handler.apply(_this, [event]);
            }, false);
            w.busy = false;
            w.use_count = 0;
            pool.push(w);
        }
    },
    
    start_mapping: function() {
        for (var i=0, len=this.map_pool.length; i<len; i++) {
            this.do_task(this.map_pool[i], this.job_todo, this.job_inprogress);
        }
    },
    
    do_task: function(worker, src_stack, progress_stack) {
        if (src_stack.length > 0) {
            var new_job = src_stack.popitem();// pull a random job from the stack
            progress_stack.set(new_job[0], new_job[1]);
            worker.busy = true;
            worker.use_count++;
            worker.postMessage(new_job);
        }
    },
    
    on_mapper_emit: function(event) {
        if (event.data.msg_type == 'complete') {
            this.on_mapper_complete(event.target, event.data.job_key);
        } else
        if (event.data.msg_type == 'msg') {
            var val;
            if (this.map_results.contains(event.data.key)) {
                val = this.map_results.get(event.data.key);
                val.push(event.data.value);
            } else {
                val = [event.data.value];
            }
            this.map_results.set(event.data.key, val);
        }
    },
    
    on_mapper_complete: function(mapper, job_key) {
        mapper.busy = false;
        this.job_done.set(job_key, this.job_inprogress.pop(job_key));
        if (this.job_done.length == this.job_length) {
            this.map_complete();
        }
        this.do_task(mapper, this.job_todo, this.job_inprogress);
    },
    
    map_complete: function() {
        this.map_length = this.map_results.length;
        this.build_pool(this.reduce_pool, this.options.reduce_pool_size, this.options.reduce_js, this.on_reducer_emit);
        this.start_reducing();
    },
    
    
    start_reducing: function() {
        for (var i=0, len=this.reduce_pool.length; i<len; i++) {
            this.do_task(this.reduce_pool[i], this.map_results, this.map_inprogress);
        }
    },
    
    on_reducer_emit: function(event) {
        event.target.busy = false;
        this.reduce_results.set(event.data.key, event.data.value);
        this.map_inprogress.pop(event.data.key);
        if (this.reduce_results.length == this.map_length) {
            this.options.on_complete(this.reduce_results.items_obj());
            for (var i=0; i<this.map_pool.length; i++) {
                console.log('Mapper:', i, this.map_pool[i].use_count);
            }
            for (var i=0; i<this.reduce_pool.length; i++) {
                console.log('Reducer:', i, this.reduce_pool[i].use_count);
            }
        }
        this.do_task(event.target, this.map_results, this.map_inprogress);
    },
    
}