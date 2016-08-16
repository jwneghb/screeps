module.exports = {
    assign: assign_scout,
    control: control_scouts
};

function assign_scout (creep_name, target) {
    if (!Memory.scouts) Memory.scouts = {};
    if (!Memory.scouts[target.roomName]) Memory.scouts[target.roomName] = [];
    var creep = Game.creeps[creep_name];
    if (creep) {
        Memory.scouts[target.roomName].push(creep_name);
        creep.memory.target = target;
        return true;
    } else {
        return false;
    }
}

function control_scouts (room_name) {
    if (!Memory.scouts || !Memory.scouts[room_name]) return 0;
    var scouts = Memory.scouts[room_name];
    var n = scouts.length;
    var k = 0;
    var ttl = 0;
    for (var i = 0; i < n; ++i) {
        var c = Game.creeps[scouts[k]];
        if (c) {
            if (!c.spawning) {
                control_scout(c);
                if (c.ticksToLive > ttl) ttl = c.ticksToLive;
            } else {
                ttl = 1500;
            }
            k += 1;
        } else {
            scouts.splice(k, 1);
        }
    }
    return ttl;
}

function control_scout (creep) {
    var tgt = creep.memory.target;
    creep.moveTo(new RoomPosition(tgt.x, tgt.y, tgt.roomName));
}
