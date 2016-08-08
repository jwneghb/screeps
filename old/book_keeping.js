function period(time) {
    return Math.floor(time / 1000);
}

function income(resource_type, amount) {
    if (!Memory.book_keeping) {
        Memory.book_keeping = {
            previous_periods: []
        }
    }

    var cur = Memory.book_keeping.current_period;
    if (!cur) {
        cur = {start: Game.time, resources: {}};
    }

    if (period(Game.time) > period(cur.start)) {
        var total = {};
        for (var res in Object.keys(cur.resources)) {
            total.res = cur.resources[res].total;
        }
        var cur_flat = {
            start: cur.start,
            end: Game.time,
            total: total
        }
        Memory.book_keeping.previous_periods.push(cur_flat);
        cur = {start: Game.time, total: {}, entries: {}};
    }

    cur.entries[resource_type].push({t: Game.time, a: amount});
    cur.total[resource_type] += amount;
}