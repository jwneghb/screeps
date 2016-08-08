module.exports = {
    income: income,
    expense: expense,
    CREATE_CREEP: 'create_creep',
    UPGRADE_CONTROLLER: 'upgrade_controller',
    TOWER_ATTACK: 'tower_attack',
    TOWER_HEAL: 'tower_heal'
};

function period(time) {
    return Math.floor(time / 1000);
}

function getCurrent() {
    if (!Memory.book_keeping) {
        Memory.book_keeping = {
            previous_periods: []
        }
    }

    var cur = Memory.book_keeping.current_period;
    if (!cur) {
        Memory.book_keeping.current_period = {start: Game.time, resources: {}, expenses: {}};
    }
    cur = Memory.book_keeping.current_period;

    if (period(Game.time) > period(cur.start)) {
        cur.end = Game.time;
        Memory.book_keeping.previous_periods.push(cur);
        cur = {start: Game.time, resources: {}, expenses: {}};
    }

    return cur;
}

function income(resource_type, amount) {
    var cur = getCurrent();

    if (cur.resources[resource_type] === undefined) {
        cur.resources[resource_type] = amount;
    } else {
        cur.resources[resource_type] += amount;
    }
}

function expense(expense_type, amount) {
    var cur = getCurrent();
    if (cur.expenses[expense_type] === undefined) {
        cur.expenses[expense_type] = amount;
    } else {
        cur.expenses[expense_type] += amount;
    }
    if (cur.expenses['TOTAL'] === undefined) {
        cur.expenses['TOTAL'] = amount;
    } else {
        cur.expenses['TOTAL'] += amount;
    }
}