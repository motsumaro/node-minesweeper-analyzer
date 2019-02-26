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
    }
    Analyzer.prototype.isValid = function () { return this._valid; };
    Analyzer.prototype.clone = function () {
        var analyzer = new Analyzer();
        analyzer._hints = this._hints.map(function (hint) { return hint.clone(); });
        analyzer._valid = this._valid;
        analyzer._probabilityMap = this._probabilityMap;
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
    Analyzer.prototype._addHint = function (hint) {
        if (!this._valid)
            return false;
        if (!hint.isValid()) {
            this._hints.push(hint);
            return this._valid = false;
        }
        if (hint.breadth === 0)
            return true;
        // 空地確定、地雷確定の領域の情報は1マスごとに分割
        if (hint.breadth > 1 && hint.min === 0 && hint.max === 0) {
            for (var _i = 0, _a = hint.area; _i < _a.length; _i++) {
                var position = _a[_i];
                if (!this._addHint(new hint_1.default([position], 0)))
                    return false;
            }
            return true;
        }
        else if (hint.breadth > 1 && hint.min === hint.breadth && hint.max === hint.breadth) {
            for (var _b = 0, _c = hint.area; _b < _c.length; _b++) {
                var position = _c[_b];
                if (!this._addHint(new hint_1.default([position], 1)))
                    return false;
            }
            return true;
        }
        this._probabilityMap = null; // キャッシュを削除
        // 既存のhintと合成する
        var addHintsList = []; // 追加予約リスト
        var notPushNewHint = false;
        for (var _d = 0, _e = this._hints; _d < _e.length; _d++) {
            var existedHint = _e[_d];
            if (hint.equals(existedHint))
                return true;
        }
        for (var i = 0; i < this._hints.length; i++) {
            var existedHint = this._hints[i];
            var resolveResult = hint_1.default.solve(hint, existedHint);
            if (!resolveResult)
                continue;
            addHintsList.push.apply(addHintsList, resolveResult.newHints);
            if (resolveResult.hint2removable)
                this._hints.splice(i--, 1);
            if (resolveResult.hint1removable) {
                // newHintが不要と判断されたらこのループは中止
                notPushNewHint = true;
                break;
            }
        }
        if (!notPushNewHint)
            this._hints.push(hint);
        for (var _f = 0, addHintsList_1 = addHintsList; _f < addHintsList_1.length; _f++) {
            var addHint = addHintsList_1[_f];
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
        // 仮分割
        loop_hint: for (var _i = 0, _b = this._hints; _i < _b.length; _i++) {
            var hint = _b[_i];
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
        return dividedHints;
    };
    // 地雷数別確率Mapを求める
    Analyzer.prototype._calculateProbabilityMap = function () {
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
            // 単一ヒントの場合はAnalyzerを用いずに直接ProbabilityMapを生成する
            if (hints.length === 1) {
                var hint = hints[0];
                for (var minesNumber = hint.min; minesNumber <= hint.max; minesNumber++) {
                    var map = {};
                    for (var _i = 0, _b = hint.area; _i < _b.length; _i++) {
                        var position = _b[_i];
                        map[position] = minesNumber / hint.breadth;
                    }
                    attachProbabilityMapPart(areaProbabilityMap, { minesNumber: minesNumber, patternsNumber: binomial(hint.breadth, minesNumber), map: map });
                }
                continue;
            }
            // 場合分け
            var patterns = []; // ここに各パターンに対応するhintを格納する
            // hintが占有する領域の広さ
            var singleHintAreaBreadth = [];
            for (var i_1 = 0, l_1 = hints.length; i_1 < l_1; i_1++)
                singleHintAreaBreadth[i_1] = 0;
            // このマスについての情報を含むhintが1つだけの場合, そのhintのインデックス
            var singleHintPositionMap = {};
            // このマスについての情報を含むhintの数
            var positionHintsNumbersMap = {};
            for (var i_2 = 0, l_2 = hints.length; i_2 < l_2; i_2++) {
                for (var _c = 0, _d = hints[i_2].area; _c < _d.length; _c++) {
                    var position = _d[_c];
                    if (positionHintsNumbersMap[position] === undefined) {
                        // このpositionに来た初回
                        singleHintAreaBreadth[i_2]++;
                        singleHintPositionMap[position] = i_2;
                        positionHintsNumbersMap[position] = 1;
                    }
                    else if (positionHintsNumbersMap[position] === 1) {
                        // 2回目
                        singleHintAreaBreadth[singleHintPositionMap[position]]--;
                        delete singleHintPositionMap[position];
                        positionHintsNumbersMap[position]++;
                    }
                    else {
                        // 3回目以降
                        positionHintsNumbersMap[position]++;
                    }
                }
            }
            // 占有領域が最も広いhintを求める
            var keyHintIndex = null;
            var maxSingleHintAreaBreadth = 0;
            for (var i_3 = 0, l_3 = hints.length; i_3 < l_3; i_3++) {
                if (singleHintAreaBreadth[i_3] > maxSingleHintAreaBreadth) {
                    keyHintIndex = i_3;
                    maxSingleHintAreaBreadth = singleHintAreaBreadth[i_3];
                }
            }
            if (keyHintIndex !== null) {
                var keyHint = hints[keyHintIndex]; // 占有領域が最も広いhint
                var keyArea = [];
                for (var position in singleHintPositionMap) {
                    if (singleHintPositionMap[position] === keyHintIndex)
                        keyArea.push(Number(position));
                }
                // 占有領域内の地雷数で場合分け
                var minesMin = keyHint.partMin(maxSingleHintAreaBreadth);
                var minesMax = keyHint.partMax(maxSingleHintAreaBreadth);
                for (var i_4 = minesMin; i_4 <= minesMax; i_4++) {
                    patterns.push(new hint_1.default(keyArea, i_4));
                }
            }
            else {
                // いずれのhintも占有領域を持たない場合、最も多くのhintに含まれる1マスの地雷の有無で場合分け
                var keyPosition = 0, maxHintsNumber = -Infinity;
                for (var position in positionHintsNumbersMap) {
                    var hintsNumber = positionHintsNumbersMap[position];
                    if (hintsNumber > maxHintsNumber) {
                        keyPosition = Number(position);
                        maxHintsNumber = hintsNumber;
                    }
                }
                patterns.push(new hint_1.default([keyPosition], 0), new hint_1.default([keyPosition], 1));
            }
            // 全ての場合についてProbabilityMapを算出し統合
            for (var _e = 0, patterns_1 = patterns; _e < patterns_1.length; _e++) {
                var pattern = patterns_1[_e];
                var analyzer = new Analyzer();
                (_a = analyzer._hints).push.apply(_a, hints);
                if (pattern instanceof hint_1.default) {
                    analyzer._addHint(pattern);
                }
                else {
                    for (var _f = 0, pattern_1 = pattern; _f < pattern_1.length; _f++) {
                        var hint = pattern_1[_f];
                        analyzer._addHint(hint);
                    }
                }
                for (var _g = 0, _h = analyzer._calculateProbabilityMap(); _g < _h.length; _g++) {
                    var part = _h[_g];
                    attachProbabilityMapPart(areaProbabilityMap, part);
                }
            }
        }
        // 各エリアの地雷数の組み合わせを列挙
        var result = [];
        for (var _j = 0, _k = cartesianProduct.apply(void 0, areaProbabilityMaps); _j < _k.length; _j++) {
            var selection = _k[_j];
            var minesNumber = dividedHints[1].length;
            var patternsNumber = 1;
            var map = {};
            for (var _l = 0, _m = dividedHints[0]; _l < _m.length; _l++) {
                var hint = _m[_l];
                map[hint.area[0]] = 0;
            } // 空地確定マス
            for (var _o = 0, _p = dividedHints[1]; _o < _p.length; _o++) {
                var hint = _p[_o];
                map[hint.area[0]] = 1;
            } // 地雷確定マス
            for (var _q = 0, selection_1 = selection; _q < selection_1.length; _q++) {
                var part = selection_1[_q];
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
        for (var _i = 0, _a = this._probabilityMap; _i < _a.length; _i++) {
            var part = _a[_i];
            if (part.minesNumber === minesNumber)
                return __assign({}, part.map);
        }
        return null;
    };
    Analyzer.prototype.getPatternsNumber = function (minesNumber) {
        if (!this._valid)
            return 0;
        this._probabilityMap = this._probabilityMap || this._calculateProbabilityMap();
        for (var _i = 0, _a = this._probabilityMap; _i < _a.length; _i++) {
            var part = _a[_i];
            if (part.minesNumber === minesNumber)
                return part.patternsNumber;
        }
        return 0;
    };
    return Analyzer;
}());
module.exports = Analyzer;
