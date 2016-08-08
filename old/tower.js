module.exports = {
    run: function(tower) {
        var closestHealable = tower.pos.findClosestByPath(FIND_MY_CREEPS, {filter: (c) => c.hits < c.hitsMax * 0.9});
        var closestEnemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestEnemy && doattack(closestEnemy)) {
            if (closestHealable) {
                if (Math.random() > 0.7) {
                    tower.heal(closestHealable);
                } else {
                    tower.attack(closestEnemy);
                }
            } else {
                tower.attack(closestEnemy);
            }
        } else {
            if (closestHealable) {
                tower.heal(closestHealable);
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