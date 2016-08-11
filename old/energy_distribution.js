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
        var cap;
        if (this.store) {
            cap = this.storeCapacity;
        } else if(this.energyCapacity) {
            cap = this.energyCapacity;
        } else {
            return false;
        }

        var min = 0;
        if (_.isNumber(parameters.min)) {
            if (min < 0) return false;
            min = parameters.min;
        }

        var max = cap;
        if (_.isNumber(parameters.max)) {
            if (parameters.max < min) return false;
            if (parameters.max > cap) return false;
            max = parameters.max;
        }

        if (!Memory[MSPC].structures[this.id]) Memory[MSPC].structures[this.id] = {};
        Memory[MSPC].structures[this.id].levels = {min: min, max: max};

        return true;
    };

    Structure.prototype.setIgnore = function(doIgnore=true) {
        if (!this.store && !this.energyCapacity) return undefined;
        if (!Memory[MSPC].structures[this.id]) Memory[MSPC].structures[this.id] = {};
        Memory[MSPC].structures[this.id].ignore = doIgnore || false;
        return Memory[MSPC].structures[this.id].ignore;
    };

    Structure.prototype.getLevels = function() {
        var ret;
        var fill;
        if (this.store) {
            ret = {min: 0, max: this.storeCapacity};
            fill = _.sum(this.store);
        } else if(this.energyCapacity) {
            ret = {min: 0, max: this.energyCapacity};
            fill = this.energy
        } else {
            return undefined;
        }
        if (Memory[MSPC] && Memory[MSPC].structures && Memory[MSPC].structures[this.id]) {
            ret = Memory[MSPC].structures[this.id].levels;
        }
        return {min: ret.min, max: ret.max, fill: fill};
    };

    Structure.prototype.isIgnore = function () {
        if (!this.store && !this.energyCapacity) return undefined;
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
    let active_jobs = []

    let ret = {};
    ret[FLOW.IN] = [];
    ret[FLOW.OUT] = [];

    let structures = room.find(FIND_STRUCTURES, {filter: (s) => structure_filter(s) && !s.isIgnore()});
    for (let i = 0; i < structures.length; ++i) {
        let s = structures[i];
        let levels = s.getLevels();
        if (levels.fill < levels.min) {
            ret[FLOW.OUT].push({amount: levels.max - levels.fill, method: METHOD.TRANSFER, id: s.id});
        } else if (levels.fill > levels.max) {
            ret[FLOW.IN].push({amount: levels.fill - levels.max, method: METHOD.WITHDRAW, id: s.id});
        }
    }
    let supplyables = room.find(FIND_MY_STRUCTURES, {filter: (s) => supplyable_filter(s)});
    for (let i = 0; i < supplyables.length; ++i) {
        let s = supplyables[i];
        let fill = s.energy;
        let cap = s.energyCapacity;
        if (fill < cap) {
            ret[FLOW.OUT].push({amount: cap - fill, method: METHOD.SUPPLY, id: s.id});
        }
    }
    return ret;
}

function selectJob(creep, available_jobs_, recursive=false) {
    var available_jobs;
    if (creep.memory.job) {
        available_jobs = {};
        available_jobs[FLOW.IN] = _.filter(available_jobs_[FLOW.IN], (j) => j.id != creep.memory.job.id);
        available_jobs[FLOW.OUT] = _.filter(available_jobs_[FLOW.OUT], (j) => j.id != creep.memory.job.id);
    } else {
        available_jobs = available_jobs_;
    }

    creep.memory.job = null;

    if (creep.ticksToLive == 2) {
        console.log('energy_distribution: ' + creep.name + ' retiring, ' + (creep.memory.idleTicks || 0));
    }

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
                    creep.memory.job = {flow: FLOW.IN, method: job.method, id: job.id};
                    job.amount = Math.max(0, job.amount - creep.carryCapacity + _.sum(creep.carry));
                    if (job.amount == 0) jobs.splice(idx, 1);
                }
            }
        } else if (available_jobs[FLOW.OUT].length > 0) {
            if (creep.room.storage && creep.room.storage.getLevels().min <= creep.room.storage.store.energy - 50) {
                creep.memory.job = {flow: FLOW.IN, method: METHOD.WITHDRAW, id: creep.room.storage.id};
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
                creep.memory.job = {flow: FLOW.OUT, method: job.method, id: job.id};
                job.amount = Math.max(0, job.amount - creep.carry.energy);
                if (job.amount == 0) jobs.splice(idx, 1);
            }
        }
    } else {
        if (creep.room.storage && creep.room.storage.getLevels().max >= creep.room.storage.store.energy + creep.carry.energy) {
            creep.memory.job = {flow: FLOW.OUT, method: METHOD.TRANSFER, id: creep.room.storage.id};
        } else if (creep.ticksToLive < 35) {
            var struct = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => structure_filter(s) && _.sum(s.store) + creep.carry.energy / 4 < s.storeCapacity});
            if (struct) {
                creep.memory.job = {flow: FLOW.OUT, method: METHOD.TRANSFER, id: struct.id};
            }
        }
    }

    if (creep.memory.job) {
        if (recursive) control_carrier(creep, creep.room, available_jobs, true);
    } else {
        creep.memory.idleTicks = creep.memory.idleTicks + 1 || 1;
    }
}

function isValid(creep, job) {
    let obj = Game.getObjectById(job.id);
    if (!obj) return false;
    if (job.method == METHOD.TRANSFER || job.method == METHOD.WITHDRAW) {
        if (obj.isIgnore()) return false;
        var levels = obj.getLevels();
        if (!levels) return false;
    }

    if (job.method == METHOD.WITHDRAW) {
        if (_.sum(creep.carry) == creep.carryCapacity) return false;
        if (levels.fill <= levels.min) return false;
    } else if (job.method == METHOD.TRANSFER) {
        if (_.sum(creep.carry) < 50) return false;
        if (levels.fill >= levels.max) return false;
    } else if (job.method == METHOD.SUPPLY) {
        if (_.sum(creep.carry) < Math.min(50, obj.energyCapacity - obj.energy)) return false;
        if (obj.energy == obj.energyCapacity) return false;
    } else {
        console.log("ERR: UNKNOWN job.method in energy_distribution.isValid: " + job.method);
        return false;
    }

    return true;
}

function control_carrier(creep, room, available_jobs, recursive=false) {
    if(recursive) creep.say('rec');

    if (creep.room.name == room.name) {
        if (!creep.memory.job) selectJob(creep, available_jobs);

        if (creep.memory.job) {
            let target = Game.getObjectById(creep.memory.job.id);
            if (target) {
                if (isValid(creep, creep.memory.job)) {
                    if (creep.pos.inRangeTo(target, 1)) {

                        if (recursive) return;

                        if (creep.memory.job.flow == FLOW.IN) {
                            let levels = target.getLevels();
                            let amount = Math.min(levels.fill - levels.min, creep.carryCapacity - _.sum(creep.carry));
                            creep.withdraw(target, RESOURCE_ENERGY, amount);
                            selectJob(creep, available_jobs, true);
                        } else if (creep.memory.job.flow == FLOW.OUT) {
                            let amount = 0;
                            if (creep.memory.job.method == METHOD.TRANSFER) {
                                let levels = target.getLevels();
                                amount = Math.min(levels.max - levels.fill, creep.carry.energy);
                            } else if (creep.memory.job.method == METHOD.SUPPLY) {
                                amount = Math.min(target.energyCapacity - target.energy, creep.carry.energy);
                            } else {
                                console.log("ERR: INVALID job.flow / job.method combination in energy_distribution.control_carrier");
                            }
                            creep.transfer(target, RESOURCE_ENERGY, amount);
                            selectJob(creep, available_jobs, true);
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