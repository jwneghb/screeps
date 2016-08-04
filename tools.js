module.exports = {
    cmin: function(best, pivot) {
        return best > pivot;
    },
    
    cmax: function(best, pivot) {
        return best < pivot;
    },
    
    cumulate: function(list, params) {
        if (!params) params = {};
        if (Object.keys(params).indexOf('z') < 0) params.z = 0;
        
        var sum = params.z;
        
        if (list.length > 0) {
            if (!params) params = {};
            var unwrap = params.u;
            var addition = params.a;
            
            if (!unwrap) unwrap = (x) => x;
            if (!addition) addition = (a, b) => a + b;
            
            for (var i = 0; i < list.length; ++i) {
                sum = addition(sum, unwrap(list[i]));
            }
        }
        return sum;
    },
    
    mindex: function(list, params) {
        var idx = -1;
        if (list.length > 0) {
            if (!params) params = {};
            var unwrap = params.u;
            var comp = params.c;
            
            if (!unwrap) unwrap = (x) => x;
            if (!comp) comp = (a, b) => a > b;
            
            idx = 0;
            var best = unwrap(list[0]);
            for (var i = 1; i < list.length; ++i) {
                var cur = unwrap(list[i]);
                if (comp(best, cur)) {
                    best = cur;
                    idx = i;
                }
            }
        }
        return idx;
    },
    
    mvalue: function(list, params) {
        if (!params) params = {};
        
        var best = params.i;
            
        if (list.length > 0) {
            var unwrap = params.u;
            var comp = params.c;
            
            if (!unwrap) unwrap = (x) => x;
            if (!comp) comp = (a, b) => a > b;
            
            best = unwrap(list[0]);
            for (var i = 1; i < list.length; ++i) {
                var cur = unwrap(list[i]);
                if (comp(best, cur)) {
                    best = cur;
                }
            }
        }
        return best;
    }
};