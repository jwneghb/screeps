module.exports = {
    log: moving_function
};

function init(title, window, subtitle, aux) {
    if (!Memory.moving_avg) Memory.moving_avg = {};
    if (!Memory.moving_avg[title]) Memory.moving_avg[title] = {};
    if (subtitle) {
        Memory.moving_avg[title][subtitle] = {aux: aux, avg: 0, ws: 0, max_ws: window};
    } else {
        Memory.moving_avg[title] = {aux: aux, avg: 0, ws: 0, max_ws: window};
    }
}

function initialized(title, subtitle) {
    if (!Memory.moving_avg) return false;
    if (!Memory.moving_avg[title]) return false;
    if (subtitle) {
        if (!Memory.moving_avg[title][subtitle]) return false;
    }
    return true;
}

function get_data(title, subtitle) {
    if (subtitle) {
        return Memory.moving_avg[title][subtitle];
    } else {
        return Memory.moving_avg[title];
    }
}

function moving_function(title, value, params) {
    var subtitle = params.subtitle;
    
    if (!initialized(title, subtitle)) {
        var window = params.ws;
        if (!window) window = 10;
        
        init(title, window, subtitle, params.aux);
    }
    
    var f = params.f;
    if (!f) f = (v, aux) => v;
    
    var data = get_data(title, subtitle);
    
    var aux = data.aux;
    var a = data.avg;
    var w = data.ws;
    var c = value;

    var d = f(value, aux);
    
    a = (a * w + d) / (w + 1);
    w = Math.min(data.max_ws - 1, w + 1);

    data.avg = a;
    data.ws = w;
    
    return a;
}