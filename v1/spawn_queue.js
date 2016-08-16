module.exports = {
    tick: tick,
    spawn: schedule_spawn,
    status: ticket_status
};

function body_attr (body) {
    var cost = 0;
    for (var i = 0; i < body.length; ++i) {
        cost += BODYPART_COST[body[i]];
    }
    return {cost: cost, duration: 3 * body.length};
}

function tick (room) {
    if (!Memory.SQ_v1) Memory.SQ_v1 = {rooms: {}, open: {}};
    if (!Memory.SQ_v1[room.name]) Memory.SQ_v1[room.name] = {queue: []};
    Memory.SQ_v1[room.name].ticket = 0;

    for (var i in Game.creeps) {
        delete Memory.SQ_v1.open[i];
    }

    var room_data = Memory.SQ_v1[room.name];

    var idx = -1;
    for (var i = 0; i < room_data.queue.length; ++i) {
        room_data.queue[i].priority.total += room_data.queue[i].priority.inc;
        if (idx < 0 || room_data.queue[idx].priority.total < room_data.queue[i].priority.total) {
            if (room_data.queue[idx].priority.total >= room_data.queue[idx].priority.min) {
                idx = i;
            }
        }
    }

    if (idx >= 0 && room_data.open[room_data.queue[idx].ticket].attr.cost <= room.energyAvailable) {

        var spawns = room.find(FIND_MY_SPAWNS);
        for (var i = 0; i < spawns.length; ++i) {
            var spawn = spawns[i];
            if (!spawn.spawning) {
                var qi = room_data.queue[idx];
                var name = spawn.createCreep(qi.body, qi.ticket);
                if (!(name < 0)) {
                    if (qi.assignment) qi.assignment(name);
                    room_data.spawns[spawn.name].busy = Game.time + qi.attr.duration;
                    Memory.SQ_v1.open[qi.ticket].spawning = true;
                    room_data.queue.splice(idx, 1);
                    return true;
                }
            }

        }
    }
    return false;
}

function ticket_status(ticket) {
    if (!Memory.SQ_v1) return undefined;
    return Memory.SQ_v1.open[ticket];
}

function schedule_spawn (room, body, assignment=null, inc=1, init=0, min=0) {
    var attr = body_attr(body);
    if (attr.cost > room.energyCapacityAvailable) return ERR_NOT_ENOUGH_ENERGY;

    Memory.SQ_v1[room.name].ticket += 1;
    var ticket = Game.time.toString(16) + 'x' + Memory.SQ_v1.ticket.toString(16);

    Memory.SQ_v1.rooms[room.name].queue.push({ticket: ticket, attr: attr, body: body, priority: {inc: inc, total: init, min: min}, assignment: assignment});
    Memory.SQ_v1.open[ticket] = {spawning: false};

    return ticket;
}