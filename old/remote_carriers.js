var mining = require('new_mining');

module.exports = {
    control: control,
    assign: assign_transporter
};

var LONG_DISTANCE_CARRIER = 'LONG_DISTANCE_CARRIER';

function assign_transporter(creep_name, mine_name, home_name) {
    var creep = Game.creeps[creep_name];
    if (!creep) return false;
    if (!mine_name) return false;
    if (!home_name) home_name = creep.room.name;
    creep.memory.role = LONG_DISTANCE_CARRIER;
    creep.memory.home = home_name;
    creep.memory.mine = mine_name;
    return true;
}

function control() {
    var status = {};
    for (var i in Game.creeps) {
        var creep = Game.creeps[i];
        if (creep.memory.role == LONG_DISTANCE_CARRIER) {
            if (!status[creep.memory.mine]) {
                status[creep.memory.mine] = {creeps: [creep.name], ttl: creep.ticksToLive};
            } else {
                status[creep.memory.mine].creeps.push(creep);
                status[creep.memory.mine].ttl = Math.min(status[creep.memory.mine].ttl, creep.ticksToLive);
            }
            if (!creep.spawning) {
                control_carrier(creep);
            }
        }
    }
    return status;
}

function control_carrier(creep) {
    if (creep.memory.returning) {
        if (creep.carry.energy == 0) {
            creep.memory.returning = false;
            return;
        }
        if (is_in_room(creep, creep.memory.home)) {
            let err = creep.transfer(creep.room.storage, RESOURCE_ENERGY);
            if (err == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.storage);
            } else {
                if (err != OK) creep.drop(RESOURCE_ENERGY);
                creep.memory.visited = [];
                creep.memory.current = null;
                creep.memory.returning = creep.ticksToLive < 150;

                creep.memory.tours = creep.memory.tours + 1 || 1;
                console.log(creep.name + " (tour  " + creep.memory.tours + ") deposited " + creep.carry.energy + ", TTL: " + creep.ticksToLive);
            }
        }
    } else {
        if (is_in_room(creep, creep.memory.mine)) {
            if (creep.memory.current) {
                let container = Game.getObjectById(creep.memory.current);
                if (container) {
                    let err = creep.withdraw(container, RESOURCE_ENERGY);
                    if (err == ERR_NOT_IN_RANGE) {
                        creep.moveTo(container);
                        return;
                    }
                }
                if (!creep.memory.visited) creep.memory.visited = [];
                creep.memory.visited.push(creep.memory.current);
                creep.memory.current = null;
            } else {
                if (creep.carry.energy < creep.carryCapacity * 0.9 && creep.ticksToLive > 75) {
                    let container = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => container_eligible(creep, s)});
                    if (container) {
                        creep.memory.current = container.id;
                        return;
                    }
                }
                creep.memory.returning = true;
            }
        }
    }
}

function is_in_room(creep, room_name) {
    if (room_name == creep.room.name) return true;
    creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(room_name)));
    return false;
}

function container_eligible(creep, structure) {
    if (structure.structureType != STRUCTURE_CONTAINER) return false;
    if (creep.memory.visited && creep.memory.visited.indexOf(structure.id) >= 0) return false;
    if (structure.store.energy < creep.carryCapacity/3) return false;
    return true;
}