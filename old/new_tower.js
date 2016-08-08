var tools = require('tools');
var book_keeping = require('book_keeping');

module.exports = {
    run: execute
}

function execute (room) {
    if (!Memory.tower) Memory.tower = {};
    if (!Memory.tower[room.name]) Memory.tower[room.name] = { previous_enemy: null, war_time: 0 };

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
            Memory.tower[room.name].war_time = Game.time;

            var lowest = find_healable(room);

            for (var i = 0; i < towers.length; ++i) {
                if (lowest && ((lowest.hits < lowest.hitsMax * 0.25) || Math.random() > 0.7)) {
                    if (towers[i].heal(lowest) == OK) {
                        book_keeping.expense(book_keeping.TOWER_HEAL, 10);
                    }
                } else {
                    if (towers[i].attack(selected_enemy) == OK) {
                        book_keeping.expense(book_keeping.TOWER_ATTACK, 10);
                    }
                }
            }
        }
    } else if (Memory.tower[room.name].war_time > Game.time - 60) {
        var lowest = find_healable(room);
        for (var i = 0; i < towers.length; ++i) {
            if (lowest) {
                if (towers[i].heal(lowest) == OK) {
                    book_keeping.expense(book_keeping.TOWER_HEAL, 10);
                }
            }
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

const exceptions = {
    W42N24: function (creep) {
        if (creep.owner.username == 'DoctorPC') {
            return creep.pos.y > 45  || creep.pos.x > 22 || (creep.pos.y < 29 && creep.pos.x >18) || creep.pos.y < 18;
        } else {
            return false;
        }
    }
}