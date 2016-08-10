var mining = require('room_mining');
var tools = require('tools');

module.exports = {
    control: control
};

var constants = {
    ROLE_CARRIER: 'remote_carrier'
};

function control() {
    for (var i in Game.creeps) {
        var creep = Game.creeps[i];
        if (creep.memory.role = constants.ROLE_CARRIER) {
            control_carrier(creep);
        }
    }
}

function control_carrier(creep) {
    if (!creep.memory.goto) {
        if (creep.memory.pickup.roomName == creep.room.name) {
            var status = mining.fill_status(creep.room.name);
            var idx = tools.mindex(status, {u: (x) => x.fill, c: tools.cmax});
            if (idx >= 0) {
                var obj = Game.getObjectById(status[idx].id);
                if (obj) {
                    var err = creep.withdraw(obj, RESOURCE_ENERGY);
                    if (err == OK) {
                        creep.memory.goto = creep.memory.home;
                    } else if (err == ERR_NOT_IN_RANGE) {
                        creep.moveTo(obj);
                    }
                }
            }
        } else if (creep.memory.home.roomName == creep.room.name) {
            let store = creep.room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_STORAGE});
            if (store.length > 0) {
                creep.memory.home = store[0].pos;
                var err = creep.transfer(store[0], RESOURCE_ENERGY);
                if (err == OK) {
                    creep.memory.goto = creep.memory.pickup;
                } else if (err == ERR_NOT_IN_RANGE) {
                    creep.moveTo(store[0]);
                }
            }
        }
    }
}