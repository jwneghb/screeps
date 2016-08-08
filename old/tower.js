var book_keeping = require('book_keeping');

module.exports = {
    run: function(tower) {
        var enemies = tower.room.find(FIND_HOSTILE_CREEPS, {filter: (c) => c.owner.username != 'DoctorPC'});
        if (enemies.length > 0) {
            tower.attack(enemies[0]);
        }

        var closestHealable = tower.pos.findClosestByPath(FIND_MY_CREEPS, {filter: (c) => c.hits < c.hitsMax * 0.9});
        var closestEnemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestEnemy && doattack(closestEnemy)) {
            if (closestHealable) {
                if (Math.random() > 0.7) {
                    if (tower.heal(closestHealable) == OK) {
                        book_keeping.expense(book_keeping.TOWER_ATTACK, 10);
                    }
                } else {
                    if (tower.attack(closestEnemy) == OK) {
                        book_keeping.expense(book_keeping.TOWER_ATTACK, 10);
                    }
                }
            } else {
                if (tower.attack(closestEnemy) == OK) {
                    book_keeping.expense(book_keeping.TOWER_ATTACK, 10);
                }
            }
        } else {
            if (closestHealable) {
                if (tower.heal(closestHealable) == OK) {
                    book_keeping.expense(book_keeping.TOWER_ATTACK, 10);
                }
            }
        }
    }
};

function doattack(target) {
    if (target.owner.username == 'DoctorPC') {
        if (target.pos.y > 45  || target.pos.x > 22) {
            return false;
        }
    }
    return true;
}