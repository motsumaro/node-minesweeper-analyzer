"use strict";
var compareNumber = function (a, b) { return a - b; };
// 領域と地雷数の組
var Hint = /** @class */ (function () {
    function Hint(area, min, max) {
        if (max === void 0) { max = min; }
        var area_ = [];
        f1: for (var _i = 0, area_1 = area; _i < area_1.length; _i++) {
            var position = area_1[_i];
            position = Math.floor(position);
            if (!isFinite(position) || position < 0)
                throw new Error("Invalid position");
            for (var _a = 0, area_2 = area_; _a < area_2.length; _a++) {
                var position_ = area_2[_a];
                if (position === position_)
                    continue f1;
            }
            area_.push(position);
        }
        this.area = area_.sort(compareNumber);
        this.breadth = area_.length;
        this.min = Math.max(Math.floor(min), 0);
        if (!isFinite(this.min))
            throw new Error("Invalid min");
        this.max = Math.min(Math.floor(max), this.breadth);
        if (!isFinite(this.max))
            throw new Error("Invalid max");
    }
    Hint.prototype.equals = function (another) {
        if (this.min !== another.min || this.max !== another.max || this.breadth !== another.breadth)
            return false;
        for (var i = 0; i < this.breadth; i++)
            if (this.area[i] !== another.area[i])
                return false;
        return true;
    };
    Hint.prototype.clone = function () {
        return new Hint(this.area, this.min, this.max);
    };
    // このHintに合致する地雷の配置パターンが存在するか
    Hint.prototype.isValid = function () {
        return this.min <= this.max;
    };
    // area内のある一部分が持ちうる地雷数
    Hint.prototype.partMin = function (partBreadth) { return Math.max(this.min - (this.breadth - partBreadth), 0); };
    Hint.prototype.partMax = function (partBreadth) { return Math.min(this.max, partBreadth); };
    // area系メソッドは全てデータが昇順であることが前提
    // areaが交差するか
    Hint.areaCrossing = function (area1, area2) {
        var i = 0, j = 0, breadth1 = area1.length, breadth2 = area2.length;
        while (i < breadth1 && j < breadth2) {
            var a = area1[i], b = area2[j];
            if (a === b)
                return true;
            else if (a < b)
                i++;
            else
                j++;
        }
        return false;
    };
    // 和集合（破壊的）
    Hint.areaCombine = function (area1, area2) {
        var i = 0, j = 0, breadth1 = area1.length, breadth2 = area2.length;
        while (j < breadth2) {
            var a = area1[i], b = area2[j];
            if (i >= breadth1 || a > b) {
                // area1にbを挿入
                for (var k = breadth1 - 1; k >= i; k--)
                    area1[k + 1] = area1[k];
                area1[i] = b;
                i++;
                breadth1++;
                j++;
            }
            else if (a === b) {
                i++;
                j++;
            }
            else {
                i++;
            }
        }
        return area1;
    };
    // 共通部分
    Hint.areaIntersection = function (area1, area2) {
        var result = null;
        var i = 0, j = 0, breadth1 = area1.length, breadth2 = area2.length;
        while (i < breadth1 && j < breadth2) {
            var a = area1[i], b = area2[j];
            if (a === b) {
                if (result)
                    result.push(a);
                else
                    result = [a];
                i++;
                j++;
            }
            else if (a < b) {
                i++;
            }
            else {
                j++;
            }
        }
        return result;
    };
    // 差集合
    Hint.areaDifference = function (area1, area2) {
        var result = null;
        var i = 0, j = 0, breadth1 = area1.length, breadth2 = area2.length;
        while (i < breadth1) {
            var a = area1[i], b = area2[j];
            if (j >= breadth2 || a < b) {
                if (result)
                    result.push(a);
                else
                    result = [a];
                i++;
            }
            else if (a === b) {
                i++;
                j++;
            }
            else {
                j++;
            }
        }
        return result;
    };
    // 共通部分を持つ2つのhintから新たなhintを生成
    Hint.solve = function (hint1, hint2) {
        var intersection = Hint.areaIntersection(hint1.area, hint2.area);
        if (!intersection)
            return null;
        var iBreadth = intersection.length;
        var iMax1 = hint1.partMax(iBreadth), iMin1 = hint1.partMin(iBreadth);
        var iMax2 = hint2.partMax(iBreadth), iMin2 = hint2.partMin(iBreadth);
        if (iMax1 === iMax2 && iMin1 === iMin2) {
            // 交差部分はあるが新たな情報が得られない場合
            if (iBreadth === hint2.breadth)
                return { newHints: [], hint1removable: false, hint2removable: true };
            if (iBreadth === hint1.breadth)
                return { newHints: [], hint1removable: true, hint2removable: false };
            return null;
        }
        var newHints = []; // 新たなhint
        var hint1removable = false;
        var hint2removable = false;
        // 交差部分
        var iHint = new Hint(intersection, Math.max(iMin1, iMin2), Math.min(iMax1, iMax2));
        if (iHint.equals(hint1)) {
            if (iHint.min === iHint.max)
                hint2removable = true;
        }
        else if (iHint.equals(hint2)) {
            if (iHint.min === iHint.max)
                hint1removable = true;
        }
        else {
            newHints.push(iHint);
            if (iHint.min === iHint.max)
                hint1removable = hint2removable = true;
            if (iHint.breadth === hint1.breadth)
                hint1removable = true;
            if (iHint.breadth === hint2.breadth)
                hint2removable = true;
        }
        // 差部分（新情報の場合のみ）
        if (iMin1 < iHint.min || iHint.max < iMax1) {
            var difference = Hint.areaDifference(hint1.area, intersection);
            if (difference) {
                var dHint = new Hint(difference, hint1.min - iHint.max, hint1.max - iHint.min);
                newHints.push(dHint);
                if (dHint.min === dHint.max)
                    hint1removable = true;
            }
        }
        if (iMin2 < iHint.min || iHint.max < iMax2) {
            var difference = Hint.areaDifference(hint2.area, intersection);
            if (difference) {
                var dHint = new Hint(difference, hint2.min - iHint.max, hint2.max - iHint.min);
                newHints.push(dHint);
                if (dHint.min === dHint.max)
                    hint2removable = true;
            }
        }
        return { newHints: newHints, hint1removable: hint1removable, hint2removable: hint2removable };
    };
    return Hint;
}());
module.exports = Hint;
