module.exports = {
    setup: setup,
    control: control,
    jobs: jobs,
    assign: assign_carrier
};

const MSPC = 'energy_dist_v1';

function setup () {
    if (!Memory[MSPC]) Memory[MSPC] = {structures: {}, rooms: {}};

    Structure.prototype.setLevels = function(parameters) {
        if (!this.store) return false;

        var min = 0;
        if (_.isNumber(parameters.min)) {
            if (min < 0) return false;
            min = parameters.min;
        }

        var max = this.storeCapacity;
        if (_.isNumber(parameters.max)) {
            if (parameters.max < min) return false;
            if (parameters.max > this.storeCapacity) return false;
            max = parameters.max;
        }

        if (!Memory[MSPC].structures[this.id]) Memory[MSPC].structures[this.id] = {};
        Memory[MSPC].structures[this.id].levels = {min: min, max: max};

        return true;
    };

    Structure.prototype.setIgnore = function(doIgnore) {
        if (!this.store) return false;
        if (!Memory[MSPC].structures[this.id]) Memory[MSPC].structures[this.id] = {};
        Memory[MSPC].structures[this.id].ignore = doIgnore || false;
    };

    Structure.prototype.getLevels = function() {
        if (!this.store) return undefined;
        var def = {min: 0, max: this.storeCapacity};
        if (!Memory[MSPC] || !Memory[MSPC].structures || !Memory[MSPC].structures[this.id]) return def;
        return Memory[MSPC].structures[this.id].levels;
    };

    Structure.prototype.isIgnore = function () {
        if (!this.store) return undefined;
        if (!Memory[MSPC].structures[this.id]) return false;
        return Memory[MSPC].structures[this.id].ignore || false;
    }
}

const FLOW = {
    IN: 'IN',
    OUT: 'OUT'
};

const METHOD = {
    WITHDRAW: 'WITHDRAW',
    TRANSFER: 'TRANSFER',
    PICKUP: 'PICKUP',
    SUPPLY: 'SUPPLY'
};

function initialize_room(room_name) {
    if (!Memory[MSPC].rooms[room_name]) Memory[MSPC].rooms[room_name] = {carriers: [], jobs: []};
}

function assign_carrier(creep_name, room_name) {
    initialize_room(room_name);
    if (Game.creeps[creep_name]) {
        Memory[MSPC].rooms[room_name].carriers.push(creep_name);
    }
}

function supplyable_filter(s) {
    return s.structureType == STRUCTURE_TOWER && s.energy < s.energyCapacity * 0.95 ||
        (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.energy < s.energyCapacity;
}

function structure_filter(s) {
    return s.structureType == STRUCTURE_CONTAINER || (s.my && (s.structureType == STRUCTURE_STORAGE ||
        s.structureType == STRUCTURE_LINK || s.structureType == STRUCTURE_TERMINAL));
}

function job_idx(jobs, id) {
    for (let i = 0; i < jobs.length; ++i) {
        if (jobs[i].id == id) {
            return i;
        }
    }
    return -1;
}

function jobs(room) {
    let ret = {};
    ret[FLOW.IN] = [];
    ret[FLOW.OUT] = [];

    let structures = room.find(FIND_STRUCTURES, {filter: (s) => structure_filter(s) && !s.isIgnore()});
    for (let i = 0; i < structures.length; ++i) {
        let s = structures[i];
        let levels = s.getLevels();
        let fill = _.sum(s.store);
        if (fill < levels.min) {
            ret[FLOW.OUT].push({amount: levels.max - s.store.energy, method: METHOD.TRANSFER, id: s.id});
        } else if (fill > levels.max) {
            ret[FLOW.IN].push({amount: s.store.energy - levels.max, method: METHOD.WITHDRAW, id: s.id});
        }
    }
    let supplyables = room.find(FIND_MY_STRUCTURES, {filter: (s) => supplyable_filter(s)});
    for (let i = 0; i < supplyables.length; ++i) {
        let s = supplyables[i];
        let fill = s.energy;
        let cap = s.energyCapacity;
        if (fill < cap) {
            ret[FLOW.OUT].push({amount: cap - fill, id: s.id});
        }
    }
    return ret;
}

function selectJob(creep, available_jobs) {
    creep.memory.job = null;

    if (creep.carry.energy < 50 && creep.ticksToLive >= 35) {
        if (available_jobs[FLOW.IN].length > 0) {
            let structures = [];
            let jobs = available_jobs[FLOW.IN];
            jobs.forEach((e) => structures.push(Game.getObjectById(e.id)));
            let target = creep.pos.findClosestByPath(structures);
            if (target) {
                let idx = job_idx(jobs, target.id);
                if (idx >= 0) {
                    let job = jobs[idx];
                    creep.memory.job = {type: FLOW.IN, method: job.method, id: job.id};
                    job.amount = Math.max(0, job.amount - creep.carryCapacity + _.sum(creep.carry));
                    if (job.amount == 0) jobs.splice(idx, 1);
                }
            }
        } else if (available_jobs[FLOW.OUT].length > 0) {
            if (creep.room.storage && creep.room.storage.getLevels().min <= creep.room.storage.store.energy - 50) {
                creep.memory.job = {type: FLOW.IN, method: METHOD.WITHDRAW, id: creep.room.storage.id};
            }
        }
    } else if (available_jobs[FLOW.OUT].length > 0) {
        let structures = [];
        let jobs = available_jobs[FLOW.OUT]
        jobs.forEach((e) => structures.push(Game.getObjectById(e.id)));
        let target = creep.pos.findClosestByPath(structures);
        if (target) {
            let idx = job_idx(jobs, target.id);
            if (idx >= 0) {
                let job = jobs[idx];
                creep.memory.job = {type: FLOW.OUT, method: job.method, id: job.id};
                job.amount = Math.max(0, job.amount - creep.carry.energy);
                if (job.amount == 0) jobs.splice(idx, 1);
            }
        }
    } else {
        if (creep.room.storage && creep.room.storage.getLevels().max >= creep.room.storage.store.energy + creep.carry.energy) {
            creep.memory.job = {type: FLOW.OUT, method: METHOD.TRANSFER, id: creep.room.storage.id};
        } else if (creep.ticksToLive < 35) {
            var struct = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => structure_filter(s) && _.sum(s.store) + creep.carry.energy / 4 < s.storeCapacity});
            if (struct) {
                creep.memory.job = {type: FLOW.OUT, method: METHOD.TRANSFER, id: struct.id};
            }
        }
    }
}

function isValid(creep, job) {
    let obj = Game.getObjectById(job.id);
    if (!obj) return false;
    if (job.method == METHOD.TRANSFER || job.method == METHOD.WITHDRAW) {
        if (obj.isIgnore()) return false;
        var levels = struct.getLevels();
        if (!levels) return false;
    }

    if (job.method == METHOD.WITHDRAW) {
        if (_.sum(creep.carry) == creep.carryCapacity) return false;
        if (obj.store.energy <= levels.min) return false;
    } else if (job.method == METHOD.TRANSFER) {
        if (_.sum(creep.carry) < 50) return false;
        if (obj.store.energy >= levels.max) return false;
    } else if (job.method == METHOD.SUPPLY) {
        if (_.sum(creep.carry) < Math.min(50, obj.energyCapacity - obj.energy)) return false;
        if (obj.energy == obj.energyCapacity) return false;
    } else {
        console.log("ERR: UNKNOWN job.method in energy_distribution.isValid");
        return false;
    }

    return true;
}

function control_carrier(creep, room, available_jobs) {
    if (creep.room.name == room.name) {
        if (creep.memory.job) {
            let target = Game.getObjectById(creep.memory.job.id);
            if (target) {
                if (isValid(creep, creep.memory.job)) {
                    if (creep.pos.inRangeTo(target, 1)) {
                        if (creep.memory.job.type == FLOW.IN) {
                            let amount = Math.min(target.store.energy - target.getLevels().min, creep.carryCapacity - _.sum(creep.carry));
                            if (creep.withdraw(target, RESOURCE_ENERGY, amount) == OK) {
                                creep.memory.job = null;
                            }
                        } else if (creep.memory.job.type == FLOW.OUT) {
                            let amount = 0;
                            if (creep.memory.job.method == METHOD.TRANSFER) {
                                amount = Math.min(target.getLevels().max - target.store.energy, creep.carry.energy);
                            } else if (creep.memory.job.method == METHOD.SUPPLY) {
                                amount = Math.min(target.energyCapacity - target.energy, creep.carry.energy);
                            } else {
                                console.log("ERR: INVALID job.type / job.method combination in energy_distribution.control_carrier");
                            }
                            if (creep.transfer(target, RESOURCE_ENERGY, amount) == OK) {
                                creep.memory.job = null;
                            }
                        }
                    } else {
                        creep.moveTo(target);
                    }
                } else {
                    selectJob(creep, available_jobs);
                }
            } else {
                selectJob(creep, available_jobs);
            }
        } else {
            selectJob(creep, available_jobs);
        }
    } else {
        creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(room.name)));
    }
}

function control_carriers(room, available_jobs) {
    let carriers = Memory[MSPC].rooms[room.name].carriers;
    let n = carriers.length;
    let k = 0;
    for (let i = 0; i < n; ++i) {
        let creep = Game.creeps[carriers[k]];
        if (creep) {
            if (!creep.spawning) {
                control_carrier(creep, room, available_jobs);
            }
            k += 1;
        } else {
            carriers.splice(k, 1);
        }
    }
    return k;
}

function control(room) {
    initialize_room(room.name);
    let transport_jobs = jobs(room);
    return control_carriers(room, transport_jobs);
}