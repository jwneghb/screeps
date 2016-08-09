var creepTypes = require('creep.types');

module.exports = {
    run: control_claimers,
    spawn: spawn_claimer
};

function spawn_claimer(spawn, goal) {
    spawn.createCustomCreep(creepTypes.CLAIMER, 2300, {role: 'claimer', room: goal});
}

function control_claimer(creep) {
    if (!creep.spawning) {
        if (creep.room.name == creep.memory.room) {
            var ctrl = creep.room.controller;
            if (creep.claimController(ctrl) == ERR_NOT_IN_RANGE) {
                creep.moveTo(ctrl);
            }
        } else {
            creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(creep.memory.room)));
        }
    }
}

function control_claimers() {
    var ret = {};
    for (var i in Game.creeps) {
        var creep = Game.creeps[i];
        if (creep.memory.role == 'claimer') {
            control_claimer(creep);
            if (!ret[creep.memory.room]) {
                ret[creep.memory.room] = [creep.id];
            } else {
                ret[creep.memory.room].push(creep.id);
            }
        }
    }
    return ret;
}