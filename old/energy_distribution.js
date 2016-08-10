module.exports = {
    setup: setup,
    control: control,
    jobs: jobs
};

const MSPC = 'energy_dist_v1';

function setup () {
    if (!Memory[MSPC]) Memory[MSPC] = {structures: {}, rooms: {}};

    Structure.prototype.setLevels = function(structure, parameters) {
        if (!this.store) return false;

        var min = 0;
        if (_.isNumber(parameters.min)) {
            if (min < 0) return false;
            min = parameters.min;
        }

        var max = this.storeCapacity;
        if (_,isNumber(parameters.max)) {
            if (parameters.max < min) return false;
            if (parameters.max > this.storeCapacity) return false;
            max = parameters.max;
        }

        if (!Memory[MSPC].structures[this.id]) Memory[MSPC].structures[this.id] = {};
        Memory[MSPC].structures[this.id].levels = {min: min, max: max};
    };

    Structure.prototype.setIgnore = function(doIgnore) {
        if (!this.store) return false;
        if (!Memory[MSPC].structures[this.id]) Memory[MSPC].structures[this.id] = {};
        Memory[MSPC].structures[this.id].ignore = doIgnore || false;
    };

    Structure.prototype.getLevels = function() {
        if (!this.store) return undefined;
        var def = {min: 0, max: this.storeCapacity};
        if (!mem() || !mem().structures || !mem().structures[this.id]) return def;
        return mem().structures[this.id].level;
    };

    Structure.prototype.isIgnore = function () {
        if (!this.store) return undefined;
        if (!Memory[MSPC].structures[this.id]) return false;
        return Memory[MSPC].structures[this.id].ignore || false;
    }
}

const JOB_TYPE = {
    WITHDRAW: 'WITHDRAW',
    TRANSFER: 'TRANSFER',
    SUPPLY: 'SUPPLY'
};

function initialize_room(room_name) {
    if (!Memory[MSPC].rooms[room_name]) Memory[MSPC][room_name] = {carriers: [], jobs: []};
}

function assign_carrier(creep_name, room_name) {
    initialize_room(room_name);
    if (Game.creeps[creep_name]) {
        mem()[room_name].carriers.push(creep_name);
    }
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
    let structures = room.find(FIND_STRUCTURES, {filter: (s) => structure_filter(s) && !s.isIgnore()});
    let ret = {};
    ret[JOB_TYPE.TRANSFER] = [];
    ret[JOB_TYPE.WITHDRAW] = [];
    for (let i = 0; i < structures.length; ++i) {
        let s = structures[i];
        let levels = s.getLevels();
        let fill = _.sum(s.store);
        if (fill < levels.min) {
            ret[JOB_TYPE.TRANSFER].push({amount: levels.max - s.store.energy, id: s.id});
        } else if (fill > levels.max) {
            ret[JOB_TYPE.WITHDRAW].push({amount: s.store.energy - levels.max,  id: s.id});
        }
    }
    return ret;
}

function selectJob(creep, room, available_jobs, recursion) {
    creep.memory.job = null;

    if (creep.carry.energy < 50) {
        if (available_jobs[JOB_TYPE.WITHDRAW].length > 0) {
            let structures = [];
            let jobs = available_jobs[JOB_TYPE.WITHDRAW];
            jobs.forEach((e) => structures.push(Game.getObjectById(e.id)));
            let target = creep.pos.findClosestByPath(structures);
            if (target) {
                let idx = job_idx(jobs, target.id);
                if (idx >= 0) {
                    let job = jobs[idx];
                    creep.memory.job = {type: JOB_TYPE.WITHDRAW, id: job.id};
                    job.amount = Math.max(0, job.amount - creep.carryCapacity + _.sum(creep.carry));
                    if (job.amount == 0) jobs.splice(idx, 1);
                }
            }
        } else if (available_jobs[JOB_TYPE.TRANSFER].length > 0) {
            if (creep.room.storage && creep.room.storage.getLevels().min <= creep.room.storage.store.energy - 50) {
                creep.memory.job = {type: JOB_TYPE.WITHDRAW, id: creep.room.storage.id};
            }
        }
    } else if (available_jobs[JOB_TYPE.TRANSFER].length > 0) {
        let structures = [];
        let jobs = available_jobs[JOB_TYPE.TRANSFER]
        jobs.forEach((e) => structures.push(Game.getObjectById(e.id)));
        let target = creep.pos.findClosestByPath(structures);
        if (target) {
            let idx = job_idx(jobs, target.id);
            if (idx >= 0) {
                let job = jobs[idx];
                creep.memory.job = {type: JOB_TYPE.TRANSFER, id: job.id};
                job.amount = Math.max(0, job.amount - creep.carry.energy);
                if (job.amount == 0) jobs.splice(idx, 1);
            }
        }
    } else {
        if (creep.room.storage && creep.room.storage.getLevels().max >= creep.room.storage.store.energy + creep.carry.energy) {
            creep.memory.job = {type: JOB_TYPE.TRANSFER, id: creep.room.storage.id};
        }
    }

    if (creep.memory.job && recursion != 'none') {
        control_carrier(creep, room, available_jobs, 'none');
    }
}

function control_carrier(creep, room, available_jobs, recursion='any') {
    if (creep.room.name == room_name) {
        if (creep.memory.job) {
            let target = Game.getObjectById(creep.memory.job.id);
            if (target) {
                if (creep.pos.inRangeTo(target, 1)) {
                    if (recursion != 'move') {
                        if (creep.memory.job.type == JOB_TYPE.WITHDRAW) {
                            let amount = Math.min(target.store.energy - target.getLevels().min, creep.carryCapacity - _.sum(creep.carry));
                            creep.withdraw(target, RESOURCE_ENERGY, amount);
                            selectJob(creep, available_jobs, 'move');

                        } else if (creep.memory.job.type == JOB_TYPE.TRANSFER) {
                            let amount = Math.min(target.getLevels().max - target.store.energy, creep.carry.energy);
                            creep.transfer(target, RESOURCE_ENERGY, amount);
                            selectJob(creep, available_jobs, 'move');
                        }
                    }
                } else {
                    creep.moveTo(target);
                }
            } else {
                selectJob(creep, available_jobs, recursion);
            }
        } else {
            selectJob(creep, available_jobs, recursion);
        }
    } else {
        creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(room.name)));
    }
}

function control_carriers(room, available_jobs) {
    let carriers = Memory[MSPC][room.name].carriers;
    let n = carriers.length;
    let k = 0;
    for (let i = 0; i < n; ++i) {
        let creep = carriers[k];
        if (creep) {
            control_carrier(creep, room, available_jobs);
            k += 1;
        } else {
            carriers.splice(k, 1);
        }
    }
}

function control(room) {
    initialize_room(room.name);
    let transport_jobs = jobs(room);
    control_carriers(room, transport_jobs);
}