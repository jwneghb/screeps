var tools = require('tools');

module.exports = {
    run: execute
}

function execute (room) {
    if (!Memory.tower) Memory.tower = {};
    if (!Memory.tower[room.name]) Memory.tower[room.name] = {};

    var enemies = room.find(FIND_HOSTILE_CREEPS, {filter: (c) => !isExcempt(c)});
    var towers = room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER});

    if (enemies.length > 0) {

        var selected_enemy = null;
        if (Memory.tower[room.name].previous_enemy) {
            for (var i = 0; i < enemies; ++i) {
                if (enemy_ids[i] == Memory.tower[room.name].previous_enemy) {
                    selected_enemy = enemies[i];
                    break;
                }
            }
        }

        if (!selected_enemy) {
            var healers = _.filter(enemies, (e) => isHealer(e));
            let idx = tools.mindex(healers, {u: (c) => c.hits});
            if (idx >= 0) {
                selected_enemy = healers[idx];
            }
        }

        if (!selected_enemy) {
            var attackers = _.filter(enemies, (e) => isAttacker(e));
            let idx = tools.mindex(attackers, {u: (c) => c.hits});
            if (idx >= 0) {
                selected_enemy = healers[idx];
            }
        }

        if (!selected_enemy) {
            let idx = tools.mindex(enemies, {u: (c) => c.hits});
            if (idx >= 0) {
                selected_enemy = healers[idx];
            }
        }

        if (selected_enemy) {
            Memory.tower[room.name].previous_enemy = selected_enemy.id;

            //var need_hea = tower.pos.findClosestByPath(FIND_MY_CREEPS, {filter: (c) => c.hits < c.hitsMax * 0.6});

            for (var i = 0; i < towers.length; ++i) {
                /*if (closestHealable && Math.random() > 0.7) {
                    towers[i].heal(closestHealable);
                } else {

                }*/
                towers[i].attack(selected_enemy);
            }
        }
    }
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

const exceptions = {
    W42N24: function (creep) {
        if (creep.owner.username == 'DoctorPC') {
            return creep.pos.y > 45  || creep.pos.x > 22 || (creep.pos.y < 29 && creep.pos.x >18) || creep.pos.y < 18;
        } else {
            return false;
        }
    }
}