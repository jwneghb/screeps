module.exports = {
    assign: assign_reserver,
    control: control_reservers
};

function assign_reserver (creep_name, room_name) {
    if (!Memory.reservers) Memory.reservers = {};
    if (!Memory.reservers[room_name]) Memory.reservers[room_name] = [];
    var creep = Game.creeps[creep_name];
    if (creep) {
        Memory.reservers[room_name].push(creep_name);
        creep.memory.room = room_name;
        return true;
    } else {
        return false;
    }
}

function control_reservers (room_name) {
    if (!Memory.reservers || !Memory.reservers[room_name]) return 0;
    var reservers = Memory.reservers[room_name];
    var n = reservers.length;
    var k = 0;
    var ttl = 0;
    for (var i = 0; i < n; ++i) {
        var c = Game.creeps[reservers[k]];
        if (c) {
            if (!c.spawning) {
                control_reserver(c);
            }
            if (c.ticksToLive > ttl) ttl = c.ticksToLive;
            k += 1;
        } else {
            reservers.splice(k, 1);
        }
    }
    return ttl;
}

function control_reserver (creep) {
    if (is_in_room(creep, creep.memory.room)) {
        var controller = creep.room.controller;
        if (creep.reserveController(controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(controller);
        }
    }
}

function is_in_room(creep, room_name) {
    if (room_name == creep.room.name) return true;
    creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(room_name)));
    return false;
}