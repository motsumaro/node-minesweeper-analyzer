"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var hint_1 = __importDefault(require("./hint"));
function cartesianProduct() {
    var x = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        x[_i] = arguments[_i];
    }
    if (x.length === 0)
        return [[]];
    var result = [];
    var latters = cartesianProduct.apply(void 0, x.slice(1));
    for (var _a = 0, _b = x[0]; _a < _b.length; _a++) {
        var first = _b[_a];
        for (var _c = 0, latters_1 = latters; _c < latters_1.length; _c++) {
            var latter = latters_1[_c];
            result.push([first].concat(latter));
        }
    }
    return result;
}
// ProbabilityMapにProbabilityMapPartを統合する
function attachProbabilityMapPart(map, part) {
    // 既存のpartと地雷数が一致すればそこに統合
    for (var _i = 0, map_1 = map; _i < map_1.length; _i++) {
        var existingPart = map_1[_i];
        if (existingPart.minesNumber === part.minesNumber) {
            existingPart.patternsNumber += part.patternsNumber;
            var k = part.patternsNumber / existingPart.patternsNumber; // 確率は重み付きで結合
            for (var position in existingPart.map)
                existingPart.map[position] = (1 - k) * existingPart.map[position] + k * (part.map[position] || 0);
            for (var position in part.map)
                if (!(position in existingPart.map))
                    existingPart.map[position] = k * part.map[position];
            return;
        }
        else if (existingPart.minesNumber > part.minesNumber) {
            break;
        }
    }
    // 無ければ追加(mapはminesNumber順)
    var l = map.length;
    var target = 0;
    while (target < l && map[target].minesNumber < part.minesNumber)
        target++;
    for (var i = l - 1; i >= target; i--)
        map[i + 1] = map[i];
    map[target] = part;
}
function binomial(n, r) {
    r = Math.min(r, n - r);
    if (r < 0)
        return 0;
    var x = 1;
    for (var i = 0; i < r; i++) {
        x *= n - r + 1 + i;
        x /= i + 1;
    }
    return x;
}
var Analyzer = /** @class */ (function () {
    function Analyzer() {
        this._hints = [];
        this._valid = true;
        this._probabilityMap = null;
        this._removedHints = [];
        this._coveredArea = [];
        this._wholeAreaHint = null;
    }
    Analyzer.prototype.isValid = function () { return this._valid; };
    Analyzer.prototype.clone = function () {
        var analyzer = new Analyzer();
        analyzer._hints = this._hints.map(function (hint) { return hint.clone(); });
        analyzer._valid = this._valid;
        analyzer._probabilityMap = this._probabilityMap;
        analyzer._removedHints = this._removedHints.map(function (hint) { return hint.clone(); });
        analyzer._coveredArea = this._coveredArea.slice();
        analyzer._wholeAreaHint = this._wholeAreaHint && this._wholeAreaHint.clone();
        return analyzer;
    };
    // 新たな情報を追加し整理する（戻り値:情報の整合性が保たれているか）
    Analyzer.prototype.add = function (area, min, max) {
        if (max === void 0) { max = min; }
        return this._addHint(new hint_1.default(area, min, max));
    };
    Analyzer.prototype.addR = function (area_from, area_to, min, max) {
        if (max === void 0) { max = min; }
        // 連番領域
        if (!isFinite(area_from) || !isFinite(area_to))
            throw new Error("Invalid area range");
        var area = [];
        if (area_from < area_to) {
            for (var i = area_from; i <= area_to; i++)
                area.push(i);
        }
        else {
            for (var i = area_from; i >= area_to; i--)
                area.push(i);
        }
        return this._addHint(new hint_1.default(area, min, max));
    };
    Analyzer.prototype._addHint = function (hint, noCheckWholeArea) {
        if (noCheckWholeArea === void 0) { noCheckWholeArea = false; }
        if (!this._valid)
            return false;
        if (hint.breadth === 0)
            return true;
        if (!hint.isValid()) {
            this._hints.push(hint);
            return this._valid = false;
        }
        for (var _i = 0, _a = this._removedHints; _i < _a.length; _i++) {
            var removedHint = _a[_i];
            if (hint.equals(removedHint))
                return true;
        }
        // 空地確定、地雷確定の領域の情報は1マスごとに分割
        if (hint.breadth > 1 && hint.min === 0 && hint.max === 0) {
            for (var _b = 0, _c = hint.area; _b < _c.length; _b++) {
                var position = _c[_b];
                if (!this._addHint(new hint_1.default([position], 0)))
                    return false;
            }
            return true;
        }
        else if (hint.breadth > 1 && hint.min === hint.breadth && hint.max === hint.breadth) {
            for (var _d = 0, _e = hint.area; _d < _e.length; _d++) {
                var position = _e[_d];
                if (!this._addHint(new hint_1.default([position], 1)))
                    return false;
            }
            return true;
        }
        this._probabilityMap = null; // キャッシュを削除
        // 既存のhintと合成する
        if (!noCheckWholeArea) {
            if (this._hints.length >= 2) {
                // 他の全てのhintの領域を含むhintはwholeAreaHintとして特別扱い
                if (this._wholeAreaHint) {
                    if (hint.breadth > this._wholeAreaHint.breadth && hint_1.default.areaInclude(this._wholeAreaHint.area, hint.area)) {
                        // 交代
                        var old = this._wholeAreaHint;
                        this._wholeAreaHint = hint;
                        hint_1.default.areaCombine(this._coveredArea, hint.area);
                        return this._addHint(old);
                    }
                    else if (!hint_1.default.areaInclude(hint.area, this._wholeAreaHint.area)) {
                        // wholeArea条件を満たさなくなったため普通のhintに降格
                        var old = this._wholeAreaHint;
                        this._wholeAreaHint = null;
                        if (!this._addHint(old))
                            return false;
                    }
                }
                else {
                    var canBeWholeAreaHint = true;
                    for (var _f = 0, _g = this._hints; _f < _g.length; _f++) {
                        var existedHint = _g[_f];
                        if (!hint_1.default.areaInclude(existedHint.area, hint.area)) {
                            canBeWholeAreaHint = false;
                            break;
                        }
                    }
                    if (canBeWholeAreaHint) {
                        this._wholeAreaHint = hint;
                        hint_1.default.areaCombine(this._coveredArea, hint.area);
                        return true;
                    }
                }
            }
            else if (this._hints.length === 1) {
                var existedHint = this._hints[0];
                if (hint_1.default.areaInclude(existedHint.area, hint.area)) {
                    this._wholeAreaHint = hint;
                    hint_1.default.areaCombine(this._coveredArea, hint.area);
                    return true;
                }
                else if (hint_1.default.areaInclude(hint.area, existedHint.area)) {
                    this._wholeAreaHint = existedHint;
                    this._hints[0] = hint;
                    return true;
                }
            }
        }
        var addHintsList = []; // 追加予約リスト
        var notPushNewHint = false;
        for (var i = 0; i < this._hints.length; i++) {
            var existedHint = this._hints[i];
            var resolveResult = hint_1.default.solve(hint, existedHint);
            if (!resolveResult)
                continue;
            if (!notPushNewHint)
                addHintsList.push.apply(addHintsList, resolveResult.newHints);
            if (resolveResult.hint2removable)
                this._removedHints.push(this._hints.splice(i--, 1)[0]);
            if (resolveResult.hint1removable)
                notPushNewHint = true;
        }
        hint_1.default.areaCombine(this._coveredArea, hint.area);
        if (notPushNewHint)
            this._removedHints.push(hint);
        else
            this._hints.push(hint);
        for (var _h = 0, addHintsList_1 = addHintsList; _h < addHintsList_1.length; _h++) {
            var addHint = addHintsList_1[_h];
            if (!this._addHint(addHint))
                return false;
        }
        return true;
    };
    // 現在のhintを[空地確定,地雷確定,独立領域1,独立領域2...]の形に分類する
    Analyzer.prototype._classifyHints = function () {
        var _a;
        var dividedHints = [[], []]; // 0と1は確定hint
        var dividedAreas = [0, 0];
        var dividedLength = 2;
        var restArea = this._coveredArea.slice();
        // 仮分割
        loop_hint: for (var _i = 0, _b = this._hints; _i < _b.length; _i++) {
            var hint = _b[_i];
            if (restArea)
                restArea = hint_1.default.areaDifference(restArea, hint.area);
            // 確定マス
            if (hint.breadth === 1 && hint.min === hint.max) {
                dividedHints[hint.min /* 0 or 1 */].push(hint);
                continue;
            }
            // 既存の仮分割領域との交差判定
            for (var i = 2; i < dividedLength; i++) {
                if (hint_1.default.areaCrossing(hint.area, dividedAreas[i])) {
                    dividedHints[i].push(hint);
                    hint_1.default.areaCombine(dividedAreas[i], hint.area);
                    continue loop_hint;
                }
            }
            // 新たな仮分割領域を生成
            dividedHints.push([hint]);
            dividedAreas.push(hint.area.slice());
            dividedLength++;
        }
        // 仮分割領域を統合
        for (var i = 2; i < dividedLength - 1; i++) {
            for (var j = i + 1; j < dividedLength; j++) {
                if (hint_1.default.areaCrossing(dividedAreas[i], dividedAreas[j])) {
                    (_a = dividedHints[i]).push.apply(_a, dividedHints[j]);
                    hint_1.default.areaCombine(dividedAreas[i], dividedAreas[j]);
                    dividedHints.splice(j, 1);
                    dividedAreas.splice(j, 1);
                    j = i + 1; // 統合したことで一度飛ばした領域と交差する可能性があるため再走査
                    dividedLength--;
                }
            }
        }
        if (restArea && !this._wholeAreaHint)
            dividedHints.push([new hint_1.default(restArea, 0, restArea.length)]);
        return dividedHints;
    };
    // 地雷数別確率Mapを求める
    Analyzer.prototype._calculateProbabilityMap = function (depth) {
        if (depth === void 0) { depth = 0; }
        var _a;
        if (!this._valid)
            return [];
        // 各エリアごとにProbabilityMapを算出
        var dividedHints = this._classifyHints();
        var areaProbabilityMaps = [];
        for (var i = 2, l = dividedHints.length; i < l; i++) {
            var hints = dividedHints[i];
            var areaProbabilityMap = [];
            areaProbabilityMaps.push(areaProbabilityMap);
            if (hints.length === 1) {
                // 単一ヒントの場合はAnalyzerを用いずに直接ProbabilityMapを生成する
                var hint = hints[0];
                for (var minesNumber = hint.min; minesNumber <= hint.max; minesNumber++) {
                    var map = {};
                    for (var _i = 0, _b = hint.area; _i < _b.length; _i++) {
                        var position = _b[_i];
                        map[position] = minesNumber / hint.breadth;
                    }
                    attachProbabilityMapPart(areaProbabilityMap, { minesNumber: minesNumber, patternsNumber: binomial(hint.breadth, minesNumber), map: map });
                }
            }
            else {
                // 最も領域が広いhint
                var widestHint = hints[0];
                for (var _c = 0, hints_1 = hints; _c < hints_1.length; _c++) {
                    var hint = hints_1[_c];
                    if (hint.breadth > widestHint.breadth)
                        widestHint = hint;
                }
                // widestHintと交差する別のhint
                var crossHint = hints[0];
                var intersection = undefined;
                for (var _d = 0, hints_2 = hints; _d < hints_2.length; _d++) {
                    var hint = hints_2[_d];
                    if (hint === widestHint)
                        continue;
                    var intersection_ = hint_1.default.areaIntersection(widestHint.area, hint.area);
                    if (intersection_) {
                        crossHint = hint;
                        intersection = intersection_;
                        break;
                    }
                }
                // intersectionまたはdifferenceの狭いほうの地雷数を仮定する→次ループでhintが1つ減る
                var difference = hint_1.default.areaDifference(crossHint.area, intersection);
                var keyArea = void 0;
                var keyAreaMax = void 0;
                var keyAreaMin = void 0;
                if (difference === null) {
                    // crossHint.areaがwidestHint.areaに含まれている場合
                    keyArea = intersection.length < widestHint.breadth / 2 ?
                        intersection : hint_1.default.areaDifference(widestHint.area, intersection);
                    keyAreaMin = widestHint.partMin(keyArea.length);
                    keyAreaMax = widestHint.partMax(keyArea.length);
                }
                else {
                    keyArea = intersection.length < difference.length ? intersection : difference;
                    keyAreaMin = crossHint.partMin(keyArea.length);
                    keyAreaMax = crossHint.partMax(keyArea.length);
                }
                var space = "";
                for (var i_1 = 0; i_1 < depth; i_1++)
                    space += " ";
                for (var i_2 = keyAreaMin; i_2 <= keyAreaMax; i_2++) {
                    var analyzer = new Analyzer();
                    (_a = analyzer._hints).push.apply(_a, hints);
                    analyzer._addHint(new hint_1.default(keyArea, i_2), true); // 場合分けの仮定
                    for (var _e = 0, _f = analyzer._calculateProbabilityMap(depth + 1); _e < _f.length; _e++) {
                        var part = _f[_e];
                        attachProbabilityMapPart(areaProbabilityMap, part);
                    }
                }
            }
        }
        // 各エリアの地雷数の組み合わせを列挙
        var result = [];
        for (var _g = 0, _h = cartesianProduct.apply(void 0, areaProbabilityMaps); _g < _h.length; _g++) {
            var selection = _h[_g];
            var minesNumber = dividedHints[1].length;
            var patternsNumber = 1;
            var map = {};
            for (var _j = 0, _k = dividedHints[0]; _j < _k.length; _j++) {
                var hint = _k[_j];
                map[hint.area[0]] = 0;
            } // 空地確定マス
            for (var _l = 0, _m = dividedHints[1]; _l < _m.length; _l++) {
                var hint = _m[_l];
                map[hint.area[0]] = 1;
            } // 地雷確定マス
            for (var _o = 0, selection_1 = selection; _o < selection_1.length; _o++) {
                var part = selection_1[_o];
                minesNumber += part.minesNumber;
                patternsNumber *= part.patternsNumber;
                for (var position in part.map)
                    map[position] = part.map[position];
            }
            attachProbabilityMapPart(result, { minesNumber: minesNumber, patternsNumber: patternsNumber, map: map });
        }
        return result;
    };
    Analyzer.prototype.getProbabilityMap = function (minesNumber) {
        if (!this._valid)
            return null;
        this._probabilityMap = this._probabilityMap || this._calculateProbabilityMap();
        var restArea = this._getRestAreaOnWholeArea();
        if (this._wholeAreaHint && restArea) {
            if (minesNumber < this._wholeAreaHint.min || this._wholeAreaHint.max < minesNumber)
                return null;
            var result = {};
            for (var _i = 0, _a = this._coveredArea; _i < _a.length; _i++) {
                var position = _a[_i];
                result[position] = 0;
            }
            var totalPatterns = 0;
            for (var _b = 0, _c = this._probabilityMap; _b < _c.length; _b++) {
                var part = _c[_b];
                var partPatterns = part.patternsNumber * binomial(restArea.length, minesNumber - part.minesNumber);
                if (partPatterns === 0)
                    continue;
                var partMap = __assign({}, part.map);
                var restProb = (minesNumber - part.minesNumber) / restArea.length;
                for (var _d = 0, restArea_1 = restArea; _d < restArea_1.length; _d++) {
                    var position = restArea_1[_d];
                    partMap[position] = restProb;
                }
                totalPatterns += partPatterns;
                var k = partPatterns / totalPatterns;
                for (var _e = 0, _f = this._coveredArea; _e < _f.length; _e++) {
                    var position = _f[_e];
                    result[position] = result[position] * (1 - k) + partMap[position] * k;
                }
            }
            if (totalPatterns === 0)
                return null;
            return result;
        }
        else {
            for (var _g = 0, _h = this._probabilityMap; _g < _h.length; _g++) {
                var part = _h[_g];
                if (part.minesNumber === minesNumber)
                    return __assign({}, part.map);
            }
            return null;
        }
    };
    Analyzer.prototype.getPatternsNumber = function (minesNumber) {
        if (!this._valid)
            return 0;
        this._probabilityMap = this._probabilityMap || this._calculateProbabilityMap();
        var restArea = this._getRestAreaOnWholeArea();
        if (this._wholeAreaHint && restArea) {
            if (minesNumber < this._wholeAreaHint.min || this._wholeAreaHint.max < minesNumber)
                return 0;
            var result = 0;
            for (var _i = 0, _a = this._probabilityMap; _i < _a.length; _i++) {
                var part = _a[_i];
                result += part.patternsNumber * binomial(restArea.length, minesNumber - part.minesNumber);
            }
            return result;
        }
        else {
            for (var _b = 0, _c = this._probabilityMap; _b < _c.length; _b++) {
                var part = _c[_b];
                if (part.minesNumber === minesNumber)
                    return part.patternsNumber;
            }
            return 0;
        }
    };
    Analyzer.prototype._getRestAreaOnWholeArea = function () {
        if (!this._wholeAreaHint)
            return null;
        var result = this._wholeAreaHint.area;
        for (var _i = 0, _a = this._hints; _i < _a.length; _i++) {
            var hint = _a[_i];
            result = hint_1.default.areaDifference(result, hint.area);
            if (!result)
                return result;
        }
        return result;
    };
    return Analyzer;
}());
module.exports = Analyzer;
