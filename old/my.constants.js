module.exports = {
    perimeter: {
        W42N24: function (x, y) {
            if (x <= 19 && y <= 43) return true;
            if (x <= 45 && y <= 40) return true;
            if (y <= 19) return true;
            return false;
        }
    }
};