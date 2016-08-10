var creepTypes = require('creep.types');

module.exports = {
    run: control_claimers,
    mem: mem
};

function mem(room) {
    return {role: 'claimer', room: room};
}

function control_claimers(room_names) {
    for (var i in Game.creeps) {
        var c = Game.creeps[i];
        if (c.memory.role == 'claimer') {
            var idx = room_names.indexOf(c.memory.room);
            if (idx >= 0) {
                room_names.splice(idx, 1);
            }
            control_claimer(c);
        }
    }
    return room_names;
}

function control_claimer(creep) {
    if (creep.room.name == creep.memory.room) {
        if (creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller);
        }
    } else {
        creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(creep.memory.room)));
    }
}