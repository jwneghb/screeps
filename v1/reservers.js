module.exports = {
    assign: assign_reserver,
    control: control_reservers,
    set_pos: set_controller_position
};

function set_controller_position (pos) {
    if (!Memory.reserve) Memory.reserve = {};
    if (!Memory.reserve[pos.roomName]) Memory.reserve[pos.roomName] = {};
    Memory.reserve[pos.roomName].pos = {x: pos.x, y: pos.y, roomName: pos.roomName};
}

function assign_reserver (creep_name, room_name) {
    if (!Memory.reserve) Memory.reserve = {};
    if (!Memory.reserve[room_name]) Memory.reserve[room_name] = {};
    if (!Memory.reserve[room_name].creeps) Memory.reserve[room_name].creeps = []
    var creep = Game.creeps[creep_name];
    if (creep) {
        Memory.reserve[room_name].creeps.push(creep_name);
        creep.memory.role = 'reserver';
        creep.memory.target = Memory.reserve[room_name].pos;
        return true;
    } else {
        return false;
    }
}

function control_reservers (room_name) {
    if (!Memory.reserve || !Memory.reserve[room_name] || !Memory.reserve[room_name].creeps) return 0;

    var reservers = Memory.reserve[room_name].creeps;
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
    if (creep.memory.target) {
        if (creep.room.name != creep.memory.target.roomName ||
            creep.reserveController(creep.room.controller) == ERR_NOT_IN_RANGE)
        {
            var tgt = creep.memory.target;
            creep.moveTo(new RoomPosition(tgt.x, tgt.y, tgt.roomName));
        }
    }
}