const settings = {
    containers: {
        W42N24: [
            {
                id: '5799c514545102d517dda466',
                min: 500,
                max: 1500
            }
        ],
        default: {
            min: 0,
            max: 1000
        }
    }
};

function container_diff(container) {
    if (!container) return 0;
    var data = settings.containers.default;
    var list = settings.containers[container.room];
    if (list) {
        var n = list.length;
        for (var i = 0; i < n; ++i) {
            if (list[i].id == container.id) {
                data = list[i];
                break;
            }
        }
    }
    if (container.store.energy < data.min) {
        return container.store.energy - data.max;
    } else if (container.store.energy > data.max) {
        return container.store.energy - data.min;
    } else {
        return 0;
    }
}