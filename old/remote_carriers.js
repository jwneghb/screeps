var mining = require('new_mining');

module.exports = {
    control: control,
    assign: assign_transporter,
    setup: setup
};

var LONG_DISTANCE_CARRIER = 'LONG_DISTANCE_CARRIER';

function setup () {
    if (!Memory.long_dist_mining) Memory.long_dist_mining = {};

    StructureLink.prototype.setLDMTarget = function(isTarget=true) {
        if (isTarget) {
            Memory.long_dist_mining[this.room] = this.id;
        } else {
            delete Memory.long_dist_mining[this.room];
        }
    };
}

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
            if (Memory.long_dist_mining[creep.room.name]) {
                var target = Game.getObjectById(Memory.long_dist_mining[creep.room.name]);
            }

            if (target) {
                var isLink = true;
            } else {
                target = creep.room.storage;
            }

            let err = creep.transfer(target, RESOURCE_ENERGY);
            if (err == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            } else if (err == ERR_FULL && isLink) {
                // nothing
            } else {
                if (err != OK) creep.drop(RESOURCE_ENERGY);
                creep.memory.visited = [];
                creep.memory.current = null;
                creep.memory.returning = creep.ticksToLive < 300;

                creep.memory.tours = creep.memory.tours + 1 || 1;
                creep.memory.deposit = creep.memory.deposit + creep.carry.energy || creep.carry.energy;
                console.log(creep.name + " [" + (creep.body.length*50) + "]" + " (tour " + creep.memory.tours + ") deposited in total " + creep.memory.deposit + ", TTL: " + creep.ticksToLive);
                if (creep.memory.returning) creep.suicide();
            }
        }
    } else {
        if (is_in_room(creep, creep.memory.mine)) {
            if (creep.room.name == 'W41N24' && creep.pos.x < 6) {
                creep.moveTo(6, 34);
                return;
            }
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
                if (creep.carry.energy < creep.carryCapacity * 0.9 && creep.ticksToLive > 150) {
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