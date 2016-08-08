module.exports = {
    perimeter: {
        W42N24: function (x, y) {
            if (x <= 19 && y <= 42) return true;
            if (x <= 28 && y <= 34) return true;
            if (x <= 45 && y <= 24) return true;
            if (y <= 19) return true;
            return false;
        }
    }
};