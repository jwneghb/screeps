module.exports = {
    setup: setup
};

const MS = 'RESLv2';

function setup () {
    if (!Memory[MS]) Memory[MS] = {};
    if (!Memory[MS].levels) Memory[MS].levels = {};
    if (!Memory[MS].structRooms) {
        Memory[MS].structRooms = {};
        Memory[MS].lastGC = Game.time;
    }


    StructureLink.prototype.xsetLevels = (s) => stringLevels(this, s);
    StructureContainer.prototype.xsetLevels = (s) => stringLevels(this, s);

    StructureTerminal.prototype.xsetLevels = (s) => stringLevels(this, s);
    StructureLab.prototype.xsetLevels = (s) => stringLevels(this, s);

    StructureLink.prototype.xgetLevels = getLevels;
    StructureContainer.prototype.xgetLevels = getLevels;

    StructureTerminal.prototype.xgetLevels = getLevels;
    StructureLab.prototype.xgetLevels = getLevels;
}

const levelTypes = [
    STRUCTURE_LINK, STRUCTURE_SPAWN, STRUCTURE_EXTENSION,
    STRUCTURE_CONTAINER, STRUCTURE_TERMINAL,
    STRUCTURE_LAB
];

function getLevels(structure) {
    let type = structure.structureType;
    if (levelTypes.indexOf(type) < 0) return undefined;

    if (type == STRUCTURE_LINK || type == STRUCTURE_SPAWN || type == STRUCTURE_EXTENSION) {
        return getLevels_energy(structure);
    } else if (type == STRUCTURE_TERMINAL || type == STRUCTURE_CONTAINER) {
        return getLevels_store(structure);
    } else if (type == STRUCTURE_LAB) {
        return getLevels_lab(structure);
    }
}

function getLevels_lab(lab) {
    var ret = {};
    let levels = Memory[MS].levels[lab.id];

    if (!levels || !levels[RESOURCE_ENERGY]) {
        ret[RESOURCE_ENERGY] = {min: 0, max: lab.energyCapacity, cur: lab.energy};
    }

    if (levels && levels[RESOURCE_ENERGY]) {
        ret[RESOURCE_ENERGY] = {min: levels[RESOURCE_ENERGY].min, max: levels[RESOURCE_ENERGY].max, cur: lab.energy};
    }

    if (!levels) {
        if (lab.mineralType) {
            ret[lab.mineralType] = {min: 0, max: lab.mineralCapacity, cur: lab.mineralAmount};
        }
    } else {
        let levelmineral = null;
        for (let res in levels) {
            if (res != RESOURCE_ENERGY) levelmineral = res;
        }
        if (levelmineral) {
            if (lab.mineralType && lab.mineralType != levelmineral) {
                ret[lab.mineralType] = {min: 0, max: 0, cur: lab.mineralAmount};
            } else {
                ret[levelmineral] = {min: levels[levelmineral].min, max: levels[levelmineral].max, cur: lab.mineralAmount};
            }
        } else {
            ret[lab.mineralType] = {min: 0, max: lab.mineralCapacity, cur: lab.mineralAmount};
        }
    }

    return ret;
}

function getLevels_store(structure) {
    var ret = {};
    let levels = Memory[MS].levels[structure.id];
    if (!levels) {
        ret[RESOURCE_ENERGY] = {min: 0, max: structure.storeCapacity, cur: structure.store[RESOURCE_ENERGY] || 0};
    } else {
        for (let res in levels) {
            ret[res] = {min: levels[res].min, max: levels[res].max, cur: structure.store[res] || 0};
        }
    }
    for (let res in structure.store) {
        if (!ret[res]) {
            ret[res] = {min: 0, max: 0, cur: structure.store[res]};
        }
    }
    return ret;
}

function getLevels_energy(structure) {
    var ret = {};
    ret[RESOURCE_ENERGY] = {min: 0, max: structure.energyCapacity};

    let levels = Memory[MS].levels[structure.id];
    if (levels && levels[RESOURCE_ENERGY]) {
        if (levels[RESOURCE_ENERGY].hasOwnProperty('min')) ret[RESOURCE_ENERGY].min = levels[RESOURCE_ENERGY].min;
        if (levels[RESOURCE_ENERGY].hasOwnProperty('max')) ret[RESOURCE_ENERGY].max = levels[RESOURCE_ENERGY].max;
    }

    ret[RESOURCE_ENERGY].current = structure.energy;

    return ret;
}

function stringLevels(structure, levels) {
    let type = structure.structureType;

    if (levelTypes.indexOf(type) < 0) return false;

    if (levels === undefined || !_.isString(levels)) return setLevels(structure, levels, type);
    var single = levels.split(';');

    var cap_energy = structure.store ? structure.storeCapacity : structure.energyCapacity || 0;
    var cap_other = type == STRUCTURE_LAB ? structure.mineralCapacity : structure.storeCapacity || 0;

    var mLevels = [];

    for (let i = 0; i < single.length; ++i) {
        var parts = single[i].split('/');
        if (parts.length < 3) return false;
        if (RESOURCES_ALL.indexOf(parts[0]) < 0) return false;
        let min, max;
        if (parts[1].endsWith('%')) {
            min = parseFloat(parts[1].substr(0, parts[1].length-1));
            if (_.isNan(min)) return false;
            if (parts[0] == RESOURCE_ENERGY) {
                min = Math.floor(min / 100 * cap_energy);
            } else {
                min = Math.floor(min / 100 * cap_other);
            }
        } else {
            min = parseInt(parts[1]);
            if (_.isNan(min)) return false;
        }
        if (parts[2].endsWith('%')) {
            max = parseFloat(parts[2].substr(0, parts[2].length-1));
            if (_.isNan(max)) return false;
            if (parts[0] == RESOURCE_ENERGY) {
                max = Math.floor(max / 100 * cap_energy);
            } else {
                max = Math.floor(max / 100 * cap_other);
            }
        } else {
            max = parseInt(parts[2]);
            if (_.isNan(max)) return false;
        }
        mLevels.push({res: parts[0], min: min, max: max});
    }
    return setLevels(structure, mLevels, type);
}

function setLevels(structure, levels, type) {
    if (structure === undefined) return false;

    if (levels === undefined) {
        delete Memory[MS].levels[structure.id];
        delete Memory[MS].structRooms[structure.id];
        return true;
    }

    if (type == STRUCTURE_LINK || type == STRUCTURE_SPAWN || type == STRUCTURE_EXTENSION) {
        if (levels.length > 1) return false;
        return setLevel_energy(structure, levels);
    } else if (type == STRUCTURE_TERMINAL || type == STRUCTURE_CONTAINER) {
        return setLevels_store(structure, levels);
    } else if (type == STRUCTURE_LAB) {
        return setLevels_lab(structure, levels);
    }

    return false;
}

function setLevels_lab(lab, levels) {
    if (levels.length > 2) return false;

    for (let i = 0; i < levels.levels; ++i) {
        if (!levels[i].hasOwnProperty('res')) return false;
        if (!levels[i].hasOwnProperty('min')) return false;
        if (!levels[i].hasOwnProperty('max')) return false;
        if (RESOURCES_ALL.indexOf(levels[i].res) < 0) return false;
        if (levels[i].min < 0) return false;
        if (levels[i].res == RESOURCE_ENERGY) {
            if (levels[i].max > lab.energyCapacity) return false;
        } else {
            if (levels[i].max > lab.mineralCapacity) return false;
        }
        if (levels[i].min > levels[i].max) return false;
    }

    let mLevels = {};

    if (levels.length == 2) {
        if (levels[0].res == levels[1].res) return false;
        if (levels[0].res != RESOURCE_ENERGY && levels[1].res != RESOURCE_ENERGY) return false;
    } else {
        let prev = Memory[MS].levels[lab.id];
        if (prev) {
            if (levels[0].res == RESOURCE_ENERGY) {
                for (var res in Object.keys(prev)) {
                    if (res != RESOURCE_ENERGY) {
                        if (!prev[res].hasOwnProperty('min')) continue;
                        if (!prev[res].hasOwnProperty('max')) continue;
                        mLevels[res] = {min: prev[res].min, max: prev[res].max};
                        break;
                    }
                }
            } else {
                for (var res in Object.keys(prev)) {
                    if (res == RESOURCE_ENERGY) {
                        if (!prev[res].hasOwnProperty('min')) continue;
                        if (!prev[res].hasOwnProperty('max')) continue;
                        mLevels[res] = {min: prev[res].min, max: prev[res].max};
                        break;
                    }
                }
            }
        }
    }


    for (let i = 0; i < levels.levels; ++i) {
        mLevels[levels[i].res] = {min: levels[i].min, max: levels[i].max};
    }

    Memory[MS].levels[lab.id] = mLevels;
    Memory[MS].structRooms[lab.id] = lab.room.name;
}

function setLevels_store(structure, levels) {
    let n = levels.length;
    let mlevels = {};

    let max_total = 0;
    for (var i = 0; i < n; ++i) {
        if (!levels[i].hasOwnProperty('res')) return false;
        if (!levels[i].hasOwnProperty('max')) return false;
        if (!levels[i].hasOwnProperty('min')) return false;
        let res = levels[i].res;
        if (mlevels.hasOwnProperty(res)) return false;
        if (RESOURCES_ALL.indexOf(res) < 0) return false;
        let max = levels[i].max;
        max_total += max;
        if (max_total > structure.storeCapacity) return false;
        let min = levels[i].min;
        if (min < 0) return false;
        if (min > max) return false;
        mlevels[levels[i]] = {min: min, max: max};
    }

    Memory[MS].levels[structure.id] = mlevels;
    Memory[MS].structRooms[structure.id] = structure.room.name;
    return true;
}

function setLevel_energy(structure, level) {
    if (!level.hasOwnProperty('res')) return false;
    if (level.res != RESOURCE_ENERGY) return false;
    if (!level.hasOwnProperty('min')) return false;
    if (level.min < 0) return false;
    if (!level.hasOwnProperty('max')) return false;
    if (level.max > structure.energyCapacity) return false;
    if (level.min > level.max) return false;

    Memory[MS].levels[structure.id] = {};
    Memory[MS].levels[structure.id][RESOURCE_ENERGY] = {min: level.min, max: level.max};
    Memory[MS].structRooms[structure.id] = structure.room.name;
    return true;
}