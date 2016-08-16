module.exports = {
    clock: tock,
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

function tock () {
    if (!Memory.SQ_v1) Memory.SQ_v1 = {queues: {}, open: {}};
    Memory.SQ_v1.ticket = 0;

    for (var i in Game.creeps) {
        if (!Game.creeps[i].spawning) {
            delete Memory.SQ_v1.open[i];
        }
    }

    for (var i in Memory.SQ_v1.queues) {
        if (Game.rooms[i]) {
            tick(Game.rooms[i]);
        }
    }
}

function tick (room) {
    var queue = Memory.SQ_v1.queues[room.name];

    for (let i = 0; i < queue.length; ++i) {
        queue[i].priority.total += queue[i].priority.inc;
    }

    let comp = function (a, b) {
        let bv = b.priority.total >= b.priority.min ? b.priority.total : -1e6;
        let av = a.priority.total >= a.priority.min ? a.priority.total : -1e6;
        return bv - av;
    };

    queue.sort(comp);

    let spawns = room.find(FIND_MY_SPAWNS, {filter: (s) => !s.spawning});

    let energy_spent = 0;

    while (queue.length > 0 && spawns.length > 0 && queue[0].attr.cost <= room.energyAvailable - energy_spent) {
        let i = 0;
        let spawned = false;
        while (!spawned && i < spawns.length) {
            var spawn = spawns[i];
            var q = queue[0];
            var name = spawn.createCreep(q.body, q.ticket);
            if (!(name < 0)) {
                energy_spent += q.attr.cost;
                if (q.assignment) q.assignment(name);
                Memory.SQ_v1.open[q.ticket].spawning = true;
                queue.shift();
                spawns.splice(i, 1);
                spawned = true;
            }
            i += 1;
        }
    }
}

function ticket_status(ticket) {
    if (!Memory.SQ_v1) return undefined;
    return Memory.SQ_v1.open[ticket];
}

function schedule_spawn (room, body, assignment=null, inc=1, init=0, min=0) {
    if (!Memory.SQ_v1.queues[room.name]) Memory.SQ_v1.queues[room.name] = [];

    var attr = body_attr(body);
    if (attr.cost > room.energyCapacityAvailable) return ERR_NOT_ENOUGH_ENERGY;

    Memory.SQ_v1.ticket += 1;
    var ticket = 'SQ' + Game.time.toString(16) + 'x' + Memory.SQ_v1.ticket.toString(16);

    Memory.SQ_v1.queues[room.name].push({ticket: ticket, attr: attr, body: body, priority: {inc: inc, total: init, min: min}, assignment: assignment});
    Memory.SQ_v1.open[ticket] = {spawning: false};

    return ticket;
}