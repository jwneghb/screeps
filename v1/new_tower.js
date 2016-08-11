var tools = require('tools');

module.exports = {
    run: execute
}

function execute (room) {

    var enemies = room.find(FIND_HOSTILE_CREEPS, {filter: (c) => !isExcempt(c)});
    var towers = room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER});

    if (enemies.length > 0) {

        for (var i = 0; i < towers.length; ++i) {
            towers[i].attack(enemies[0]);
        }
    }
}

function find_healable(room) {
    var need_heal = room.find(FIND_MY_CREEPS, {filter: (c) => c.hits < c.hitsMax * 0.8});
    var idx = tools.mindex(need_heal, {u: (c) => c.hits})
    var lowest = null;
    if (idx >= 0) lowest = idx;
    return lowest;
}

function isAttacker(creep) {
    for (var i = 0; i < creep.body.length; ++i) {
        if (creep.body[i].type == ATTACK || creep.body[i].type == RANGED_ATTACK) {
            return true;
        }
    }
    return false;
}

function isHealer(creep) {
    for (var i = 0; i < creep.body.length; ++i) {
        if (creep.body[i].type == HEAL) {
            return true;
        }
    }
    return false;
}

function isExcempt(creep) {
    if (!exceptions[creep.room.name]) return false;
    return exceptions[creep.room.name](creep);
}

var exceptions = {
    W42N24: function (creep) {
        if (creep.owner.username == 'DoctorPC') {
            if (creep.pos.y > 45  || creep.pos.x > 22 || (creep.pos.y < 29 && creep.pos.x >18) || creep.pos.y < 18) return true;
        }
        return false;
    },
    W42N25: function (creep) {
        return creep.owner.username == 'DoctorPC';

    }
};